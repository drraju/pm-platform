import { getGoogleOidcConfiguration } from './google-oidc.configuration';

const validEnvironment: NodeJS.ProcessEnv = {
  GOOGLE_OIDC_ALLOWED_DOMAIN: 'cloudfabrix.com',
  GOOGLE_OIDC_CLIENT_ID: 'google-client-id',
  GOOGLE_OIDC_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_OIDC_ENABLED: 'true',
  GOOGLE_OIDC_FRONTEND_CALLBACK_URI:
    'http://localhost:3000/auth/google/callback',
  GOOGLE_OIDC_REDIRECT_URI: 'http://localhost:3001/auth/google/oidc/callback',
  REDIS_HOST: 'localhost',
};

describe('Google OIDC configuration', () => {
  it('is disabled and does not require Google credentials by default', () => {
    expect(getGoogleOidcConfiguration({})).toEqual({ enabled: false });
  });

  it('accepts a complete enabled configuration and safe defaults', () => {
    expect(getGoogleOidcConfiguration(validEnvironment)).toEqual({
      allowedDomain: 'cloudfabrix.com',
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      clockToleranceSeconds: 30,
      enabled: true,
      frontendCallbackUri: 'http://localhost:3000/auth/google/callback',
      production: false,
      redirectUri: 'http://localhost:3001/auth/google/oidc/callback',
      redisHost: 'localhost',
      redisPort: 6379,
      transactionTtlSeconds: 300,
    });
  });

  it.each([
    'GOOGLE_OIDC_CLIENT_ID',
    'GOOGLE_OIDC_CLIENT_SECRET',
    'GOOGLE_OIDC_REDIRECT_URI',
    'GOOGLE_OIDC_FRONTEND_CALLBACK_URI',
    'REDIS_HOST',
  ])('rejects enabled configuration missing %s', (name) => {
    const environment = { ...validEnvironment };
    delete environment[name];

    expect(() => getGoogleOidcConfiguration(environment)).toThrow(name);
  });

  it.each([
    'cloudfabrix..com',
    'sub_domain.cloudfabrix.com',
    '-cloudfabrix.com',
    'localhost',
  ])('rejects invalid allowed domain %s', (allowedDomain) => {
    expect(() =>
      getGoogleOidcConfiguration({
        ...validEnvironment,
        GOOGLE_OIDC_ALLOWED_DOMAIN: allowedDomain,
      }),
    ).toThrow('GOOGLE_OIDC_ALLOWED_DOMAIN');
  });

  it.each(['59', '901', '1.5', 'not-a-number'])(
    'rejects invalid transaction TTL %s',
    (ttl) => {
      expect(() =>
        getGoogleOidcConfiguration({
          ...validEnvironment,
          GOOGLE_OIDC_TRANSACTION_TTL_SECONDS: ttl,
        }),
      ).toThrow('GOOGLE_OIDC_TRANSACTION_TTL_SECONDS');
    },
  );

  it('rejects non-HTTPS non-loopback callback URLs', () => {
    expect(() =>
      getGoogleOidcConfiguration({
        ...validEnvironment,
        GOOGLE_OIDC_REDIRECT_URI: 'http://pm.example/auth/google/callback',
      }),
    ).toThrow('must use HTTPS');
  });

  it('rejects ambiguous feature flag values', () => {
    expect(() =>
      getGoogleOidcConfiguration({ GOOGLE_OIDC_ENABLED: 'TRUE' }),
    ).toThrow('must be true or false');
  });
});
