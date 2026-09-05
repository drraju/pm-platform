import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import {
  GoogleIdentityLinkingPersistenceError,
  GoogleIdentityLinkingRejectedError,
  GoogleIdentityLinkingService,
} from '../../users/google-identity-linking.service';
import { AuthenticationMethod } from '../authentication-method';
import { PmSessionIssuer } from '../pm-session-issuer.service';
import { GoogleOidcAuthenticationService } from './google-oidc-authentication.service';
import { GOOGLE_OIDC_ISSUER } from './google-oidc.types';

const validatedIdentity = {
  emailVerified: true as const,
  familyName: 'Lovelace',
  givenName: 'Ada',
  hostedDomain: 'example.com',
  issuer: GOOGLE_OIDC_ISSUER,
  normalizedEmail: 'person@example.com',
  provider: 'GOOGLE' as const,
  subject: 'google-subject',
};

describe('GoogleOidcAuthenticationService', () => {
  let authenticate: GoogleOidcAuthenticationService;
  let identityLinking: { resolveAndRecordAuthentication: jest.Mock };
  let sessionIssuer: { issue: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00.000Z'));
    identityLinking = {
      resolveAndRecordAuthentication: jest.fn().mockResolvedValue({
        principal: {
          email: 'pm-current@example.com',
          id: 'user-1',
          identityType: UserIdentityType.Human,
          passwordChangedAt: null,
          roleId: 'role-1',
        },
        status: 'active',
      }),
    };
    sessionIssuer = {
      issue: jest.fn().mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    };
    authenticate = new GoogleOidcAuthenticationService(
      identityLinking as unknown as GoogleIdentityLinkingService,
      sessionIssuer as unknown as PmSessionIssuer,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes only identity evidence to linking and issues one GOOGLE PM session', async () => {
    await expect(authenticate.authenticate(validatedIdentity)).resolves.toEqual(
      {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    );

    expect(identityLinking.resolveAndRecordAuthentication).toHaveBeenCalledWith(
      {
        firstName: 'Ada',
        issuer: GOOGLE_OIDC_ISSUER,
        lastName: 'Lovelace',
        normalizedEmail: 'person@example.com',
        subject: 'google-subject',
      },
    );
    expect(sessionIssuer.issue).toHaveBeenCalledTimes(1);
    expect(sessionIssuer.issue).toHaveBeenCalledWith(
      {
        email: 'pm-current@example.com',
        id: 'user-1',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: 'role-1',
      },
      {
        authenticatedAt: 1_788_523_200,
        authenticationMethod: AuthenticationMethod.Google,
      },
      { requiresPasswordChange: false },
    );
  });

  it('preserves first_login_pending and requests a password-change session', async () => {
    identityLinking.resolveAndRecordAuthentication.mockResolvedValue({
      principal: {
        email: 'person@example.com',
        id: 'user-1',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: 'role-1',
      },
      status: 'first_login_pending',
    });

    await authenticate.authenticate(validatedIdentity);

    expect(sessionIssuer.issue).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        authenticationMethod: AuthenticationMethod.Google,
      }),
      { requiresPasswordChange: true },
    );
  });

  it('does not issue a session until identity persistence has completed', async () => {
    let completePersistence: ((value: unknown) => void) | undefined;
    identityLinking.resolveAndRecordAuthentication.mockReturnValue(
      new Promise((resolve) => {
        completePersistence = resolve;
      }),
    );

    const authentication = authenticate.authenticate(validatedIdentity);
    await Promise.resolve();
    expect(sessionIssuer.issue).not.toHaveBeenCalled();

    completePersistence?.({
      principal: {
        email: 'person@example.com',
        id: 'user-1',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: 'role-1',
      },
      status: 'active',
    });
    await authentication;

    expect(sessionIssuer.issue).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new GoogleIdentityLinkingRejectedError(), 'ineligible_account'],
    [new GoogleIdentityLinkingPersistenceError(), 'authentication_failed'],
    [new Error('unexpected'), 'authentication_failed'],
  ])('maps linking failures to a safe OIDC error', async (error, category) => {
    identityLinking.resolveAndRecordAuthentication.mockRejectedValue(error);

    await expect(
      authenticate.authenticate(validatedIdentity),
    ).rejects.toMatchObject({
      category,
      response: { error: category },
    });
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });
});
