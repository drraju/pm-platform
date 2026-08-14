import { getJwtConfiguration } from '../jwt-configuration';

describe('JWT configuration', () => {
  it('fails production configuration when JWT secrets are missing', () => {
    expect(() => getJwtConfiguration({ NODE_ENV: 'production' })).toThrow(
      'Missing required JWT environment variables',
    );
  });

  it('requires distinct access and refresh secrets', () => {
    expect(() =>
      getJwtConfiguration({
        JWT_ACCESS_SECRET: 'same-secret',
        JWT_REFRESH_SECRET: 'same-secret',
        NODE_ENV: 'production',
      }),
    ).toThrow('JWT access and refresh secrets must be distinct');
  });

  it('uses explicit short access and longer refresh defaults', () => {
    expect(
      getJwtConfiguration({
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        NODE_ENV: 'production',
      }),
    ).toEqual(
      expect.objectContaining({
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
      }),
    );
  });
});
