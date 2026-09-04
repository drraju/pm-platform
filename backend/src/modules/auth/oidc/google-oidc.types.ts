import type { CookieOptions } from 'express';

export const GOOGLE_OIDC_ISSUER = 'https://accounts.google.com';
export const GOOGLE_OIDC_AUTHORIZATION_ENDPOINT =
  'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OIDC_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_OIDC_JWKS_URI =
  'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_OIDC_CALLBACK_PATH = '/auth/google/oidc/callback';
export const GOOGLE_OIDC_CORRELATION_COOKIE = 'pm_google_oidc_correlation';

export type GoogleOidcConfiguration =
  | { enabled: false }
  | {
      allowedDomain: string;
      clientId: string;
      clientSecret: string;
      clockToleranceSeconds: number;
      enabled: true;
      frontendCallbackUri: string;
      production: boolean;
      redirectUri: string;
      redisHost: string;
      redisPort: number;
      transactionTtlSeconds: number;
    };

export type OidcTransaction = {
  browserCorrelationHash: string;
  codeVerifier: string;
  createdAt: number;
  expiresAt: number;
  nonce: string;
  state: string;
  transactionId: string;
};

export type OidcAuthorizationRequest = {
  authorizationUrl: string;
  correlationCookie: {
    name: typeof GOOGLE_OIDC_CORRELATION_COOKIE;
    options: CookieOptions;
    value: string;
  };
};

export type GoogleIdentityClaims = {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  exp?: number;
  hd?: string;
  iat?: number;
  iss?: string;
  sub?: string;
};

export type ValidatedGoogleIdentity = {
  emailVerified: true;
  hostedDomain: string;
  issuer: typeof GOOGLE_OIDC_ISSUER;
  normalizedEmail: string;
  provider: 'GOOGLE';
  subject: string;
};

export type OidcErrorCategory =
  | 'access_denied'
  | 'authentication_failed'
  | 'ineligible_account'
  | 'invalid_request'
  | 'transaction_expired';

export type OidcAuthorizationParameters = {
  codeVerifier: string;
  nonce: string;
  state: string;
};

export type OidcCodeExchange = {
  callbackUrl: URL;
  codeVerifier: string;
  expectedNonce: string;
  expectedState: string;
};
