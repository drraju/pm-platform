import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { PasswordPolicyService } from '../password-policy.service';
import { PasswordResetTokenService } from '../password-reset-token.service';
import { PasswordUpdateService } from '../password-update.service';
import { PasswordService } from '../password.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtConfiguration, JWT_CONFIGURATION } from '../jwt-configuration';

const jwtConfiguration: JwtConfiguration = {
  accessAudience: 'pm-platform-api',
  accessExpiresIn: '15m',
  accessSecret: 'test-access-secret',
  issuer: 'pm-platform',
  refreshAudience: 'pm-platform-refresh',
  refreshExpiresIn: '7d',
  refreshSecret: 'test-refresh-secret',
};

describe('AuthService', () => {
  let service: AuthService;
  let passwordService: PasswordService;
  let passwordResetTokenService: {
    consumeToken: jest.Mock;
    issueToken: jest.Mock;
    validateToken: jest.Mock;
  };
  let usersService: {
    create: jest.Mock;
    findAuthenticationUserById: jest.Mock;
    findByEmail: jest.Mock;
    findTokenValidationUser: jest.Mock;
    getSessionProfile: jest.Mock;
    recordLogin: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findAuthenticationUserById: jest.fn(),
      findByEmail: jest.fn(),
      findTokenValidationUser: jest.fn(),
      getSessionProfile: jest.fn(),
      recordLogin: jest.fn(),
      updatePassword: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(
        (payload: { tokenType: string }) => `${payload.tokenType}-token`,
      ),
      verifyAsync: jest.fn(),
    };
    passwordResetTokenService = {
      consumeToken: jest.fn(),
      issueToken: jest.fn(),
      validateToken: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordPolicyService,
        PasswordService,
        PasswordUpdateService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: PasswordResetTokenService,
          useValue: passwordResetTokenService,
        },
        { provide: JWT_CONFIGURATION, useValue: jwtConfiguration },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    passwordService = moduleRef.get(PasswordService);
  });

  it('changes a password and records a new password hash timestamp', async () => {
    const passwordHash = await passwordService.hashPassword('OldPass1!');
    usersService.findAuthenticationUserById.mockResolvedValue({
      id: 'user-1',
      passwordHash,
    } satisfies Partial<User>);

    await expect(
      service.changePassword('user-1', {
        confirmPassword: 'NewPass1!',
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      }),
    ).resolves.toEqual({
      message: 'Password changed successfully. Please sign in again.',
      requiresLogin: true,
      success: true,
    });

    expect(usersService.updatePassword).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.any(Date),
      'active',
    );
    const [, savedHash] = usersService.updatePassword.mock.calls[0] as [
      string,
      string,
    ];
    await expect(
      passwordService.verifyPassword('NewPass1!', savedHash),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect current password with a generic authentication error', async () => {
    usersService.findAuthenticationUserById.mockResolvedValue({
      id: 'user-1',
      passwordHash: await passwordService.hashPassword('OldPass1!'),
    } satisfies Partial<User>);

    await expect(
      service.changePassword('user-1', {
        confirmPassword: 'NewPass1!',
        currentPassword: 'WrongPass1!',
        newPassword: 'NewPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.updatePassword).not.toHaveBeenCalled();
  });

  it('rejects passwords that do not meet the centralized policy', async () => {
    await expect(
      service.changePassword('user-1', {
        confirmPassword: 'short',
        currentPassword: 'OldPass1!',
        newPassword: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.findAuthenticationUserById).not.toHaveBeenCalled();
  });

  it('rejects mismatched confirmation values', async () => {
    await expect(
      service.changePassword('user-1', {
        confirmPassword: 'NewPass2!',
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reuse of the current password', async () => {
    usersService.findAuthenticationUserById.mockResolvedValue({
      id: 'user-1',
      passwordHash: await passwordService.hashPassword('OldPass1!'),
    } satisfies Partial<User>);

    await expect(
      service.changePassword('user-1', {
        confirmPassword: 'OldPass1!',
        currentPassword: 'OldPass1!',
        newPassword: 'OldPass1!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks first-login-pending sessions for forced password change', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'new.user@example.com',
      id: 'user-new',
      passwordHash: await passwordService.hashPassword('TempPass1!'),
      roleId: 'role-team-member',
      status: 'first_login_pending',
    });

    await expect(
      service.login({ email: 'new.user@example.com', password: 'TempPass1!' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      requiresPasswordChange: true,
    });
    expect(usersService.recordLogin).toHaveBeenCalledWith('user-new');
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tokenType: 'access' }),
      expect.objectContaining({ secret: 'test-access-secret' }),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tokenType: 'refresh' }),
      expect.objectContaining({ secret: 'test-refresh-secret' }),
    );
  });

  it('rejects an access token at the refresh boundary', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      iat: 1,
      roleId: 'role-1',
      sub: 'user-1',
      tokenType: 'access',
    });

    await expect(service.refresh('access-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects a refresh token after the user role changes', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      iat: 1,
      roleId: 'old-role',
      sub: 'user-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      passwordChangedAt: null,
      roleId: 'new-role',
      status: 'active',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a refresh token after the account is disabled', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      iat: 1,
      roleId: 'role-1',
      sub: 'user-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      passwordChangedAt: null,
      roleId: 'role-1',
      status: 'disabled',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects disabled users during authentication', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'disabled@example.com',
      id: 'user-disabled',
      passwordHash: await passwordService.hashPassword('TempPass1!'),
      roleId: 'role-team-member',
      status: 'disabled',
    });

    await expect(
      service.login({ email: 'disabled@example.com', password: 'TempPass1!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns a generic forgot password response for unknown accounts', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.forgotPassword({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message:
        'If an account exists for that email, password reset instructions will be sent.',
      success: true,
    });
    expect(passwordResetTokenService.issueToken).not.toHaveBeenCalled();
  });

  it('issues a reset token for eligible accounts without exposing it', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'active@example.com',
      id: 'user-active',
      passwordHash: await passwordService.hashPassword('OldPass1!'),
      roleId: 'role-team-member',
      status: 'active',
    });
    passwordResetTokenService.issueToken.mockResolvedValue({
      expiresAt: new Date('2026-07-26T10:30:00.000Z'),
      token: 'raw-token',
    });

    await expect(
      service.forgotPassword(
        { email: 'active@example.com' },
        { ipAddress: '127.0.0.1' },
      ),
    ).resolves.toEqual({
      message:
        'If an account exists for that email, password reset instructions will be sent.',
      success: true,
    });
    expect(passwordResetTokenService.issueToken).toHaveBeenCalledWith(
      'user-active',
      '127.0.0.1',
    );
  });

  it('does not issue reset tokens for disabled accounts', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'disabled@example.com',
      id: 'user-disabled',
      passwordHash: await passwordService.hashPassword('OldPass1!'),
      roleId: 'role-team-member',
      status: 'disabled',
    });

    await expect(
      service.forgotPassword({ email: 'disabled@example.com' }),
    ).resolves.toEqual({
      message:
        'If an account exists for that email, password reset instructions will be sent.',
      success: true,
    });
    expect(passwordResetTokenService.issueToken).not.toHaveBeenCalled();
  });

  it('resets a password with a valid single-use token', async () => {
    usersService.findAuthenticationUserById.mockResolvedValue({
      id: 'user-1',
      passwordHash: await passwordService.hashPassword('OldPass1!'),
    } satisfies Partial<User>);
    passwordResetTokenService.validateToken.mockResolvedValue({
      id: 'reset-token-1',
      userId: 'user-1',
    });

    await expect(
      service.resetPassword({
        confirmPassword: 'NewPass1!',
        newPassword: 'NewPass1!',
        token: 'raw-token',
      }),
    ).resolves.toEqual({
      message: 'Password reset successfully. Please sign in.',
      success: true,
    });
    expect(passwordResetTokenService.validateToken).toHaveBeenCalledWith(
      'raw-token',
    );
    expect(passwordResetTokenService.consumeToken).toHaveBeenCalledWith(
      'reset-token-1',
    );
    expect(usersService.updatePassword).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.any(Date),
      'active',
    );
  });

  it('rejects invalid reset tokens without updating passwords', async () => {
    passwordResetTokenService.validateToken.mockRejectedValue(
      new UnauthorizedException('Invalid or expired password reset token'),
    );

    await expect(
      service.resetPassword({
        confirmPassword: 'NewPass1!',
        newPassword: 'NewPass1!',
        token: 'bad-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.updatePassword).not.toHaveBeenCalled();
    expect(passwordResetTokenService.consumeToken).not.toHaveBeenCalled();
  });
});

describe('PasswordPolicyService', () => {
  let policy: PasswordPolicyService;

  beforeEach(() => {
    policy = new PasswordPolicyService();
  });

  it('accepts passwords that meet the default enterprise policy', () => {
    expect(policy.validate('ValidPass1!')).toEqual({ errors: [], valid: true });
  });

  it('rejects whitespace-only and weak passwords', () => {
    expect(policy.validate('        ').valid).toBe(false);
    expect(policy.validate('lowercase1!').errors).toContain(
      'New password must include an uppercase letter',
    );
    expect(policy.validate('NoNumber!').errors).toContain(
      'New password must include a number',
    );
  });
});

describe('JwtStrategy', () => {
  it('rejects tokens issued before the latest password change', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.com',
          passwordChangedAt: new Date('2026-07-26T10:00:00.000Z'),
          roleId: UserRole.TeamMember,
          status: 'active',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: Math.floor(new Date('2026-07-26T09:59:59.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts current active-user tokens', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.com',
          passwordChangedAt: new Date('2026-07-26T10:00:00.000Z'),
          roleId: UserRole.TeamMember,
          status: 'active',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: Math.floor(new Date('2026-07-26T10:00:01.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      roleId: UserRole.TeamMember,
      userId: 'user-1',
    });
  });

  it('accepts first-login-pending tokens for forced password change', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@example.com',
          passwordChangedAt: null,
          roleId: UserRole.TeamMember,
          status: 'first_login_pending',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: Math.floor(new Date('2026-07-26T10:00:01.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      roleId: UserRole.TeamMember,
      userId: 'user-1',
    });
  });

  it('rejects refresh tokens presented as bearer access tokens', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn(),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: 1,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'refresh',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an access token after the user role changes', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          email: 'user@example.com',
          id: 'user-1',
          passwordChangedAt: null,
          roleId: UserRole.ProjectManager,
          status: 'active',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: 1,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an access token after the account is disabled', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          email: 'user@example.com',
          id: 'user-1',
          passwordChangedAt: null,
          roleId: UserRole.TeamMember,
          status: 'disabled',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: 1,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
