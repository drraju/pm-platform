import { JwtService } from '@nestjs/jwt';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticationMethod } from '../authentication-method';
import { JwtConfiguration } from '../jwt-configuration';
import { PmSessionIssuer } from '../pm-session-issuer.service';

const jwtConfiguration: JwtConfiguration = {
  accessAudience: 'pm-platform-api',
  accessExpiresIn: '15m',
  accessSecret: 'test-access-secret',
  algorithm: 'HS256',
  issuer: 'pm-platform',
  refreshAudience: 'pm-platform-refresh',
  refreshExpiresIn: '7d',
  refreshSecret: 'test-refresh-secret',
};

describe('PmSessionIssuer', () => {
  let issuer: PmSessionIssuer;
  let sign: jest.Mock<string, [Record<string, unknown>, object]>;

  beforeEach(() => {
    sign = jest.fn(({ tokenType }) => `${String(tokenType)}-token`);
    issuer = new PmSessionIssuer(
      { sign } as unknown as JwtService,
      jwtConfiguration,
    );
  });

  it('issues the normal HUMAN access and refresh pair with local provenance', () => {
    const session = issuer.issue(
      {
        email: 'user@example.com',
        id: 'user-1',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: UserRole.TeamMember,
      },
      {
        authenticatedAt: 1_788_519_600,
        authenticationMethod: AuthenticationMethod.Local,
      },
      { requiresPasswordChange: true },
    );

    expect(session).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresPasswordChange: true,
    });
    expect(sign).toHaveBeenNthCalledWith(
      1,
      {
        authenticatedAt: 1_788_519_600,
        authenticationMethod: AuthenticationMethod.Local,
        email: 'user@example.com',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      },
      {
        algorithm: 'HS256',
        audience: 'pm-platform-api',
        expiresIn: '15m',
        issuer: 'pm-platform',
        secret: 'test-access-secret',
      },
    );
    expect(sign).toHaveBeenNthCalledWith(
      2,
      {
        authenticatedAt: 1_788_519_600,
        authenticationMethod: AuthenticationMethod.Local,
        email: 'user@example.com',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'refresh',
      },
      {
        algorithm: 'HS256',
        audience: 'pm-platform-refresh',
        expiresIn: '7d',
        issuer: 'pm-platform',
        secret: 'test-refresh-secret',
      },
    );
  });

  it('preserves SERVICE identity and role claims with local provenance', () => {
    issuer.issue(
      {
        email: 'automation@example.com',
        id: 'service-1',
        identityType: UserIdentityType.Service,
        passwordChangedAt: new Date('2026-09-04T12:00:00.000Z'),
        roleId: UserRole.ServiceUser,
      },
      {
        authenticatedAt: 1_788_519_600,
        authenticationMethod: AuthenticationMethod.Local,
      },
    );

    expect(sign).toHaveBeenCalledTimes(2);
    expect(sign.mock.calls.map(([payload]) => payload)).toEqual([
      expect.objectContaining({
        authenticatedAt: 1_788_519_600,
        authenticationMethod: AuthenticationMethod.Local,
        identityType: UserIdentityType.Service,
        passwordChangedAt: '2026-09-04T12:00:00.000Z',
        roleId: UserRole.ServiceUser,
        tokenType: 'access',
      }),
      expect.objectContaining({
        authenticatedAt: 1_788_519_600,
        authenticationMethod: AuthenticationMethod.Local,
        identityType: UserIdentityType.Service,
        passwordChangedAt: '2026-09-04T12:00:00.000Z',
        roleId: UserRole.ServiceUser,
        tokenType: 'refresh',
      }),
    ]);
  });
});
