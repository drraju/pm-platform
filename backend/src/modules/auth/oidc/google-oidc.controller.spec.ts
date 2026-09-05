import type { Request, Response } from 'express';
import { GoogleOidcAuthenticationService } from './google-oidc-authentication.service';
import { GoogleOidcController } from './google-oidc.controller';
import { GoogleOidcProtocolService } from './google-oidc-protocol.service';
import { GoogleOidcSessionHandoffService } from './google-oidc-session-handoff.service';
import { GOOGLE_OIDC_ISSUER } from './google-oidc.types';
import { OidcProtocolException } from './oidc-protocol.exception';

describe('GoogleOidcController', () => {
  let authentication: { authenticate: jest.Mock };
  let controller: GoogleOidcController;
  let protocol: {
    completeAuthorization: jest.Mock;
    correlationCookieClearOptions: jest.Mock;
    correlationCookieName: jest.Mock;
    createAuthorizationRequest: jest.Mock;
  };
  let sessionHandoff: {
    consume: jest.Mock;
    create: jest.Mock;
    frontendErrorRedirect: jest.Mock;
    frontendSuccessRedirect: jest.Mock;
  };
  let response: {
    clearCookie: jest.Mock;
    cookie: jest.Mock;
    redirect: jest.Mock;
  };

  beforeEach(() => {
    protocol = {
      completeAuthorization: jest.fn().mockResolvedValue({
        emailVerified: true,
        familyName: null,
        givenName: null,
        hostedDomain: 'example.com',
        issuer: GOOGLE_OIDC_ISSUER,
        normalizedEmail: 'person@example.com',
        provider: 'GOOGLE',
        subject: 'google-subject',
      }),
      correlationCookieClearOptions: jest.fn().mockReturnValue({
        httpOnly: true,
        path: '/auth/google/oidc/callback',
        sameSite: 'lax',
        secure: true,
      }),
      correlationCookieName: jest
        .fn()
        .mockReturnValue('pm_google_oidc_correlation'),
      createAuthorizationRequest: jest.fn().mockResolvedValue({
        authorizationUrl: 'https://accounts.google.com/authorize',
        correlationCookie: {
          name: 'pm_google_oidc_correlation',
          options: { httpOnly: true },
          value: 'transaction.correlation',
        },
      }),
    };
    authentication = {
      authenticate: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    };
    sessionHandoff = {
      consume: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
      create: jest.fn().mockResolvedValue('a'.repeat(43)),
      frontendErrorRedirect: jest
        .fn()
        .mockReturnValue(
          'https://pm.example/auth/google/callback?error=authentication_failed',
        ),
      frontendSuccessRedirect: jest
        .fn()
        .mockReturnValue(
          `https://pm.example/auth/google/callback?handoff=${'a'.repeat(43)}`,
        ),
    };
    response = {
      clearCookie: jest.fn(),
      cookie: jest.fn(),
      redirect: jest.fn(),
    };
    controller = new GoogleOidcController(
      protocol as unknown as GoogleOidcProtocolService,
      authentication as unknown as GoogleOidcAuthenticationService,
      sessionHandoff as unknown as GoogleOidcSessionHandoffService,
    );
  });

  it('preserves authorization redirect and correlation cookie behavior', async () => {
    await controller.authorize(response as unknown as Response);

    expect(response.cookie).toHaveBeenCalledWith(
      'pm_google_oidc_correlation',
      'transaction.correlation',
      { httpOnly: true },
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'https://accounts.google.com/authorize',
    );
    expect('https://accounts.google.com/authorize').not.toContain(
      'correlation',
    );
  });

  it('completes authentication before storing one handoff and redirecting', async () => {
    const events: string[] = [];
    protocol.completeAuthorization.mockImplementation(() => {
      events.push('protocol');
      return Promise.resolve({
        emailVerified: true,
        familyName: null,
        givenName: null,
        hostedDomain: 'example.com',
        issuer: GOOGLE_OIDC_ISSUER,
        normalizedEmail: 'person@example.com',
        provider: 'GOOGLE',
        subject: 'google-subject',
      });
    });
    authentication.authenticate.mockImplementation(() => {
      events.push('authentication');
      return Promise.resolve({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
    sessionHandoff.create.mockImplementation(() => {
      events.push('handoff');
      return Promise.resolve('a'.repeat(43));
    });
    const request = {
      headers: {
        cookie:
          'other=value; pm_google_oidc_correlation=transaction.correlation',
      },
    } as Request;

    await controller.callback(
      { code: 'code', state: 'state' },
      request,
      response as unknown as Response,
    );

    expect(events).toEqual(['protocol', 'authentication', 'handoff']);
    expect(protocol.completeAuthorization).toHaveBeenCalledWith(
      { code: 'code', state: 'state' },
      'transaction.correlation',
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'pm_google_oidc_correlation',
      expect.objectContaining({
        httpOnly: true,
        path: '/auth/google/oidc/callback',
      }),
    );
    expect(sessionHandoff.create).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(sessionHandoff.frontendSuccessRedirect).toHaveBeenCalledWith(
      'a'.repeat(43),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      303,
      `https://pm.example/auth/google/callback?handoff=${'a'.repeat(43)}`,
    );
  });

  it('preserves protocol errors and does not invoke PM authentication', async () => {
    protocol.completeAuthorization.mockRejectedValue(
      new OidcProtocolException('access_denied'),
    );
    sessionHandoff.frontendErrorRedirect.mockReturnValue(
      'https://pm.example/auth/google/callback?error=access_denied',
    );

    await controller.callback(
      { error: 'access_denied', state: 'state' },
      { headers: {} } as Request,
      response as unknown as Response,
    );
    expect(response.clearCookie).toHaveBeenCalled();
    expect(authentication.authenticate).not.toHaveBeenCalled();
    expect(sessionHandoff.create).not.toHaveBeenCalled();
    expect(sessionHandoff.frontendErrorRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'access_denied' }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      303,
      'https://pm.example/auth/google/callback?error=access_denied',
    );
  });

  it('treats malformed cookie encoding as missing correlation', async () => {
    await controller.callback(
      { code: 'code', state: 'state' },
      {
        headers: { cookie: 'pm_google_oidc_correlation=%GG' },
      } as Request,
      response as unknown as Response,
    );

    expect(protocol.completeAuthorization).toHaveBeenCalledWith(
      { code: 'code', state: 'state' },
      undefined,
    );
  });

  it('redirects safely when handoff persistence fails', async () => {
    const error = new OidcProtocolException('authentication_failed');
    sessionHandoff.create.mockRejectedValue(error);

    await controller.callback(
      { code: 'code', state: 'state' },
      { headers: {} } as Request,
      response as unknown as Response,
    );

    expect(sessionHandoff.frontendErrorRedirect).toHaveBeenCalledWith(error);
    expect(response.redirect).toHaveBeenCalledWith(
      303,
      'https://pm.example/auth/google/callback?error=authentication_failed',
    );
  });

  it('exchanges an opaque handoff through the session handoff service', async () => {
    await expect(
      controller.exchange({ handoff: 'a'.repeat(43) }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(sessionHandoff.consume).toHaveBeenCalledWith('a'.repeat(43));
  });
});
