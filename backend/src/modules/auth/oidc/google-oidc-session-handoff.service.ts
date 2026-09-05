import { createHash } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SessionDto } from '../dto/session.dto';
import { GOOGLE_OIDC_CONFIGURATION } from './google-oidc.configuration';
import type {
  GoogleOidcConfiguration,
  OidcErrorCategory,
} from './google-oidc.types';
import { OidcProtocolException } from './oidc-protocol.exception';
import { OidcRandomSource } from './oidc-random.source';
import { OIDC_REDIS_COMMANDS } from './oidc-redis.client';
import type { OidcRedisCommands } from './oidc-redis.client';

const handoffCreationAttempts = 3;
const handoffReferencePattern = /^[A-Za-z0-9_-]{43}$/;
const handoffTtlSeconds = 60;

type FrontendOidcErrorCategory = Exclude<
  OidcErrorCategory,
  'ineligible_account'
>;

@Injectable()
export class GoogleOidcSessionHandoffService {
  constructor(
    @Inject(OIDC_REDIS_COMMANDS)
    private readonly redis: OidcRedisCommands,
    @Inject(GOOGLE_OIDC_CONFIGURATION)
    private readonly configuration: GoogleOidcConfiguration,
    private readonly random: OidcRandomSource,
  ) {}

  async create(session: SessionDto): Promise<string> {
    this.enabledConfiguration();
    const serialized = this.serializeSession(session);

    for (let attempt = 0; attempt < handoffCreationAttempts; attempt += 1) {
      const reference = this.random.handoffReference();
      try {
        if (
          await this.redis.setOneUse(
            this.key(reference),
            serialized,
            handoffTtlSeconds,
          )
        ) {
          return reference;
        }
      } catch {
        throw new OidcProtocolException('authentication_failed');
      }
    }

    throw new OidcProtocolException('authentication_failed');
  }

  async consume(reference: unknown): Promise<SessionDto> {
    this.enabledConfiguration();
    if (
      typeof reference !== 'string' ||
      !handoffReferencePattern.test(reference)
    ) {
      throw new OidcProtocolException('invalid_request');
    }

    let serialized: string | null;
    try {
      serialized = await this.redis.take(this.key(reference));
    } catch {
      throw new OidcProtocolException('authentication_failed');
    }
    if (!serialized) {
      throw new OidcProtocolException('transaction_expired');
    }

    return this.parseSession(serialized);
  }

  frontendSuccessRedirect(reference: string): string {
    return this.frontendRedirect('handoff', reference);
  }

  frontendErrorRedirect(error: unknown): string {
    return this.frontendRedirect('error', this.frontendErrorCategory(error));
  }

  private enabledConfiguration(): Extract<
    GoogleOidcConfiguration,
    { enabled: true }
  > {
    if (!this.configuration.enabled) {
      throw new NotFoundException();
    }
    return this.configuration;
  }

  private frontendErrorCategory(error: unknown): FrontendOidcErrorCategory {
    if (error instanceof OidcProtocolException) {
      switch (error.category) {
        case 'access_denied':
        case 'invalid_request':
        case 'transaction_expired':
          return error.category;
        case 'authentication_failed':
        case 'ineligible_account':
          return 'authentication_failed';
      }
    }
    return 'authentication_failed';
  }

  private frontendRedirect(name: 'error' | 'handoff', value: string): string {
    const url = new URL(this.enabledConfiguration().frontendCallbackUri);
    url.search = '';
    url.searchParams.set(name, value);
    return url.href;
  }

  private key(reference: string): string {
    const digest = createHash('sha256').update(reference).digest('hex');
    return `pm:oidc:google:session-handoff:${digest}`;
  }

  private parseSession(serialized: string): SessionDto {
    try {
      const value: unknown = JSON.parse(serialized);
      if (
        typeof value !== 'object' ||
        value === null ||
        !('accessToken' in value) ||
        !('refreshToken' in value) ||
        typeof value.accessToken !== 'string' ||
        !value.accessToken ||
        typeof value.refreshToken !== 'string' ||
        !value.refreshToken ||
        ('requiresPasswordChange' in value &&
          typeof value.requiresPasswordChange !== 'boolean')
      ) {
        throw new Error('Invalid session handoff');
      }

      return {
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        ...('requiresPasswordChange' in value &&
        value.requiresPasswordChange === true
          ? { requiresPasswordChange: true }
          : {}),
      };
    } catch {
      throw new OidcProtocolException('authentication_failed');
    }
  }

  private serializeSession(session: SessionDto): string {
    return JSON.stringify(this.parseSession(JSON.stringify(session)));
  }
}
