import { getJwtConfiguration } from '../jwt-configuration';

const strongAccessSecret = 'a'.repeat(32);
const strongRefreshSecret = 'b'.repeat(32);

describe('JWT configuration', () => {
  it('fails production configuration when JWT secrets are missing', () => {
    expect(() => getJwtConfiguration({ NODE_ENV: 'production' })).toThrow(
      'Missing required JWT environment variables',
    );
  });

  it('requires distinct access and refresh secrets', () => {
    expect(() =>
      getJwtConfiguration({
        JWT_ACCESS_SECRET: strongAccessSecret,
        JWT_REFRESH_SECRET: strongAccessSecret,
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT access and refresh secrets must be distinct');
  });

  it.each(['production', 'development'])(
    'rejects weak %s access secrets',
    (nodeEnvironment) => {
      expect(() =>
        getJwtConfiguration({
          JWT_ACCESS_SECRET: 'short-access-secret',
          JWT_REFRESH_SECRET: strongRefreshSecret,
          NODE_ENV: nodeEnvironment,
        }),
      ).toThrow('JWT_ACCESS_SECRET must contain at least 32 bytes');
    },
  );

  it('rejects weak non-test refresh secrets', () => {
    expect(() =>
      getJwtConfiguration({
        JWT_ACCESS_SECRET: strongAccessSecret,
        JWT_REFRESH_SECRET: 'short-refresh-secret',
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT_REFRESH_SECRET must contain at least 32 bytes');
  });

  it('rejects known placeholder secrets outside test', () => {
    expect(() =>
      getJwtConfiguration({
        JWT_ACCESS_SECRET: 'replace-with-a-long-random-access-secret',
        JWT_REFRESH_SECRET: strongRefreshSecret,
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT_ACCESS_SECRET must not use a known placeholder value');

    expect(() =>
      getJwtConfiguration({
        JWT_ACCESS_SECRET: strongAccessSecret,
        JWT_REFRESH_SECRET:
          'replace-with-a-different-long-random-refresh-secret',
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT_REFRESH_SECRET must not use a known placeholder value');
  });

  it('accepts strong distinct secrets and preserves token defaults', () => {
    expect(
      getJwtConfiguration({
        JWT_ACCESS_SECRET: strongAccessSecret,
        JWT_REFRESH_SECRET: strongRefreshSecret,
        NODE_ENV: 'production',
      }),
    ).toEqual(
      expect.objectContaining({
        accessAudience: 'pm-platform-api',
        accessExpiresIn: '15m',
        algorithm: 'HS256',
        issuer: 'pm-platform',
        refreshAudience: 'pm-platform-refresh',
        refreshExpiresIn: '7d',
      }),
    );
  });
});
