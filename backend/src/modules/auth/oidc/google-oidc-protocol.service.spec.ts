import { createHash } from 'node:crypto';
import type { GoogleOidcClientPort } from './google-oidc.client';
import { GoogleOidcProtocolService } from './google-oidc-protocol.service';
import type {
  GoogleIdentityClaims,
  GoogleOidcConfiguration,
} from './google-oidc.types';
import { GOOGLE_OIDC_ISSUER } from './google-oidc.types';
import { GoogleWorkspaceIdentityValidator } from './google-workspace-identity.validator';
import type { OidcRandomSourcePort } from './oidc-random.source';
import type { OidcRedisCommands } from './oidc-redis.client';
import { OidcTransactionStore } from './oidc-transaction.store';

class FakeRedis implements OidcRedisCommands {
  readonly values = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  setOneUse(key: string, value: string): Promise<boolean> {
    if (this.values.has(key)) {
      return Promise.resolve(false);
    }
    this.values.set(key, value);
    return Promise.resolve(true);
  }

  take(key: string): Promise<string | null> {
    const value = this.values.get(key) ?? null;
    this.values.delete(key);
    return Promise.resolve(value);
  }
}

const baseConfiguration: Extract<GoogleOidcConfiguration, { enabled: true }> = {
  allowedDomain: 'cloudfabrix.com',
  clientId: 'google-client-id',
  clientSecret: 'client-secret',
  clockToleranceSeconds: 30,
  enabled: true,
  frontendCallbackUri: 'https://pm.example/auth/google/callback',
  production: true,
  redirectUri: 'https://api.pm.example/auth/google/oidc/callback',
  redisHost: 'redis',
  redisPort: 6379,
  transactionTtlSeconds: 300,
};

function validClaims(
  overrides: Partial<GoogleIdentityClaims> = {},
): GoogleIdentityClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: baseConfiguration.clientId,
    email: 'person@cloudfabrix.com',
    email_verified: true,
    exp: now + 300,
    hd: 'cloudfabrix.com',
    iat: now,
    iss: GOOGLE_OIDC_ISSUER,
    sub: 'google-subject',
    ...overrides,
  };
}

describe('Google OIDC protocol service', () => {
  let buildAuthorizationUrl: jest.Mock;
  let client: GoogleOidcClientPort;
  let configuration: Extract<GoogleOidcConfiguration, { enabled: true }>;
  let redis: FakeRedis;
  let service: GoogleOidcProtocolService;
  let exchangeAuthorizationCode: jest.Mock;

  beforeEach(() => {
    configuration = { ...baseConfiguration };
    redis = new FakeRedis();
    buildAuthorizationUrl = jest
      .fn()
      .mockResolvedValue(
        new URL('https://accounts.google.com/o/oauth2/v2/auth?request=safe'),
      );
    exchangeAuthorizationCode = jest.fn().mockResolvedValue(validClaims());
    client = { buildAuthorizationUrl, exchangeAuthorizationCode };
    const random: OidcRandomSourcePort = {
      browserCorrelation: () => 'browser-correlation',
      codeVerifier: () => 'pkce-verifier',
      nonce: () => 'oidc-nonce',
      state: () => 'oidc-state',
      transactionId: () => 'transaction-id',
    };
    const transactions = new OidcTransactionStore(redis, configuration);
    service = new GoogleOidcProtocolService(
      configuration,
      client,
      transactions,
      random,
      new GoogleWorkspaceIdentityValidator(configuration),
    );
  });

  async function initiate() {
    return service.createAuthorizationRequest();
  }

  async function complete(
    query: Record<string, string | undefined> = {
      code: 'authorization-code',
      state: 'oidc-state',
    },
    cookie = 'transaction-id.browser-correlation',
  ) {
    return service.completeAuthorization(query, cookie);
  }

  it('stores only a correlation hash with nonce, state, PKCE, and expiry', async () => {
    const request = await initiate();
    const serialized = [...redis.values.values()][0];
    const stored = JSON.parse(serialized) as Record<string, unknown>;

    expect(buildAuthorizationUrl).toHaveBeenCalledWith({
      codeVerifier: 'pkce-verifier',
      nonce: 'oidc-nonce',
      state: 'oidc-state',
    });
    expect(stored).toMatchObject({
      browserCorrelationHash: createHash('sha256')
        .update('browser-correlation')
        .digest('hex'),
      codeVerifier: 'pkce-verifier',
      nonce: 'oidc-nonce',
      state: 'oidc-state',
      transactionId: 'transaction-id',
    });
    expect(stored).not.toHaveProperty('browserCorrelation');
    expect(stored.expiresAt).toBe((stored.createdAt as number) + 300_000);
    expect(request.authorizationUrl).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?request=safe',
    );
  });

  it.each([
    [true, true],
    [false, false],
  ])(
    'sets HttpOnly, SameSite=Lax, path, lifetime, and production Secure=%s',
    async (production, expectedSecure) => {
      configuration.production = production;
      const request = await initiate();

      expect(request.correlationCookie).toEqual({
        name: 'pm_google_oidc_correlation',
        options: {
          httpOnly: true,
          maxAge: 300_000,
          path: '/auth/google/oidc/callback',
          sameSite: 'lax',
          secure: expectedSecure,
        },
        value: 'transaction-id.browser-correlation',
      });
    },
  );

  it('returns only validated Google identity evidence on success', async () => {
    await initiate();

    await expect(complete()).resolves.toEqual({
      emailVerified: true,
      hostedDomain: 'cloudfabrix.com',
      issuer: GOOGLE_OIDC_ISSUER,
      normalizedEmail: 'person@cloudfabrix.com',
      provider: 'GOOGLE',
      subject: 'google-subject',
    });
    expect(exchangeAuthorizationCode).toHaveBeenCalledWith({
      callbackUrl: new URL(
        `${configuration.redirectUri}?code=authorization-code&state=oidc-state`,
      ),
      codeVerifier: 'pkce-verifier',
      expectedNonce: 'oidc-nonce',
      expectedState: 'oidc-state',
    });
  });

  it('rejects missing browser correlation before token exchange', async () => {
    await initiate();
    await expect(
      service.completeAuthorization(
        { code: 'authorization-code', state: 'oidc-state' },
        undefined,
      ),
    ).rejects.toMatchObject({ category: 'invalid_request' });
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled();
  });

  it('rejects correlation mismatch and consumes the transaction', async () => {
    await initiate();
    await expect(
      complete(undefined, 'transaction-id.wrong-correlation'),
    ).rejects.toMatchObject({ category: 'invalid_request' });
    await expect(complete()).rejects.toMatchObject({
      category: 'transaction_expired',
    });
  });

  it('rejects state mismatch and consumes the transaction', async () => {
    await initiate();
    await expect(
      complete({ code: 'authorization-code', state: 'wrong-state' }),
    ).rejects.toMatchObject({ category: 'invalid_request' });
    await expect(complete()).rejects.toMatchObject({
      category: 'transaction_expired',
    });
  });

  it('maps authorization denial to a bounded error', async () => {
    await initiate();
    await expect(
      complete({ error: 'access_denied', state: 'oidc-state' }),
    ).rejects.toMatchObject({ category: 'access_denied', status: 403 });
  });

  it('rejects an invalid authorization response', async () => {
    await initiate();
    await expect(complete({ state: 'oidc-state' })).rejects.toMatchObject({
      category: 'invalid_request',
    });
  });

  it.each([
    'invalid authorization code',
    'token exchange failure containing secret diagnostics',
    'malformed ID token',
  ])('maps %s to a bounded authentication error', async (diagnostic) => {
    await initiate();
    exchangeAuthorizationCode.mockRejectedValue(new Error(diagnostic));

    await expect(complete()).rejects.toMatchObject({
      category: 'authentication_failed',
      response: { error: 'authentication_failed' },
      status: 401,
    });
  });

  it('rejects replayed callback transactions', async () => {
    await initiate();
    await expect(complete()).resolves.toBeDefined();
    await expect(complete()).rejects.toMatchObject({
      category: 'transaction_expired',
    });
  });

  it('rejects an expired callback transaction', async () => {
    await initiate();
    const key = [...redis.values.keys()][0];
    const stored = JSON.parse(redis.values.get(key) ?? '{}') as Record<
      string,
      unknown
    >;
    const now = Date.now();
    redis.values.set(
      key,
      JSON.stringify({
        ...stored,
        createdAt: now - 2_000,
        expiresAt: now - 1_000,
      }),
    );

    await expect(complete()).rejects.toMatchObject({
      category: 'transaction_expired',
    });
  });

  it('preserves bounded ineligible-account errors from claim validation', async () => {
    await initiate();
    exchangeAuthorizationCode.mockResolvedValue(
      validClaims({ hd: 'evil.example' }),
    );

    await expect(complete()).rejects.toMatchObject({
      category: 'ineligible_account',
      response: { error: 'ineligible_account' },
      status: 403,
    });
  });

  it('is unreachable while the feature is disabled', async () => {
    const disabled = new GoogleOidcProtocolService(
      { enabled: false },
      client,
      new OidcTransactionStore(redis, { enabled: false }),
      {
        browserCorrelation: () => 'unused',
        codeVerifier: () => 'unused',
        nonce: () => 'unused',
        state: () => 'unused',
        transactionId: () => 'unused',
      },
      new GoogleWorkspaceIdentityValidator({ enabled: false }),
    );

    await expect(disabled.createAuthorizationRequest()).rejects.toMatchObject({
      status: 404,
    });
  });
});
