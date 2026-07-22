import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GOOGLE_DRIVE_SCOPES } from './google-drive.constants';

export type GoogleOAuthTokens = Readonly<{
  accessToken?: string | null;
  refreshToken?: string | null;
}>;

@Injectable()
export class GoogleDriveOAuthService {
  createClient(redirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const resolvedRedirectUri =
      redirectUri ?? process.env.GOOGLE_REDIRECT_URI ?? undefined;

    if (!clientId || !clientSecret || !resolvedRedirectUri) {
      throw new Error(
        'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are required.',
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, resolvedRedirectUri);
  }

  getAuthorizationUrl(input: { redirectUri?: string; state?: string }): string {
    return this.createClient(input.redirectUri).generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent',
      scope: GOOGLE_DRIVE_SCOPES,
      state: input.state,
    });
  }

  async exchangeCode(input: {
    authorizationCode: string;
    redirectUri?: string;
  }): Promise<GoogleOAuthTokens> {
    const client = this.createClient(input.redirectUri);
    const { tokens } = await client.getToken(input.authorizationCode);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  createAuthorizedClient(input: {
    accessToken?: string | null;
    refreshToken?: string | null;
    redirectUri?: string;
  }) {
    const client = this.createClient(input.redirectUri);
    client.setCredentials({
      access_token: input.accessToken ?? undefined,
      refresh_token: input.refreshToken ?? undefined,
    });
    return client;
  }
}
