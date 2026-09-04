import type { GoogleOidcConfiguration } from './google-oidc.types';

export const GOOGLE_OIDC_CONFIGURATION = Symbol('GOOGLE_OIDC_CONFIGURATION');

const defaultAllowedDomain = 'cloudfabrix.com';
const defaultClockToleranceSeconds = 30;
const defaultTransactionTtlSeconds = 300;

export function getGoogleOidcConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): GoogleOidcConfiguration {
  const enabled = parseEnabled(environment.GOOGLE_OIDC_ENABLED);
  if (!enabled) {
    return { enabled: false };
  }

  const clientId = requireValue(environment, 'GOOGLE_OIDC_CLIENT_ID');
  const clientSecret = requireValue(environment, 'GOOGLE_OIDC_CLIENT_SECRET');
  const redirectUri = requireHttpsOrLoopbackUrl(
    environment,
    'GOOGLE_OIDC_REDIRECT_URI',
  );
  const frontendCallbackUri = requireHttpsOrLoopbackUrl(
    environment,
    'GOOGLE_OIDC_FRONTEND_CALLBACK_URI',
  );
  const allowedDomain = normalizeDomain(
    environment.GOOGLE_OIDC_ALLOWED_DOMAIN ?? defaultAllowedDomain,
  );
  const transactionTtlSeconds = parseInteger(
    environment.GOOGLE_OIDC_TRANSACTION_TTL_SECONDS,
    'GOOGLE_OIDC_TRANSACTION_TTL_SECONDS',
    defaultTransactionTtlSeconds,
    60,
    900,
  );
  const clockToleranceSeconds = parseInteger(
    environment.GOOGLE_OIDC_CLOCK_TOLERANCE_SECONDS,
    'GOOGLE_OIDC_CLOCK_TOLERANCE_SECONDS',
    defaultClockToleranceSeconds,
    0,
    300,
  );
  const redisHost = requireValue(environment, 'REDIS_HOST');
  const redisPort = parseInteger(
    environment.REDIS_PORT,
    'REDIS_PORT',
    6379,
    1,
    65_535,
  );

  return {
    allowedDomain,
    clientId,
    clientSecret,
    clockToleranceSeconds,
    enabled: true,
    frontendCallbackUri,
    production: environment.NODE_ENV === 'production',
    redirectUri,
    redisHost,
    redisPort,
    transactionTtlSeconds,
  };
}

function parseEnabled(value: string | undefined): boolean {
  if (value === undefined || value === '' || value === 'false') {
    return false;
  }
  if (value === 'true') {
    return true;
  }
  throw new Error('GOOGLE_OIDC_ENABLED must be true or false');
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when Google OIDC is enabled`);
  }
  return value;
}

function requireHttpsOrLoopbackUrl(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = requireValue(environment, name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error(`${name} must use HTTPS except for loopback development`);
  }
  if (url.username || url.password || url.hash) {
    throw new Error(`${name} must not contain credentials or a fragment`);
  }
  return url.href;
}

function normalizeDomain(value: string): string {
  const domain = value.trim().toLowerCase();
  if (
    domain.length > 253 ||
    !domain.includes('.') ||
    !domain
      .split('.')
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
      )
  ) {
    throw new Error('GOOGLE_OIDC_ALLOWED_DOMAIN must be a valid domain');
  }
  return domain;
}

function parseInteger(
  raw: string | undefined,
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  const value = raw === undefined || raw === '' ? defaultValue : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}
