import { BadRequestException } from '@nestjs/common';
import { GoogleOAuthStateService } from '../providers/google-drive';

describe('GoogleOAuthStateService', () => {
  const originalSecret = process.env.GOOGLE_OAUTH_STATE_SECRET;

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = 'test-state-secret';
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = originalSecret;
  });

  it('creates and validates signed OAuth state', () => {
    const service = new GoogleOAuthStateService();
    const state = service.createState();
    const payload = service.validateState(state);

    expect(state).toContain('.');
    expect(typeof payload.issuedAt).toBe('number');
    expect(typeof payload.nonce).toBe('string');
  });

  it('rejects tampered OAuth state', () => {
    const service = new GoogleOAuthStateService();
    const state = `${service.createState()}tampered`;

    expect(() => service.validateState(state)).toThrow(BadRequestException);
  });
});
