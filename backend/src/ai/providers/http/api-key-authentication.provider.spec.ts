import { APIKeyAuthenticationProvider } from './api-key-authentication.provider';

describe('APIKeyAuthenticationProvider', () => {
  it('injects bearer authorization headers without exposing missing keys', () => {
    const provider = new APIKeyAuthenticationProvider();

    expect(provider.createAuthorizationHeaders('key-1')).toEqual({
      Authorization: 'Bearer key-1',
    });
    expect(provider.createAuthorizationHeaders(undefined)).toEqual({});
    expect(provider.validate(undefined)).toEqual([
      'API key is not configured.',
    ]);
    expect(provider.validate('key-1')).toEqual([]);
  });
});
