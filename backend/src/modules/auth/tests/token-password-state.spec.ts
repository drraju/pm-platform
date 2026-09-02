import { isTokenCurrentForPasswordState } from '../token-password-state';

describe('token password state', () => {
  const passwordChangedAt = new Date('2026-09-02T10:00:02.500Z');

  it('accepts an exact watermark even when JWT iat has lower precision', () => {
    expect(
      isTokenCurrentForPasswordState(
        {
          iat: Math.floor(passwordChangedAt.getTime() / 1000),
          passwordChangedAt: passwordChangedAt.toISOString(),
        },
        passwordChangedAt,
      ),
    ).toBe(true);
  });

  it('rejects a token carrying a previous password watermark', () => {
    expect(
      isTokenCurrentForPasswordState(
        {
          iat: Math.floor(passwordChangedAt.getTime() / 1000),
          passwordChangedAt: '2026-09-02T09:00:00.000Z',
        },
        passwordChangedAt,
      ),
    ).toBe(false);
  });

  it('preserves issued-at validation for legacy tokens', () => {
    expect(
      isTokenCurrentForPasswordState(
        { iat: Math.floor(passwordChangedAt.getTime() / 1000) - 1 },
        passwordChangedAt,
      ),
    ).toBe(false);
    expect(
      isTokenCurrentForPasswordState(
        { iat: Math.ceil(passwordChangedAt.getTime() / 1000) },
        passwordChangedAt,
      ),
    ).toBe(true);
  });

  it('can require an exact watermark for SERVICE token revocation', () => {
    expect(
      isTokenCurrentForPasswordState(
        { iat: Math.ceil(passwordChangedAt.getTime() / 1000) },
        passwordChangedAt,
        true,
      ),
    ).toBe(false);
  });
});
