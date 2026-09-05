import { createHash } from 'node:crypto';
import type { SessionDto } from '../dto/session.dto';
import type { GoogleOidcConfiguration } from './google-oidc.types';
import { GoogleOidcSessionHandoffService } from './google-oidc-session-handoff.service';
import { OidcProtocolException } from './oidc-protocol.exception';
import type { OidcRandomSource } from './oidc-random.source';
import type { OidcRedisCommands } from './oidc-redis.client';

class AtomicFakeRedis implements OidcRedisCommands {
  readonly values = new Map<string, string>();
  lastTtlSeconds: number | undefined;
  setFailure: Error | undefined;
  takeCalls = 0;
  takeFailure: Error | undefined;

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  setOneUse(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.setFailure) {
      return Promise.reject(this.setFailure);
    }
    if (this.values.has(key)) {
      return Promise.resolve(false);
    }
    this.lastTtlSeconds = ttlSeconds;
    this.values.set(key, value);
    return Promise.resolve(true);
  }

  take(key: string): Promise<string | null> {
    this.takeCalls += 1;
    if (this.takeFailure) {
      return Promise.reject(this.takeFailure);
    }
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
  frontendCallbackUri:
    'https://pm.example/auth/google/callback?untrusted=discarded',
  production: true,
  redirectUri: 'https://api.pm.example/auth/google/oidc/callback',
  redisHost: 'redis',
  redisPort: 6379,
  transactionTtlSeconds: 300,
};

const session: SessionDto = {
  accessToken: 'pm-access-token',
  refreshToken: 'pm-refresh-token',
  requiresPasswordChange: true,
};

describe('Google OIDC session handoff service', () => {
  let handoffReference: jest.Mock;
  let redis: AtomicFakeRedis;
  let service: GoogleOidcSessionHandoffService;

  beforeEach(() => {
    handoffReference = jest.fn().mockReturnValue('a'.repeat(43));
    redis = new AtomicFakeRedis();
    service = new GoogleOidcSessionHandoffService(redis, configuration, {
      handoffReference,
    } as unknown as OidcRandomSource);
  });

  it('stores only a sanitized PM session under a hashed key for 60 seconds', async () => {
    const reference = await service.create({
      ...session,
      unexpected: 'not-stored',
    } as SessionDto);

    expect(reference).toBe('a'.repeat(43));
    expect(redis.lastTtlSeconds).toBe(60);
    const expectedDigest = createHash('sha256').update(reference).digest('hex');
    const key = [...redis.values.keys()][0];
    expect(key).toBe(`pm:oidc:google:session-handoff:${expectedDigest}`);
    expect(key).not.toContain(reference);
    expect(JSON.parse(redis.values.get(key) ?? '')).toEqual(session);
  });

  it('omits false requiresPasswordChange from the stored session', async () => {
    await service.create({
      accessToken: 'pm-access-token',
      refreshToken: 'pm-refresh-token',
      requiresPasswordChange: false,
    });

    expect(JSON.parse([...redis.values.values()][0])).toEqual({
      accessToken: 'pm-access-token',
      refreshToken: 'pm-refresh-token',
    });
  });

  it('retries reference collisions with a fresh value', async () => {
    const firstReference = 'a'.repeat(43);
    const secondReference = 'b'.repeat(43);
    handoffReference
      .mockReturnValueOnce(firstReference)
      .mockReturnValueOnce(secondReference);
    redis.values.set(
      `pm:oidc:google:session-handoff:${createHash('sha256')
        .update(firstReference)
        .digest('hex')}`,
      JSON.stringify(session),
    );

    await expect(service.create(session)).resolves.toBe(secondReference);
    expect(handoffReference).toHaveBeenCalledTimes(2);
  });

  it('fails safely after three reference collisions', async () => {
    handoffReference
      .mockReturnValueOnce('a'.repeat(43))
      .mockReturnValueOnce('b'.repeat(43))
      .mockReturnValueOnce('c'.repeat(43));
    for (const reference of ['a'.repeat(43), 'b'.repeat(43), 'c'.repeat(43)]) {
      redis.values.set(
        `pm:oidc:google:session-handoff:${createHash('sha256')
          .update(reference)
          .digest('hex')}`,
        JSON.stringify(session),
      );
    }

    await expect(service.create(session)).rejects.toMatchObject({
      category: 'authentication_failed',
    });
  });

  it('maps Redis creation failures without exposing diagnostics', async () => {
    redis.setFailure = new Error('redis hostname and credential details');

    await expect(service.create(session)).rejects.toMatchObject({
      category: 'authentication_failed',
    });
  });

  it('atomically returns a handoff once and rejects concurrent replay', async () => {
    const reference = await service.create(session);

    const results = await Promise.allSettled([
      service.consume(reference),
      service.consume(reference),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      (
        results.find(
          (result) => result.status === 'rejected',
        ) as PromiseRejectedResult
      ).reason,
    ).toMatchObject({ category: 'transaction_expired' });
  });

  it('rejects malformed references before accessing Redis', async () => {
    await expect(service.consume('not-a-reference')).rejects.toMatchObject({
      category: 'invalid_request',
    });
    await expect(service.consume(undefined)).rejects.toMatchObject({
      category: 'invalid_request',
    });
    expect(redis.takeCalls).toBe(0);
  });

  it('maps missing, expired, and already-consumed references identically', async () => {
    await expect(service.consume('z'.repeat(43))).rejects.toMatchObject({
      category: 'transaction_expired',
    });
  });

  it('removes and safely rejects malformed stored session data', async () => {
    const reference = 'a'.repeat(43);
    const key = `pm:oidc:google:session-handoff:${createHash('sha256')
      .update(reference)
      .digest('hex')}`;
    redis.values.set(
      key,
      JSON.stringify({ accessToken: 'leaked-without-refresh' }),
    );

    await expect(service.consume(reference)).rejects.toMatchObject({
      category: 'authentication_failed',
    });
    expect(redis.values.has(key)).toBe(false);
  });

  it('maps Redis consumption failures without exposing diagnostics', async () => {
    redis.takeFailure = new Error('redis hostname and credential details');

    await expect(service.consume('a'.repeat(43))).rejects.toMatchObject({
      category: 'authentication_failed',
    });
  });

  it('builds fixed success and bounded error redirects', () => {
    expect(service.frontendSuccessRedirect('a'.repeat(43))).toBe(
      `https://pm.example/auth/google/callback?handoff=${'a'.repeat(43)}`,
    );
    expect(
      service.frontendErrorRedirect(new OidcProtocolException('access_denied')),
    ).toBe('https://pm.example/auth/google/callback?error=access_denied');
    expect(
      service.frontendErrorRedirect(
        new OidcProtocolException('ineligible_account'),
      ),
    ).toBe(
      'https://pm.example/auth/google/callback?error=authentication_failed',
    );
    expect(service.frontendErrorRedirect(new Error('provider details'))).toBe(
      'https://pm.example/auth/google/callback?error=authentication_failed',
    );
  });
});
