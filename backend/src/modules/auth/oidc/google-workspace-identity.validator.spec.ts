import type {
  GoogleOidcConfiguration,
  GoogleIdentityClaims,
} from './google-oidc.types';
import { GOOGLE_OIDC_ISSUER } from './google-oidc.types';
import { GoogleWorkspaceIdentityValidator } from './google-workspace-identity.validator';
import { OidcProtocolException } from './oidc-protocol.exception';

const configuration: Extract<GoogleOidcConfiguration, { enabled: true }> = {
  allowedDomain: 'cloudfabrix.com',
  clientId: 'google-client-id',
  clientSecret: 'not-observed-by-the-validator',
  clockToleranceSeconds: 30,
  enabled: true,
  frontendCallbackUri: 'https://pm.example/auth/google/callback',
  production: true,
  redirectUri: 'https://api.pm.example/auth/google/oidc/callback',
  redisHost: 'redis',
  redisPort: 6379,
  transactionTtlSeconds: 300,
};

function validClaims(): GoogleIdentityClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: configuration.clientId,
    email: 'Person@CloudFabrix.COM',
    email_verified: true,
    exp: now + 300,
    hd: 'CloudFabrix.COM',
    iat: now,
    iss: GOOGLE_OIDC_ISSUER,
    sub: 'google-subject-123',
  };
}

describe('Google Workspace identity validation', () => {
  const validator = new GoogleWorkspaceIdentityValidator(configuration);

  it('returns narrow normalized authentication evidence', () => {
    expect(validator.validate(validClaims())).toEqual({
      emailVerified: true,
      hostedDomain: 'cloudfabrix.com',
      issuer: GOOGLE_OIDC_ISSUER,
      normalizedEmail: 'person@cloudfabrix.com',
      provider: 'GOOGLE',
      subject: 'google-subject-123',
    });
  });

  it.each([
    ['wrong issuer', { iss: 'https://evil.example' }, 'authentication_failed'],
    ['wrong audience', { aud: 'another-client' }, 'authentication_failed'],
    ['expired token', { exp: 1 }, 'authentication_failed'],
    [
      'future issued-at',
      { iat: Math.floor(Date.now() / 1000) + 31 },
      'authentication_failed',
    ],
    ['missing issued-at', { iat: undefined }, 'authentication_failed'],
    ['missing expiry', { exp: undefined }, 'authentication_failed'],
    ['missing subject', { sub: undefined }, 'ineligible_account'],
    ['empty subject', { sub: '   ' }, 'ineligible_account'],
    ['missing email', { email: undefined }, 'ineligible_account'],
    ['unverified email', { email_verified: false }, 'ineligible_account'],
    ['missing hosted domain', { hd: undefined }, 'ineligible_account'],
    ['wrong hosted domain', { hd: 'example.com' }, 'ineligible_account'],
    [
      'wrong email domain',
      { email: 'person@example.com' },
      'ineligible_account',
    ],
    [
      'lookalike email domain',
      { email: 'person@cloudfabrix.com.evil.example' },
      'ineligible_account',
    ],
    [
      'lookalike hosted domain',
      { hd: 'cloudfabrix.com.evil.example' },
      'ineligible_account',
    ],
    [
      'subdomain email',
      { email: 'person@team.cloudfabrix.com' },
      'ineligible_account',
    ],
    [
      'subdomain hosted domain',
      { hd: 'team.cloudfabrix.com' },
      'ineligible_account',
    ],
    [
      'malformed email',
      { email: 'person@@cloudfabrix.com' },
      'ineligible_account',
    ],
    [
      'malformed local part',
      { email: 'person..name@cloudfabrix.com' },
      'ineligible_account',
    ],
    [
      'email with whitespace',
      { email: 'per son@cloudfabrix.com' },
      'ineligible_account',
    ],
  ] as const)('rejects %s', (_description, overrides, expectedCategory) => {
    try {
      validator.validate({ ...validClaims(), ...overrides });
      throw new Error('expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(OidcProtocolException);
      expect((error as OidcProtocolException).category).toBe(expectedCategory);
    }
  });
});
