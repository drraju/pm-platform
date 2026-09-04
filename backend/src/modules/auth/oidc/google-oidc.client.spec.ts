import type {
  GoogleOidcConfiguration,
  GoogleIdentityClaims,
} from './google-oidc.types';
import {
  GOOGLE_OIDC_AUTHORIZATION_ENDPOINT,
  GOOGLE_OIDC_ISSUER,
  GOOGLE_OIDC_JWKS_URI,
  GOOGLE_OIDC_TOKEN_ENDPOINT,
} from './google-oidc.types';
import { GoogleOidcClient } from './google-oidc.client';

const configuration: GoogleOidcConfiguration = {
  allowedDomain: 'cloudfabrix.com',
  clientId: 'google-client-id',
  clientSecret: 'google-client-secret',
  clockToleranceSeconds: 30,
  enabled: true,
  frontendCallbackUri: 'https://pm.example/auth/google/callback',
  production: true,
  redirectUri: 'https://api.pm.example/auth/google/oidc/callback',
  redisHost: 'redis',
  redisPort: 6379,
  transactionTtlSeconds: 300,
};

const metadata = {
  authorization_endpoint: GOOGLE_OIDC_AUTHORIZATION_ENDPOINT,
  code_challenge_methods_supported: ['S256'],
  id_token_signing_alg_values_supported: ['RS256'],
  issuer: GOOGLE_OIDC_ISSUER,
  jwks_uri: GOOGLE_OIDC_JWKS_URI,
  token_endpoint: GOOGLE_OIDC_TOKEN_ENDPOINT,
};

function createApi(
  claims: GoogleIdentityClaims = { sub: 'subject' },
  metadataOverrides: Record<string, unknown> = {},
) {
  const discovered = {
    serverMetadata: () => ({ ...metadata, ...metadataOverrides }),
  };
  const api = {
    ClientSecretPost: jest.fn().mockReturnValue({}),
    authorizationCodeGrant: jest.fn().mockResolvedValue({
      claims: () => claims,
    }),
    buildAuthorizationUrl: jest.fn(
      (_discovered: unknown, parameters: Record<string, string>) => {
        const url = new URL(GOOGLE_OIDC_AUTHORIZATION_ENDPOINT);
        Object.entries(parameters).forEach(([name, value]) =>
          url.searchParams.set(name, value),
        );
        return url;
      },
    ),
    calculatePKCECodeChallenge: jest.fn().mockResolvedValue('pkce-challenge'),
    clockTolerance: Symbol('clockTolerance'),
    discovery: jest.fn().mockResolvedValue(discovered),
  };
  return api;
}

describe('Google OIDC client boundary', () => {
  it('discovers only the constrained Google issuer and approved metadata', async () => {
    const api = createApi();
    const client = new GoogleOidcClient(configuration, api as never);

    await client.buildAuthorizationUrl({
      codeVerifier: 'verifier',
      nonce: 'nonce',
      state: 'state',
    });

    expect(api.discovery).toHaveBeenCalledTimes(1);
    const call = api.discovery.mock.calls[0] as unknown[];
    const issuer = call[0];
    const clientId = call[1];
    const clientMetadata = call[2] as Record<PropertyKey, unknown>;
    expect((issuer as URL).href).toBe(`${GOOGLE_OIDC_ISSUER}/`);
    expect(clientId).toBe(configuration.clientId);
    expect(clientMetadata).toMatchObject({
      client_secret: configuration.clientSecret,
      id_token_signed_response_alg: 'RS256',
      redirect_uris: [configuration.redirectUri],
      response_types: ['code'],
    });
    expect(clientMetadata[api.clockTolerance]).toBe(30);
  });

  it.each([
    ['issuer', { issuer: 'https://evil.example' }],
    [
      'authorization endpoint',
      { authorization_endpoint: 'https://evil.example/auth' },
    ],
    ['token endpoint', { token_endpoint: 'https://evil.example/token' }],
    ['JWKS endpoint', { jwks_uri: 'https://evil.example/jwks' }],
    ['signing algorithm', { id_token_signing_alg_values_supported: ['HS256'] }],
    ['PKCE method', { code_challenge_methods_supported: ['plain'] }],
  ])('rejects unexpected discovery %s', async (_description, override) => {
    const client = new GoogleOidcClient(
      configuration,
      createApi({ sub: 'subject' }, override) as never,
    );

    await expect(
      client.buildAuthorizationUrl({
        codeVerifier: 'verifier',
        nonce: 'nonce',
        state: 'state',
      }),
    ).rejects.toThrow('discovery metadata is not permitted');
  });

  it('builds an authorization-code request with exact redirect, scope, PKCE, state, nonce, and domain hint', async () => {
    const api = createApi();
    const client = new GoogleOidcClient(configuration, api as never);
    const url = await client.buildAuthorizationUrl({
      codeVerifier: 'pkce-verifier',
      nonce: 'random-nonce',
      state: 'random-state',
    });

    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe(
      configuration.redirectUri,
    );
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge')).toBe('pkce-challenge');
    expect(api.calculatePKCECodeChallenge).toHaveBeenCalledWith(
      'pkce-verifier',
    );
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('random-state');
    expect(url.searchParams.get('nonce')).toBe('random-nonce');
    expect(url.searchParams.get('hd')).toBe('cloudfabrix.com');
    expect(url.searchParams.has('access_type')).toBe(false);
    expect(url.searchParams.has('prompt')).toBe(false);
  });

  it('exchanges the code with the stored verifier, expected state/nonce, and exact redirect', async () => {
    const claims = { sub: 'validated-by-library' };
    const api = createApi(claims);
    const client = new GoogleOidcClient(configuration, api as never);
    const callbackUrl = new URL(
      `${configuration.redirectUri}?code=code&state=state`,
    );

    await expect(
      client.exchangeAuthorizationCode({
        callbackUrl,
        codeVerifier: 'stored-verifier',
        expectedNonce: 'stored-nonce',
        expectedState: 'stored-state',
      }),
    ).resolves.toEqual(claims);
    expect(api.authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(),
      callbackUrl,
      {
        expectedNonce: 'stored-nonce',
        expectedState: 'stored-state',
        idTokenExpected: true,
        pkceCodeVerifier: 'stored-verifier',
      },
      { redirect_uri: configuration.redirectUri },
    );
  });

  it.each([
    'wrong signature',
    'unsupported algorithm',
    'wrong nonce',
    'invalid authorization code',
    'malformed ID token',
  ])('propagates maintained-library rejection for %s', async (reason) => {
    const api = createApi();
    api.authorizationCodeGrant.mockRejectedValue(new Error(reason));
    const client = new GoogleOidcClient(configuration, api as never);

    await expect(
      client.exchangeAuthorizationCode({
        callbackUrl: new URL(
          `${configuration.redirectUri}?code=code&state=state`,
        ),
        codeVerifier: 'verifier',
        expectedNonce: 'nonce',
        expectedState: 'state',
      }),
    ).rejects.toThrow(reason);
  });
});
