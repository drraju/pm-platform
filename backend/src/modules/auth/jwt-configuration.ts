import { JwtSignOptions } from '@nestjs/jwt';

export const JWT_CONFIGURATION = Symbol('JWT_CONFIGURATION');
export const JWT_ALGORITHM = 'HS256' as const;

const minimumSecretBytes = 32;
const prohibitedSecrets = new Set([
  'pm-platform-test-access-secret-not-for-production',
  'pm-platform-test-refresh-secret-not-for-production',
  'replace-with-a-long-random-access-secret',
  'replace-with-a-different-long-random-refresh-secret',
]);

export type JwtConfiguration = {
  algorithm: typeof JWT_ALGORITHM;
  accessAudience: string;
  accessExpiresIn: JwtSignOptions['expiresIn'];
  accessSecret: string;
  issuer: string;
  refreshAudience: string;
  refreshExpiresIn: JwtSignOptions['expiresIn'];
  refreshSecret: string;
};

const testAccessSecret = 'pm-platform-test-access-secret-not-for-production';
const testRefreshSecret = 'pm-platform-test-refresh-secret-not-for-production';

export function getJwtConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): JwtConfiguration {
  const isTest = environment.NODE_ENV === 'test';
  const accessSecret =
    environment.JWT_ACCESS_SECRET ?? (isTest ? testAccessSecret : undefined);
  const refreshSecret =
    environment.JWT_REFRESH_SECRET ?? (isTest ? testRefreshSecret : undefined);
  const missing = [
    ...(accessSecret ? [] : ['JWT_ACCESS_SECRET']),
    ...(refreshSecret ? [] : ['JWT_REFRESH_SECRET']),
  ];

  if (missing.length > 0) {
    throw new Error(
      `Missing required JWT environment variables: ${missing.join(', ')}`,
    );
  }
  if (accessSecret === refreshSecret) {
    throw new Error('JWT access and refresh secrets must be distinct');
  }
  if (!isTest) {
    validateProductionSecret('JWT_ACCESS_SECRET', accessSecret!);
    validateProductionSecret('JWT_REFRESH_SECRET', refreshSecret!);
  }

  return {
    algorithm: JWT_ALGORITHM,
    accessAudience: environment.JWT_ACCESS_AUDIENCE ?? 'pm-platform-api',
    accessExpiresIn: (environment.JWT_ACCESS_EXPIRES_IN ??
      '15m') as JwtSignOptions['expiresIn'],
    accessSecret: accessSecret!,
    issuer: environment.JWT_ISSUER ?? 'pm-platform',
    refreshAudience: environment.JWT_REFRESH_AUDIENCE ?? 'pm-platform-refresh',
    refreshExpiresIn: (environment.JWT_REFRESH_EXPIRES_IN ??
      '7d') as JwtSignOptions['expiresIn'],
    refreshSecret: refreshSecret!,
  };
}

function validateProductionSecret(variableName: string, secret: string): void {
  if (Buffer.byteLength(secret, 'utf8') < minimumSecretBytes) {
    throw new Error(`${variableName} must contain at least 32 bytes`);
  }
  if (prohibitedSecrets.has(secret)) {
    throw new Error(`${variableName} must not use a known placeholder value`);
  }
}
