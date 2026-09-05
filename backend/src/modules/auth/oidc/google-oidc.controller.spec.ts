import type { Request, Response } from 'express';
import { GoogleOidcAuthenticationService } from './google-oidc-authentication.service';
import { GoogleOidcController } from './google-oidc.controller';
import { GoogleOidcProtocolService } from './google-oidc-protocol.service';
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
  let response: {
    clearCookie: jest.Mock;
    cookie: jest.Mock;
    json: jest.Mock;
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
    response = {
      clearCookie: jest.fn(),
      cookie: jest.fn(),
      json: jest.fn(),
      redirect: jest.fn(),
    };
    controller = new GoogleOidcController(
      protocol as unknown as GoogleOidcProtocolService,
      authentication as unknown as GoogleOidcAuthenticationService,
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

  it('completes the protocol before authenticating and returns SessionDto', async () => {
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

    expect(events).toEqual(['protocol', 'authentication']);
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
    expect(response.json).toHaveBeenCalledWith({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('preserves protocol errors and does not invoke PM authentication', async () => {
    protocol.completeAuthorization.mockRejectedValue(
      new OidcProtocolException('access_denied'),
    );

    await expect(
      controller.callback(
        { error: 'access_denied', state: 'state' },
        { headers: {} } as Request,
        response as unknown as Response,
      ),
    ).rejects.toMatchObject({ category: 'access_denied' });
    expect(response.clearCookie).toHaveBeenCalled();
    expect(authentication.authenticate).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
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
});
