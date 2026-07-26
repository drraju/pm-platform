import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { Role } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';
import { PasswordPolicyService } from '../password-policy.service';
import { PasswordResetService } from '../password-reset.service';
import { PasswordUpdateService } from '../password-update.service';
import { PasswordService } from '../password.service';
import { JwtStrategy } from '../strategies/jwt.strategy';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('AuthService', () => {
  let service: AuthService;
  let passwordService: PasswordService;
  let usersService: {
    create: jest.Mock;
    findAuthenticationUserById: jest.Mock;
    findByEmail: jest.Mock;
    getSessionProfile: jest.Mock;
    updatePassword: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findAuthenticationUserById: jest.fn(),
      findByEmail: jest.fn(),
      getSessionProfile: jest.fn(),
      updatePassword: jest.fn(),
    };

    const rolesRepository: MockRepository<Role> = {
      create: jest.fn((input: Partial<Role>) => input),
      findOne: jest.fn().mockResolvedValue({ id: 'role-project-manager' }),
      save: jest.fn((input: Partial<Role>) =>
        Promise.resolve({ ...input, id: 'role-new' }),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        PasswordPolicyService,
        PasswordService,
        PasswordUpdateService,
        {
          provide: PasswordResetService,
          useValue: {
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'signed-token'),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: rolesRepository,
        },
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

  it('uses the centralized password service during registration and defaults to PROJECT_MANAGER', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      email: 'new@example.com',
      id: 'user-new',
      roleId: 'role-project-manager',
    });

    await service.register({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'ValidPass1!',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        roleId: 'role-project-manager',
      }),
    );
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
    const strategy = new JwtStrategy({
      findTokenValidationUser: jest.fn().mockResolvedValue({
        id: 'user-1',
        passwordChangedAt: new Date('2026-07-26T10:00:00.000Z'),
        status: 'active',
      }),
    } as unknown as UsersService);

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: Math.floor(new Date('2026-07-26T09:59:59.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts current active-user tokens', async () => {
    const strategy = new JwtStrategy({
      findTokenValidationUser: jest.fn().mockResolvedValue({
        id: 'user-1',
        passwordChangedAt: new Date('2026-07-26T10:00:00.000Z'),
        status: 'active',
      }),
    } as unknown as UsersService);

    await expect(
      strategy.validate({
        email: 'user@example.com',
        iat: Math.floor(new Date('2026-07-26T10:00:01.000Z').getTime() / 1000),
        roleId: UserRole.TeamMember,
        sub: 'user-1',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      roleId: UserRole.TeamMember,
      userId: 'user-1',
    });
  });
});
