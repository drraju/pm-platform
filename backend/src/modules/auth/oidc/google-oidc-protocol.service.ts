import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GOOGLE_OIDC_CLIENT } from './google-oidc.client';
import type { GoogleOidcClientPort } from './google-oidc.client';
import { GOOGLE_OIDC_CONFIGURATION } from './google-oidc.configuration';
import {
  GOOGLE_OIDC_CALLBACK_PATH,
  GOOGLE_OIDC_CORRELATION_COOKIE,
} from './google-oidc.types';
import type {
  GoogleOidcConfiguration,
  OidcAuthorizationRequest,
  ValidatedGoogleIdentity,
} from './google-oidc.types';
import { OIDC_RANDOM_SOURCE } from './oidc-random.source';
import type { OidcRandomSourcePort } from './oidc-random.source';
import { OIDC_TRANSACTION_STORE } from './oidc-transaction.store';
import type { OidcTransactionStorePort } from './oidc-transaction.store';
import { OidcProtocolException } from './oidc-protocol.exception';
import { GoogleWorkspaceIdentityValidator } from './google-workspace-identity.validator';

export type OidcCallbackQuery = Record<string, string | string[] | undefined>;

@Injectable()
export class GoogleOidcProtocolService {
  constructor(
    @Inject(GOOGLE_OIDC_CONFIGURATION)
    private readonly configuration: GoogleOidcConfiguration,
    @Inject(GOOGLE_OIDC_CLIENT)
    private readonly client: GoogleOidcClientPort,
    @Inject(OIDC_TRANSACTION_STORE)
    private readonly transactions: OidcTransactionStorePort,
    @Inject(OIDC_RANDOM_SOURCE)
    private readonly random: OidcRandomSourcePort,
    private readonly identityValidator: GoogleWorkspaceIdentityValidator,
  ) {}

  async createAuthorizationRequest(): Promise<OidcAuthorizationRequest> {
    const configuration = this.enabledConfiguration();
    const transactionId = this.random.transactionId();
    const browserCorrelation = this.random.browserCorrelation();
    const state = this.random.state();
    const nonce = this.random.nonce();
    const codeVerifier = this.random.codeVerifier();
    const authorizationUrl = await this.client.buildAuthorizationUrl({
      codeVerifier,
      nonce,
      state,
    });
    const createdAt = Date.now();

    await this.transactions.create({
      browserCorrelationHash: this.hash(browserCorrelation),
      codeVerifier,
      createdAt,
      expiresAt: createdAt + configuration.transactionTtlSeconds * 1000,
      nonce,
      state,
      transactionId,
    });

    return {
      authorizationUrl: authorizationUrl.href,
      correlationCookie: {
        name: GOOGLE_OIDC_CORRELATION_COOKIE,
        options: {
          httpOnly: true,
          maxAge: configuration.transactionTtlSeconds * 1000,
          path: GOOGLE_OIDC_CALLBACK_PATH,
          sameSite: 'lax',
          secure: configuration.production,
        },
        value: `${transactionId}.${browserCorrelation}`,
      },
    };
  }

  async completeAuthorization(
    query: OidcCallbackQuery,
    correlationCookie: string | undefined,
  ): Promise<ValidatedGoogleIdentity> {
    const configuration = this.enabledConfiguration();
    const correlation = this.parseCorrelationCookie(correlationCookie);
    const transaction = await this.transactions.consume(
      correlation.transactionId,
    );

    if (
      !this.securelyMatches(
        this.hash(correlation.browserCorrelation),
        transaction.browserCorrelationHash,
      ) ||
      typeof query.state !== 'string' ||
      !this.securelyMatches(query.state, transaction.state)
    ) {
      throw new OidcProtocolException('invalid_request');
    }

    if (query.error !== undefined) {
      throw new OidcProtocolException(
        query.error === 'access_denied'
          ? 'access_denied'
          : 'authentication_failed',
      );
    }
    if (typeof query.code !== 'string' || !query.code) {
      throw new OidcProtocolException('invalid_request');
    }

    try {
      const claims = await this.client.exchangeAuthorizationCode({
        callbackUrl: this.createCallbackUrl(configuration.redirectUri, query),
        codeVerifier: transaction.codeVerifier,
        expectedNonce: transaction.nonce,
        expectedState: transaction.state,
      });
      return this.identityValidator.validate(claims);
    } catch (error) {
      if (error instanceof OidcProtocolException) {
        throw error;
      }
      throw new OidcProtocolException('authentication_failed');
    }
  }

  correlationCookieName(): typeof GOOGLE_OIDC_CORRELATION_COOKIE {
    return GOOGLE_OIDC_CORRELATION_COOKIE;
  }

  correlationCookieClearOptions() {
    const configuration = this.enabledConfiguration();
    return {
      httpOnly: true,
      path: GOOGLE_OIDC_CALLBACK_PATH,
      sameSite: 'lax' as const,
      secure: configuration.production,
    };
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

  private parseCorrelationCookie(value: string | undefined): {
    browserCorrelation: string;
    transactionId: string;
  } {
    if (!value) {
      throw new OidcProtocolException('invalid_request');
    }
    const parts = value.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new OidcProtocolException('invalid_request');
    }
    return { browserCorrelation: parts[1], transactionId: parts[0] };
  }

  private createCallbackUrl(
    redirectUri: string,
    query: OidcCallbackQuery,
  ): URL {
    const callbackUrl = new URL(redirectUri);
    for (const [name, value] of Object.entries(query)) {
      if (typeof value !== 'string') {
        throw new OidcProtocolException('invalid_request');
      }
      callbackUrl.searchParams.set(name, value);
    }
    return callbackUrl;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private securelyMatches(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
