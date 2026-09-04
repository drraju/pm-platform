import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { GOOGLE_OIDC_CONFIGURATION } from './google-oidc.configuration';
import type {
  GoogleOidcConfiguration,
  OidcTransaction,
} from './google-oidc.types';
import { OIDC_REDIS_COMMANDS } from './oidc-redis.client';
import type { OidcRedisCommands } from './oidc-redis.client';
import { OidcProtocolException } from './oidc-protocol.exception';

export const OIDC_TRANSACTION_STORE = Symbol('OIDC_TRANSACTION_STORE');

export interface OidcTransactionStorePort {
  consume(transactionId: string): Promise<OidcTransaction>;
  create(transaction: OidcTransaction): Promise<void>;
  retrieve(transactionId: string): Promise<OidcTransaction | null>;
}

@Injectable()
export class OidcTransactionStore implements OidcTransactionStorePort {
  constructor(
    @Inject(OIDC_REDIS_COMMANDS)
    private readonly redis: OidcRedisCommands,
    @Inject(GOOGLE_OIDC_CONFIGURATION)
    private readonly configuration: GoogleOidcConfiguration,
  ) {}

  async create(transaction: OidcTransaction): Promise<void> {
    if (!this.configuration.enabled) {
      throw new OidcProtocolException('invalid_request');
    }
    const created = await this.redis.setOneUse(
      this.key(transaction.transactionId),
      JSON.stringify(transaction),
      this.configuration.transactionTtlSeconds,
    );
    if (!created) {
      throw new OidcProtocolException('authentication_failed');
    }
  }

  async retrieve(transactionId: string): Promise<OidcTransaction | null> {
    const serialized = await this.redis.get(this.key(transactionId));
    return serialized ? this.parse(serialized, transactionId) : null;
  }

  async consume(transactionId: string): Promise<OidcTransaction> {
    const serialized = await this.redis.take(this.key(transactionId));
    if (!serialized) {
      throw new OidcProtocolException('transaction_expired');
    }
    const transaction = this.parse(serialized, transactionId);
    if (transaction.expiresAt <= Date.now()) {
      throw new OidcProtocolException('transaction_expired');
    }
    return transaction;
  }

  private key(transactionId: string): string {
    const reference = createHash('sha256').update(transactionId).digest('hex');
    return `pm:oidc:google:transaction:${reference}`;
  }

  private parse(
    serialized: string,
    expectedTransactionId: string,
  ): OidcTransaction {
    try {
      const value: unknown = JSON.parse(serialized);
      if (
        typeof value !== 'object' ||
        value === null ||
        !('transactionId' in value) ||
        !('state' in value) ||
        !('nonce' in value) ||
        !('codeVerifier' in value) ||
        !('browserCorrelationHash' in value) ||
        !('createdAt' in value) ||
        !('expiresAt' in value) ||
        typeof value.transactionId !== 'string' ||
        typeof value.state !== 'string' ||
        typeof value.nonce !== 'string' ||
        typeof value.codeVerifier !== 'string' ||
        typeof value.browserCorrelationHash !== 'string' ||
        typeof value.createdAt !== 'number' ||
        typeof value.expiresAt !== 'number' ||
        value.transactionId !== expectedTransactionId ||
        !value.state ||
        !value.nonce ||
        !value.codeVerifier ||
        !/^[a-f0-9]{64}$/.test(value.browserCorrelationHash) ||
        !Number.isFinite(value.createdAt) ||
        !Number.isFinite(value.expiresAt) ||
        value.expiresAt <= value.createdAt
      ) {
        throw new Error('Invalid transaction');
      }
      return value as OidcTransaction;
    } catch {
      throw new OidcProtocolException('authentication_failed');
    }
  }
}
