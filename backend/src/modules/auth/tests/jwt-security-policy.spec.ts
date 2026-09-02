import { UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { JwtConfiguration } from '../jwt-configuration';
import { PasswordResetTokenService } from '../password-reset-token.service';
import { PasswordUpdateService } from '../password-update.service';
import { PasswordService } from '../password.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

const jwtConfiguration: JwtConfiguration = {
  accessAudience: 'pm-platform-api',
  accessExpiresIn: '15m',
  accessSecret: 'access-secret-with-at-least-32-bytes',
  algorithm: 'HS256',
  issuer: 'pm-platform',
  refreshAudience: 'pm-platform-refresh',
  refreshExpiresIn: '7d',
  refreshSecret: 'refresh-secret-with-at-least-32-bytes',
};

describe('JWT security policy', () => {
  let jwtService: JwtService;
  let passwordService: PasswordService;
  let usersService: {
    findByEmail: jest.Mock;
    findTokenValidationUser: jest.Mock;
    recordLogin: jest.Mock;
  };
  let authService: AuthService;

  beforeEach(() => {
    jwtService = new JwtService();
    passwordService = new PasswordService();
    usersService = {
      findByEmail: jest.fn(),
      findTokenValidationUser: jest.fn(),
      recordLogin: jest.fn(),
    };
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
      passwordService,
      {} as PasswordResetTokenService,
      {} as PasswordUpdateService,
      jwtConfiguration,
    );
  });

  it('issues HS256 HUMAN access and refresh tokens with existing TTL semantics', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      roleId: UserRole.TeamMember,
      status: 'active',
    });

    const session = await authService.login({
      email: 'user@example.com',
      password: 'ValidPass1!',
    });
    const access = jwtService.decode(session.accessToken, { complete: true });
    const refresh = jwtService.decode(session.refreshToken, { complete: true });

    expect(access?.header.alg).toBe('HS256');
    expect(refresh?.header.alg).toBe('HS256');
    expect(access?.payload).toEqual(
      expect.objectContaining({
        aud: 'pm-platform-api',
        email: 'user@example.com',
        identityType: UserIdentityType.Human,
        iss: 'pm-platform',
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    );
    expect(refresh?.payload).toEqual(
      expect.objectContaining({
        aud: 'pm-platform-refresh',
        identityType: UserIdentityType.Human,
        iss: 'pm-platform',
        tokenType: 'refresh',
      }),
    );
    expect(tokenLifetime(access?.payload)).toBe(15 * 60);
    expect(tokenLifetime(refresh?.payload)).toBe(7 * 24 * 60 * 60);
  });

  it('authenticates and refreshes SERVICE_USER tokens with SERVICE request context', async () => {
    const databaseUser = {
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordChangedAt: null,
      role: { name: UserRole.ServiceUser },
      roleId: UserRole.ServiceUser,
      status: 'active',
    };
    usersService.findByEmail.mockResolvedValue({
      ...databaseUser,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
    });
    usersService.findTokenValidationUser.mockResolvedValue(databaseUser);

    const session = await authService.login({
      email: 'automation@example.com',
      password: 'ValidPass1!',
    });
    const access = jwtService.decode(session.accessToken);
    const refresh = jwtService.decode(session.refreshToken);

    expect(access).toEqual(
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: UserRole.ServiceUser,
        tokenType: 'access',
      }),
    );
    expect(refresh).toEqual(
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: UserRole.ServiceUser,
        tokenType: 'refresh',
      }),
    );

    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );
    await expect(authenticate(strategy, session.accessToken)).resolves.toEqual({
      email: 'automation@example.com',
      identityType: UserIdentityType.Service,
      roleId: UserRole.ServiceUser,
      userId: 'service-1',
    });

    const refreshedSession = await authService.refresh(session.refreshToken);
    expect(jwtService.decode(refreshedSession.accessToken)).toEqual(
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: UserRole.ServiceUser,
        tokenType: 'access',
      }),
    );
    expect(jwtService.decode(refreshedSession.refreshToken)).toEqual(
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: UserRole.ServiceUser,
        tokenType: 'refresh',
      }),
    );
  });

  it('rejects a non-HS256 refresh token through the actual refresh verifier', async () => {
    const token = jwtService.sign(
      {
        email: 'user@example.com',
        identityType: UserIdentityType.Human,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'refresh',
      },
      {
        algorithm: 'HS384',
        audience: jwtConfiguration.refreshAudience,
        expiresIn: jwtConfiguration.refreshExpiresIn,
        issuer: jwtConfiguration.issuer,
        secret: jwtConfiguration.refreshSecret,
      },
    );

    await expect(authService.refresh(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects a non-HS256 access token through the actual passport strategy', async () => {
    const token = jwtService.sign(
      {
        email: 'user@example.com',
        identityType: UserIdentityType.Human,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      },
      {
        algorithm: 'HS384',
        audience: jwtConfiguration.accessAudience,
        expiresIn: jwtConfiguration.accessExpiresIn,
        issuer: jwtConfiguration.issuer,
        secret: jwtConfiguration.accessSecret,
      },
    );
    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(authenticate(strategy, token)).rejects.toBeDefined();
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it.each([
    [UserIdentityType.Service, UserIdentityType.Human],
    [UserIdentityType.Human, UserIdentityType.Service],
  ])(
    'rejects token identity %s for database identity %s',
    async (tokenIdentityType, databaseIdentityType) => {
      usersService.findTokenValidationUser.mockResolvedValue({
        email: 'user@example.com',
        id: 'user-1',
        identityType: databaseIdentityType,
        passwordChangedAt: null,
        roleId: UserRole.TeamMember,
        status: 'active',
      });
      const token = signAccessToken(jwtService, {
        identityType: tokenIdentityType,
      });
      const strategy = new JwtStrategy(
        usersService as unknown as UsersService,
        jwtConfiguration,
      );

      await expect(authenticate(strategy, token)).rejects.toBeDefined();
      expect(usersService.findTokenValidationUser).toHaveBeenCalledWith(
        'user-1',
      );
    },
  );

  it('accepts a matching identity and exposes it in request.user context', async () => {
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordChangedAt: null,
      roleId: UserRole.TeamMember,
      status: 'active',
    });
    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      authenticate(strategy, signAccessToken(jwtService)),
    ).resolves.toEqual({
      email: 'user@example.com',
      identityType: UserIdentityType.Human,
      roleId: UserRole.TeamMember,
      userId: 'user-1',
    });
  });

  it('rejects a correctly signed legacy access token without identityType', async () => {
    const token = jwtService.sign(
      {
        email: 'user@example.com',
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      },
      accessSignOptions(),
    );
    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(authenticate(strategy, token)).rejects.toBeDefined();
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects access tokens with the wrong issuer', async () => {
    const token = jwtService.sign(
      accessClaims(),
      accessSignOptions({ issuer: 'untrusted-issuer' }),
    );
    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(authenticate(strategy, token)).rejects.toBeDefined();
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects access tokens with the wrong audience', async () => {
    const token = jwtService.sign(
      accessClaims(),
      accessSignOptions({ audience: 'untrusted-audience' }),
    );
    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(authenticate(strategy, token)).rejects.toBeDefined();
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects expired access tokens', async () => {
    const token = jwtService.sign(
      accessClaims(),
      accessSignOptions({ expiresIn: -1 }),
    );
    const strategy = new JwtStrategy(
      usersService as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(authenticate(strategy, token)).rejects.toBeDefined();
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects a signed refresh token when identityType differs from the database', async () => {
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordChangedAt: null,
      roleId: UserRole.TeamMember,
      status: 'active',
    });
    const token = jwtService.sign(
      {
        ...accessClaims(),
        identityType: UserIdentityType.Service,
        tokenType: 'refresh',
      },
      {
        algorithm: jwtConfiguration.algorithm,
        audience: jwtConfiguration.refreshAudience,
        expiresIn: jwtConfiguration.refreshExpiresIn,
        issuer: jwtConfiguration.issuer,
        secret: jwtConfiguration.refreshSecret,
      },
    );

    await expect(authService.refresh(token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function accessClaims(
  overrides: Partial<{
    email: string;
    identityType: UserIdentityType;
    roleId: UserRole;
    sub: string;
    tokenType: 'access';
  }> = {},
) {
  return {
    email: 'user@example.com',
    identityType: UserIdentityType.Human,
    roleId: UserRole.TeamMember,
    sub: 'user-1',
    tokenType: 'access' as const,
    ...overrides,
  };
}

function accessSignOptions(
  overrides: Partial<JwtSignOptions> = {},
): JwtSignOptions {
  return {
    algorithm: jwtConfiguration.algorithm,
    audience: jwtConfiguration.accessAudience,
    expiresIn: jwtConfiguration.accessExpiresIn,
    issuer: jwtConfiguration.issuer,
    secret: jwtConfiguration.accessSecret,
    ...overrides,
  };
}

function signAccessToken(
  jwtService: JwtService,
  overrides: Parameters<typeof accessClaims>[0] = {},
): string {
  return jwtService.sign(accessClaims(overrides), accessSignOptions());
}

function tokenLifetime(payload: string | Record<string, unknown> | null) {
  if (!payload || typeof payload === 'string') {
    return null;
  }
  return Number(payload.exp) - Number(payload.iat);
}

function authenticate(strategy: JwtStrategy, token: string): Promise<unknown> {
  const passportStrategy = strategy as unknown as {
    authenticate(request: { headers: { authorization: string } }): void;
    error(error: Error): void;
    fail(challenge?: unknown): void;
    success(user: unknown): void;
  };

  return new Promise((resolve, reject) => {
    passportStrategy.success = resolve;
    passportStrategy.fail = (challenge) =>
      reject(challenge ?? new Error('Denied'));
    passportStrategy.error = reject;
    passportStrategy.authenticate({
      headers: { authorization: `Bearer ${token}` },
    });
  });
}
