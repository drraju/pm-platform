import { GoogleTokenVault } from '../providers/google-drive';

describe('GoogleTokenVault', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'test-encryption-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts refresh tokens without storing plaintext', () => {
    const vault = new GoogleTokenVault();

    const encrypted = vault.encrypt('refresh-token');

    expect(encrypted).not.toContain('refresh-token');
    expect(vault.decrypt(encrypted)).toBe('refresh-token');
  });
});
