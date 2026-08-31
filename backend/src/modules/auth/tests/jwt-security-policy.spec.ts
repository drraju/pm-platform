import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

  it('issues HS256 access and refresh tokens with existing claim and TTL semantics', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
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
        iss: 'pm-platform',
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    );
    expect(refresh?.payload).toEqual(
      expect.objectContaining({
        aud: 'pm-platform-refresh',
        iss: 'pm-platform',
        tokenType: 'refresh',
      }),
    );
    expect(tokenLifetime(access?.payload)).toBe(15 * 60);
    expect(tokenLifetime(refresh?.payload)).toBe(7 * 24 * 60 * 60);
  });

  it('rejects a non-HS256 refresh token through the actual refresh verifier', async () => {
    const token = jwtService.sign(
      {
        email: 'user@example.com',
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
});

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
