import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
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
  algorithm: 'HS256',
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
  let signedPayloads: Array<Record<string, unknown>>;

  beforeEach(async () => {
    signedPayloads = [];
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
      sign: jest.fn((payload: { tokenType: string }) => {
        signedPayloads.push(payload);
        return `${payload.tokenType}-token`;
      }),
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

  it('preserves first-login behaviour for HUMAN sessions', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'new.user@example.com',
      id: 'user-new',
      identityType: UserIdentityType.Human,
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
      expect.objectContaining({
        identityType: UserIdentityType.Human,
        tokenType: 'access',
      }),
      expect.objectContaining({
        algorithm: 'HS256',
        secret: 'test-access-secret',
      }),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identityType: UserIdentityType.Human,
        tokenType: 'refresh',
      }),
      expect.objectContaining({
        algorithm: 'HS256',
        secret: 'test-refresh-secret',
      }),
    );
    expect(signedPayloads[0]).toHaveProperty(
      'identityType',
      UserIdentityType.Human,
    );
    expect(signedPayloads[1]).toHaveProperty(
      'identityType',
      UserIdentityType.Human,
    );
  });

  it('sources identityType from the database rather than login input', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      roleId: 'role-team-member',
      status: 'active',
    });

    await service.login({
      email: 'user@example.com',
      identityType: UserIdentityType.Service,
      password: 'ValidPass1!',
      roleId: 'role-service-user',
    } as never);

    expect(signedPayloads).toHaveLength(2);
    expect(signedPayloads).toEqual([
      expect.objectContaining({ identityType: UserIdentityType.Human }),
      expect.objectContaining({ identityType: UserIdentityType.Human }),
    ]);
  });

  it('authenticates a valid SERVICE_USER without project grants and ignores injected identity and role values', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'active',
    });

    await expect(
      service.login({
        email: 'automation@example.com',
        identityType: UserIdentityType.Human,
        password: 'ValidPass1!',
        roleId: 'role-platform-admin',
      } as never),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(signedPayloads).toEqual([
      expect.objectContaining({
        email: 'automation@example.com',
        identityType: UserIdentityType.Service,
        roleId: 'role-service-user',
        sub: 'service-1',
        tokenType: 'access',
      }),
      expect.objectContaining({
        email: 'automation@example.com',
        identityType: UserIdentityType.Service,
        roleId: 'role-service-user',
        sub: 'service-1',
        tokenType: 'refresh',
      }),
    ]);
    expect(usersService.recordLogin).toHaveBeenCalledWith('service-1');
  });

  it('rejects a SERVICE user with an incorrect password', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'active',
    });

    await expect(
      service.login({
        email: 'automation@example.com',
        password: 'WrongPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.recordLogin).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects an inactive SERVICE user through the existing account policy', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'disabled',
    });

    await expect(
      service.login({
        email: 'automation@example.com',
        password: 'ValidPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects first-login-pending for a SERVICE user', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'first_login_pending',
    });

    await expect(
      service.login({
        email: 'automation@example.com',
        password: 'ValidPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it.each([UserRole.PlatformAdmin, UserRole.ProjectManager, 'ANOMALOUS_ROLE'])(
    'rejects a SERVICE user with global role %s',
    async (roleName) => {
      usersService.findByEmail.mockResolvedValue({
        email: 'automation@example.com',
        id: 'service-1',
        identityType: UserIdentityType.Service,
        passwordHash: await passwordService.hashPassword('ValidPass1!'),
        role: { name: roleName },
        roleId: `role-${roleName}`,
        status: 'active',
      });

      await expect(
        service.login({
          email: 'automation@example.com',
          password: 'ValidPass1!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(usersService.recordLogin).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    },
  );

  it('rejects a SERVICE user whose global role is missing', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      role: null,
      roleId: 'missing-role',
      status: 'active',
    });

    await expect(
      service.login({
        email: 'automation@example.com',
        password: 'ValidPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.recordLogin).not.toHaveBeenCalled();
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects a HUMAN user assigned to SERVICE_USER', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'invalid-human@example.com',
      id: 'human-1',
      identityType: UserIdentityType.Human,
      passwordHash: await passwordService.hashPassword('ValidPass1!'),
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'active',
    });

    await expect(
      service.login({
        email: 'invalid-human@example.com',
        password: 'ValidPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('preserves generic rejection for an unknown login identity', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'ValidPass1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects an access token at the refresh boundary', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      identityType: UserIdentityType.Human,
      iat: 1,
      roleId: 'role-1',
      sub: 'user-1',
      tokenType: 'access',
    });

    await expect(service.refresh('access-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({ algorithms: ['HS256'] }),
    );
  });

  it('rejects a refresh token after the user role changes', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      identityType: UserIdentityType.Human,
      iat: 1,
      roleId: 'old-role',
      sub: 'user-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
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
      identityType: UserIdentityType.Human,
      iat: 1,
      roleId: 'role-1',
      sub: 'user-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordChangedAt: null,
      roleId: 'role-1',
      status: 'disabled',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects refresh tokens when identityType differs from the database', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      identityType: UserIdentityType.Service,
      iat: 1,
      roleId: 'role-team-member',
      sub: 'user-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordChangedAt: null,
      roleId: 'role-team-member',
      status: 'active',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects legacy refresh tokens without identityType', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      iat: 1,
      roleId: 'role-team-member',
      sub: 'user-1',
      tokenType: 'refresh',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersService.findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('issues refreshed tokens with the current database identityType', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'user@example.com',
      identityType: UserIdentityType.Human,
      iat: 1,
      roleId: 'role-team-member',
      sub: 'user-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      identityType: UserIdentityType.Human,
      passwordChangedAt: null,
      roleId: 'role-team-member',
      status: 'active',
    });

    await service.refresh('refresh-token');

    expect(signedPayloads).toEqual([
      expect.objectContaining({ identityType: UserIdentityType.Human }),
      expect.objectContaining({ identityType: UserIdentityType.Human }),
    ]);
  });

  it('refreshes a valid SERVICE_USER session with SERVICE identity claims', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'automation@example.com',
      identityType: UserIdentityType.Service,
      iat: 1,
      passwordChangedAt: null,
      roleId: 'role-service-user',
      sub: 'service-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordChangedAt: null,
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'active',
    });

    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(signedPayloads).toEqual([
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: 'role-service-user',
        tokenType: 'access',
      }),
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: 'role-service-user',
        tokenType: 'refresh',
      }),
    ]);
  });

  it('rejects SERVICE refresh after the database role changes away from SERVICE_USER', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'automation@example.com',
      identityType: UserIdentityType.Service,
      iat: 1,
      roleId: 'role-service-user',
      sub: 'service-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordChangedAt: null,
      role: { name: UserRole.TeamMember },
      roleId: 'role-team-member',
      status: 'active',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects HUMAN refresh when the database role is SERVICE_USER', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'invalid-human@example.com',
      identityType: UserIdentityType.Human,
      iat: 1,
      roleId: 'role-service-user',
      sub: 'human-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'invalid-human@example.com',
      id: 'human-1',
      identityType: UserIdentityType.Human,
      passwordChangedAt: null,
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'active',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects SERVICE refresh while first-login-pending', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      email: 'automation@example.com',
      identityType: UserIdentityType.Service,
      iat: 1,
      roleId: 'role-service-user',
      sub: 'service-1',
      tokenType: 'refresh',
    });
    usersService.findTokenValidationUser.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      passwordChangedAt: null,
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'first_login_pending',
    });

    await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it.each([UserRole.TeamMember, 'ANOMALOUS_ROLE', null])(
    'rejects SERVICE refresh when the database role is %s',
    async (roleName) => {
      jwtService.verifyAsync.mockResolvedValue({
        email: 'automation@example.com',
        identityType: UserIdentityType.Service,
        iat: 1,
        roleId: 'current-role',
        sub: 'service-1',
        tokenType: 'refresh',
      });
      usersService.findTokenValidationUser.mockResolvedValue({
        email: 'automation@example.com',
        id: 'service-1',
        identityType: UserIdentityType.Service,
        passwordChangedAt: null,
        role: roleName ? { name: roleName } : null,
        roleId: 'current-role',
        status: 'active',
      });

      await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    },
  );

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
      identityType: UserIdentityType.Human,
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
      identityType: UserIdentityType.Human,
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

  it('does not issue human password-reset tokens for SERVICE accounts', async () => {
    usersService.findByEmail.mockResolvedValue({
      email: 'automation@example.com',
      id: 'service-1',
      identityType: UserIdentityType.Service,
      role: { name: UserRole.ServiceUser },
      roleId: 'role-service-user',
      status: 'active',
    });

    await expect(
      service.forgotPassword({ email: 'automation@example.com' }),
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
          identityType: UserIdentityType.Human,
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
        identityType: UserIdentityType.Human,
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
          identityType: UserIdentityType.Human,
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
        identityType: UserIdentityType.Human,
        iat: Math.floor(new Date('2026-07-26T10:00:01.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      identityType: UserIdentityType.Human,
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
          identityType: UserIdentityType.Human,
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
        identityType: UserIdentityType.Human,
        iat: Math.floor(new Date('2026-07-26T10:00:01.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      identityType: UserIdentityType.Human,
      roleId: UserRole.TeamMember,
      userId: 'user-1',
    });
  });

  it('rejects SERVICE access tokens while first-login-pending', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          email: 'automation@example.com',
          id: 'service-1',
          identityType: UserIdentityType.Service,
          passwordChangedAt: null,
          role: { name: UserRole.ServiceUser },
          roleId: UserRole.ServiceUser,
          status: 'first_login_pending',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'automation@example.com',
        identityType: UserIdentityType.Service,
        iat: 1,
        roleId: UserRole.ServiceUser,
        sub: 'service-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects HUMAN access tokens when the database role is SERVICE_USER', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          email: 'invalid-human@example.com',
          id: 'human-1',
          identityType: UserIdentityType.Human,
          passwordChangedAt: null,
          role: { name: UserRole.ServiceUser },
          roleId: UserRole.ServiceUser,
          status: 'active',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'invalid-human@example.com',
        identityType: UserIdentityType.Human,
        iat: 1,
        roleId: UserRole.ServiceUser,
        sub: 'human-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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
        identityType: UserIdentityType.Human,
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
          identityType: UserIdentityType.Human,
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
        identityType: UserIdentityType.Human,
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
          identityType: UserIdentityType.Human,
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
        identityType: UserIdentityType.Human,
        iat: 1,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    [UserIdentityType.Human, UserIdentityType.Service],
    [UserIdentityType.Service, UserIdentityType.Human],
  ])(
    'rejects token identityType %s when the database identityType is %s',
    async (tokenIdentityType, databaseIdentityType) => {
      const strategy = new JwtStrategy(
        {
          findTokenValidationUser: jest.fn().mockResolvedValue({
            email: 'user@example.com',
            id: 'user-1',
            identityType: databaseIdentityType,
            passwordChangedAt: null,
            roleId: UserRole.TeamMember,
            status: 'active',
          }),
        } as unknown as UsersService,
        jwtConfiguration,
      );

      await expect(
        strategy.validate({
          email: 'user@example.com',
          identityType: tokenIdentityType,
          iat: 1,
          roleId: UserRole.TeamMember,
          sub: 'user-1',
          tokenType: 'access',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejects legacy access tokens without identityType', async () => {
    const findTokenValidationUser = jest.fn();
    const strategy = new JwtStrategy(
      { findTokenValidationUser } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: 1,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findTokenValidationUser).not.toHaveBeenCalled();
  });

  it('rejects an access token after the user email changes', async () => {
    const strategy = new JwtStrategy(
      {
        findTokenValidationUser: jest.fn().mockResolvedValue({
          email: 'new-email@example.com',
          id: 'user-1',
          identityType: UserIdentityType.Human,
          passwordChangedAt: null,
          roleId: UserRole.TeamMember,
          status: 'active',
        }),
      } as unknown as UsersService,
      jwtConfiguration,
    );

    await expect(
      strategy.validate({
        email: 'old-email@example.com',
        identityType: UserIdentityType.Human,
        iat: 1,
        roleId: UserRole.TeamMember,
        sub: 'user-1',
        tokenType: 'access',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
