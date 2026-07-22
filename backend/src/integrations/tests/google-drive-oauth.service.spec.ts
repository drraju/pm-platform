import { GoogleDriveOAuthService } from '../providers/google-drive';

describe('GoogleDriveOAuthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost/google/callback',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates a least-privilege Google Drive authorization URL', () => {
    const service = new GoogleDriveOAuthService();

    const url = service.getAuthorizationUrl({ state: 'state-1' });

    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('state=state-1');
    expect(decodeURIComponent(url)).toContain(
      'https://www.googleapis.com/auth/drive.file',
    );
    expect(decodeURIComponent(url)).toContain(
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    );
  });
});
