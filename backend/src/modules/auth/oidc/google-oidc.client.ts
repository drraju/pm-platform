import { Inject, Injectable, Optional } from '@nestjs/common';
import type * as openid from 'openid-client';
import { GOOGLE_OIDC_CONFIGURATION } from './google-oidc.configuration';
import {
  GOOGLE_OIDC_AUTHORIZATION_ENDPOINT,
  GOOGLE_OIDC_ISSUER,
  GOOGLE_OIDC_JWKS_URI,
  GOOGLE_OIDC_TOKEN_ENDPOINT,
} from './google-oidc.types';
import type {
  GoogleIdentityClaims,
  GoogleOidcConfiguration,
  OidcAuthorizationParameters,
  OidcCodeExchange,
} from './google-oidc.types';

export const GOOGLE_OIDC_CLIENT = Symbol('GOOGLE_OIDC_CLIENT');
export const OPENID_CLIENT_API = Symbol('OPENID_CLIENT_API');

export interface GoogleOidcClientPort {
  buildAuthorizationUrl(input: OidcAuthorizationParameters): Promise<URL>;
  exchangeAuthorizationCode(
    input: OidcCodeExchange,
  ): Promise<GoogleIdentityClaims>;
}

type OpenIdClientApi = Pick<
  typeof openid,
  | 'ClientSecretPost'
  | 'authorizationCodeGrant'
  | 'buildAuthorizationUrl'
  | 'calculatePKCECodeChallenge'
  | 'clockTolerance'
  | 'discovery'
>;

@Injectable()
export class GoogleOidcClient implements GoogleOidcClientPort {
  private discoveredConfiguration: Promise<openid.Configuration> | undefined;
  private loadedApi: Promise<OpenIdClientApi> | undefined;

  constructor(
    @Inject(GOOGLE_OIDC_CONFIGURATION)
    private readonly configuration: GoogleOidcConfiguration,
    @Optional()
    @Inject(OPENID_CLIENT_API)
    private readonly injectedApi?: OpenIdClientApi,
  ) {}

  async buildAuthorizationUrl(
    input: OidcAuthorizationParameters,
  ): Promise<URL> {
    const configuration = await this.getConfiguration();
    const api = await this.getApi();
    return api.buildAuthorizationUrl(configuration, {
      code_challenge: await api.calculatePKCECodeChallenge(input.codeVerifier),
      code_challenge_method: 'S256',
      hd: this.enabledConfiguration().allowedDomain,
      nonce: input.nonce,
      redirect_uri: this.enabledConfiguration().redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: input.state,
    });
  }

  async exchangeAuthorizationCode(
    input: OidcCodeExchange,
  ): Promise<GoogleIdentityClaims> {
    const configuration = await this.getConfiguration();
    const api = await this.getApi();
    const tokens = await api.authorizationCodeGrant(
      configuration,
      input.callbackUrl,
      {
        expectedNonce: input.expectedNonce,
        expectedState: input.expectedState,
        idTokenExpected: true,
        pkceCodeVerifier: input.codeVerifier,
      },
      { redirect_uri: this.enabledConfiguration().redirectUri },
    );
    const claims = tokens.claims();
    if (!claims) {
      throw new Error(
        'OIDC response did not contain validated identity claims',
      );
    }
    return claims;
  }

  private getConfiguration(): Promise<openid.Configuration> {
    this.discoveredConfiguration ??= this.discover();
    return this.discoveredConfiguration;
  }

  private async discover(): Promise<openid.Configuration> {
    const configuration = this.enabledConfiguration();
    const api = await this.getApi();
    const discovered = await api.discovery(
      new URL(GOOGLE_OIDC_ISSUER),
      configuration.clientId,
      {
        client_secret: configuration.clientSecret,
        id_token_signed_response_alg: 'RS256',
        redirect_uris: [configuration.redirectUri],
        response_types: ['code'],
        [api.clockTolerance]: configuration.clockToleranceSeconds,
      },
      api.ClientSecretPost(configuration.clientSecret),
    );
    const metadata = discovered.serverMetadata();
    if (
      metadata.issuer !== GOOGLE_OIDC_ISSUER ||
      metadata.authorization_endpoint !== GOOGLE_OIDC_AUTHORIZATION_ENDPOINT ||
      metadata.token_endpoint !== GOOGLE_OIDC_TOKEN_ENDPOINT ||
      metadata.jwks_uri !== GOOGLE_OIDC_JWKS_URI ||
      !metadata.id_token_signing_alg_values_supported?.includes('RS256') ||
      !metadata.code_challenge_methods_supported?.includes('S256')
    ) {
      throw new Error('Google OIDC discovery metadata is not permitted');
    }
    return discovered;
  }

  private getApi(): Promise<OpenIdClientApi> {
    if (this.injectedApi) {
      return Promise.resolve(this.injectedApi);
    }
    this.loadedApi ??= import('openid-client');
    return this.loadedApi;
  }

  private enabledConfiguration(): Extract<
    GoogleOidcConfiguration,
    { enabled: true }
  > {
    if (!this.configuration.enabled) {
      throw new Error('Google OIDC is disabled');
    }
    return this.configuration;
  }
}
