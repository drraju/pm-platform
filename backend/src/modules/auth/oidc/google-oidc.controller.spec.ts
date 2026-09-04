import type { Request, Response } from 'express';
import { GoogleOidcController } from './google-oidc.controller';
import type { GoogleOidcProtocolService } from './google-oidc-protocol.service';

describe('Google OIDC controller', () => {
  function response() {
    const clearCookie = jest.fn();
    const cookie = jest.fn();
    const json = jest.fn();
    const redirect = jest.fn();
    return {
      clearCookie,
      cookie,
      json,
      redirect,
      value: { clearCookie, cookie, json, redirect } as unknown as Response,
    };
  }

  it('places correlation only in a cookie and redirects to authorization', async () => {
    const authorization = {
      authorizationUrl:
        'https://accounts.google.com/o/oauth2/v2/auth?state=opaque',
      correlationCookie: {
        name: 'pm_google_oidc_correlation' as const,
        options: {
          httpOnly: true,
          maxAge: 300_000,
          path: '/auth/google/oidc/callback',
          sameSite: 'lax' as const,
          secure: true,
        },
        value: 'transaction.correlation',
      },
    };
    const createAuthorizationRequest = jest
      .fn()
      .mockResolvedValue(authorization);
    const protocol = {
      createAuthorizationRequest,
    } as unknown as GoogleOidcProtocolService;
    const controller = new GoogleOidcController(protocol);
    const res = response();

    await controller.authorize(res.value);

    expect(res.cookie).toHaveBeenCalledWith(
      authorization.correlationCookie.name,
      authorization.correlationCookie.value,
      authorization.correlationCookie.options,
    );
    expect(res.redirect).toHaveBeenCalledWith(authorization.authorizationUrl);
    expect(authorization.authorizationUrl).not.toContain('correlation');
  });

  it('reads and clears the scoped correlation cookie before returning evidence', async () => {
    const evidence = {
      emailVerified: true as const,
      hostedDomain: 'cloudfabrix.com',
      issuer: 'https://accounts.google.com' as const,
      normalizedEmail: 'person@cloudfabrix.com',
      provider: 'GOOGLE' as const,
      subject: 'subject',
    };
    const clearOptions = {
      httpOnly: true,
      path: '/auth/google/oidc/callback',
      sameSite: 'lax' as const,
      secure: true,
    };
    const completeAuthorization = jest.fn().mockResolvedValue(evidence);
    const correlationCookieClearOptions = jest
      .fn()
      .mockReturnValue(clearOptions);
    const correlationCookieName = jest
      .fn()
      .mockReturnValue('pm_google_oidc_correlation');
    const protocol = {
      completeAuthorization,
      correlationCookieClearOptions,
      correlationCookieName,
    } as unknown as GoogleOidcProtocolService;
    const controller = new GoogleOidcController(protocol);
    const req = {
      headers: {
        cookie:
          'unrelated=x; pm_google_oidc_correlation=transaction.correlation',
      },
    } as Request;
    const res = response();

    await controller.callback({ code: 'code', state: 'state' }, req, res.value);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'pm_google_oidc_correlation',
      clearOptions,
    );
    expect(completeAuthorization).toHaveBeenCalledWith(
      { code: 'code', state: 'state' },
      'transaction.correlation',
    );
    expect(res.json).toHaveBeenCalledWith(evidence);
  });

  it('treats malformed cookie encoding as missing correlation', async () => {
    const completeAuthorization = jest.fn().mockResolvedValue({});
    const protocol = {
      completeAuthorization,
      correlationCookieClearOptions: jest.fn().mockReturnValue({}),
      correlationCookieName: jest
        .fn()
        .mockReturnValue('pm_google_oidc_correlation'),
    } as unknown as GoogleOidcProtocolService;
    const controller = new GoogleOidcController(protocol);

    await controller.callback(
      { code: 'code', state: 'state' },
      { headers: { cookie: 'pm_google_oidc_correlation=%GG' } } as Request,
      response().value,
    );

    expect(completeAuthorization).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
    );
  });
});
