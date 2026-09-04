import { OidcRandomSource } from './oidc-random.source';

describe('OIDC random source', () => {
  it('produces independent cryptographically sized URL-safe values', () => {
    const source = new OidcRandomSource();
    const values = [
      source.browserCorrelation(),
      source.codeVerifier(),
      source.nonce(),
      source.state(),
      source.transactionId(),
    ];

    expect(new Set(values).size).toBe(values.length);
    values.forEach((value) => {
      expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });
  });
});
