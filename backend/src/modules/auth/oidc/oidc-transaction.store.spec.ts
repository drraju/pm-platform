import type {
  GoogleOidcConfiguration,
  OidcTransaction,
} from './google-oidc.types';
import type { OidcRedisCommands } from './oidc-redis.client';
import { OidcProtocolException } from './oidc-protocol.exception';
import { OidcTransactionStore } from './oidc-transaction.store';

class AtomicFakeRedis implements OidcRedisCommands {
  readonly values = new Map<string, string>();
  lastTtlSeconds: number | undefined;

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  setOneUse(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.values.has(key)) {
      return Promise.resolve(false);
    }
    this.lastTtlSeconds = ttlSeconds;
    this.values.set(key, value);
    return Promise.resolve(true);
  }

  take(key: string): Promise<string | null> {
    const value = this.values.get(key) ?? null;
    this.values.delete(key);
    return Promise.resolve(value);
  }
}

const configuration: GoogleOidcConfiguration = {
  allowedDomain: 'cloudfabrix.com',
  clientId: 'google-client-id',
  clientSecret: 'secret',
  clockToleranceSeconds: 30,
  enabled: true,
  frontendCallbackUri: 'https://pm.example/callback',
  production: true,
  redirectUri: 'https://api.pm.example/auth/google/oidc/callback',
  redisHost: 'redis',
  redisPort: 6379,
  transactionTtlSeconds: 300,
};

function transaction(
  overrides: Partial<OidcTransaction> = {},
): OidcTransaction {
  const now = Date.now();
  return {
    browserCorrelationHash: 'a'.repeat(64),
    codeVerifier: 'pkce-verifier',
    createdAt: now,
    expiresAt: now + 300_000,
    nonce: 'nonce',
    state: 'state',
    transactionId: 'opaque-transaction-id',
    ...overrides,
  };
}

describe('OIDC Redis transaction store', () => {
  let redis: AtomicFakeRedis;
  let store: OidcTransactionStore;

  beforeEach(() => {
    redis = new AtomicFakeRedis();
    store = new OidcTransactionStore(redis, configuration);
  });

  it('creates and retrieves a transaction under a hashed key with a TTL', async () => {
    const value = transaction();
    await store.create(value);

    expect(await store.retrieve(value.transactionId)).toEqual(value);
    expect(redis.lastTtlSeconds).toBe(300);
    const key = [...redis.values.keys()][0];
    expect(key).toMatch(/^pm:oidc:google:transaction:[a-f0-9]{64}$/);
    expect(key).not.toContain(value.transactionId);
  });

  it('atomically consumes a transaction once and rejects replay', async () => {
    const value = transaction();
    await store.create(value);

    await expect(store.consume(value.transactionId)).resolves.toEqual(value);
    await expect(store.consume(value.transactionId)).rejects.toMatchObject({
      category: 'transaction_expired',
    });
  });

  it('rejects an expired transaction after atomically removing it', async () => {
    const now = Date.now();
    const value = transaction({
      createdAt: now - 2_000,
      expiresAt: now - 1_000,
    });
    await store.create(value);

    await expect(store.consume(value.transactionId)).rejects.toMatchObject({
      category: 'transaction_expired',
    });
    await expect(store.retrieve(value.transactionId)).resolves.toBeNull();
  });

  it('permits only one concurrent consumer', async () => {
    const value = transaction();
    await store.create(value);

    const results = await Promise.allSettled([
      store.consume(value.transactionId),
      store.consume(value.transactionId),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejection = results.find((result) => result.status === 'rejected');
    expect((rejection as PromiseRejectedResult).reason).toBeInstanceOf(
      OidcProtocolException,
    );
  });

  it('rejects duplicate transaction creation', async () => {
    const value = transaction();
    await store.create(value);

    await expect(store.create(value)).rejects.toMatchObject({
      category: 'authentication_failed',
    });
  });

  it('rejects malformed stored data without returning it', async () => {
    await store.create(transaction());
    const key = [...redis.values.keys()][0];
    redis.values.set(key, '{"state":"leaked"}');

    await expect(store.consume('opaque-transaction-id')).rejects.toMatchObject({
      category: 'authentication_failed',
    });
  });
});
