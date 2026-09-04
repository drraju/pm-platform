/* eslint-disable @typescript-eslint/require-await */
import {
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticationMethod } from '../../auth/authentication-method';
import { AuthService } from '../../auth/auth.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { JwtConfiguration } from '../../auth/jwt-configuration';
import { PasswordPolicyService } from '../../auth/password-policy.service';
import { PasswordResetTokenService } from '../../auth/password-reset-token.service';
import { PasswordUpdateService } from '../../auth/password-update.service';
import { PasswordService } from '../../auth/password.service';
import { PmSessionIssuer } from '../../auth/pm-session-issuer.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { ServiceAccountAdministrationService } from '../service-account-administration.service';
import { UsersService } from '../users.service';

const jwtConfiguration: JwtConfiguration = {
  accessAudience: 'pm-platform-api',
  accessExpiresIn: '15m',
  accessSecret: 'test-access-secret-with-at-least-32-bytes',
  algorithm: 'HS256',
  issuer: 'pm-platform',
  refreshAudience: 'pm-platform-refresh',
  refreshExpiresIn: '7d',
  refreshSecret: 'test-refresh-secret-with-at-least-32-bytes',
};

const platformAdmin = {
  email: 'admin@example.com',
  roleId: 'role-platform-admin',
  userId: 'admin-1',
};

describe('service-account lifecycle security', () => {
  let administration: ServiceAccountAdministrationService;
  let authService: AuthService;
  let jwtService: JwtService;
  let passwordService: PasswordService;
  let passwordUpdateService: PasswordUpdateService;
  let strategy: JwtStrategy;
  let storedUser: User | null;
  let usersService: UsersService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-02T10:00:00.500Z'));
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    storedUser = null;

    const serviceRole = {
      id: 'role-service-user',
      name: UserRole.ServiceUser,
      permissions: [],
    } as unknown as Role;
    const platformAdminRole = {
      id: platformAdmin.roleId,
      name: UserRole.PlatformAdmin,
    } as Role;
    const teamMemberRole = {
      id: 'role-team-member',
      name: UserRole.TeamMember,
    } as Role;
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => storedUser),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    const usersRepository = {
      create: jest.fn((input: Partial<User>) => ({
        createdAt: new Date(),
        id: 'service-1',
        updatedAt: new Date(),
        ...input,
      })),
      createQueryBuilder: jest.fn(() => queryBuilder),
      find: jest.fn(async () => (storedUser ? [storedUser] : [])),
      findOne: jest.fn(async ({ where }: { where: { id?: string } }) =>
        storedUser && (!where.id || where.id === storedUser.id)
          ? storedUser
          : null,
      ),
      save: jest.fn(async (user: User) => {
        storedUser = user;
        return user;
      }),
      update: jest.fn(async (_criteria: unknown, update: Partial<User>) => {
        if (!storedUser) {
          return { affected: 0 };
        }
        Object.assign(storedUser, update);
        return { affected: 1 };
      }),
    };
    const rolesRepository = {
      findOne: jest.fn(
        async ({ where }: { where: { id?: string; name?: string } }) => {
          if (
            where.id === platformAdmin.roleId &&
            where.name === UserRole.PlatformAdmin
          ) {
            return platformAdminRole;
          }
          if (where.name === UserRole.ServiceUser) {
            return serviceRole;
          }
          if (where.id === teamMemberRole.id) {
            return teamMemberRole;
          }
          return null;
        },
      ),
    };

    usersService = new UsersService(
      usersRepository as unknown as Repository<User>,
      rolesRepository as unknown as Repository<Role>,
      { find: jest.fn() } as unknown as Repository<Permission>,
      { find: jest.fn() } as unknown as Repository<ProjectMember>,
      {} as AuthorizationPolicyService,
    );
    passwordService = new PasswordService();
    passwordUpdateService = new PasswordUpdateService(
      usersService,
      passwordService,
      new PasswordPolicyService(),
    );
    administration = new ServiceAccountAdministrationService(
      usersService,
      passwordUpdateService,
    );
    jwtService = new JwtService();
    authService = new AuthService(
      usersService,
      jwtService,
      passwordService,
      {} as PasswordResetTokenService,
      passwordUpdateService,
      new PmSessionIssuer(jwtService, jwtConfiguration),
      jwtConfiguration,
    );
    strategy = new JwtStrategy(usersService, jwtConfiguration);
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.useRealTimers();
  });

  it('creates disabled, rotates credentials, and never revives invalidated tokens', async () => {
    const initialPassword = 'InitialService1!';
    const rotatedPassword = 'RotatedService2!';
    const created = await administration.create(
      {
        email: 'analytics@example.com',
        firstName: 'Analytics',
        lastName: 'Extractor',
        password: initialPassword,
      },
      platformAdmin,
    );

    expect(created).toEqual(
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        roleId: 'role-service-user',
        status: 'disabled',
      }),
    );
    expect(created.role?.name).toBe(UserRole.ServiceUser);
    expect(JSON.stringify(created)).not.toContain(initialPassword);
    expect(JSON.stringify(created)).not.toContain('passwordHash');
    expect(storedUser?.passwordHash).not.toBe(initialPassword);
    await expect(
      passwordService.verifyPassword(
        initialPassword,
        storedUser?.passwordHash ?? '',
      ),
    ).resolves.toBe(true);
    await expect(administration.findAll(platformAdmin)).resolves.toEqual([
      expect.objectContaining({
        id: 'service-1',
        identityType: UserIdentityType.Service,
      }),
    ]);
    await expect(
      administration.findOne('service-1', platformAdmin),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'service-1',
        identityType: UserIdentityType.Service,
      }),
    );
    await expect(
      administration.update(
        'service-1',
        { firstName: 'Scheduled Analytics' },
        platformAdmin,
      ),
    ).resolves.toEqual(
      expect.objectContaining({ firstName: 'Scheduled Analytics' }),
    );
    await expect(
      usersService.update(
        'service-1',
        { lastName: 'Batch Extractor' },
        platformAdmin,
      ),
    ).resolves.toEqual(
      expect.objectContaining({ lastName: 'Batch Extractor' }),
    );
    await expect(
      passwordUpdateService.changeOwnPassword('service-1', {
        confirmPassword: 'SelfChanged3!',
        currentPassword: initialPassword,
        newPassword: 'SelfChanged3!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      passwordUpdateService.adminResetPassword('service-1', 'GenericReset4!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      usersService.update(
        'service-1',
        { status: 'first_login_pending' },
        platformAdmin,
      ),
    ).rejects.toThrow(
      'Service account lifecycle must use the dedicated administration API',
    );
    await expect(
      usersService.update(
        'service-1',
        { roleId: 'role-team-member' },
        platformAdmin,
      ),
    ).rejects.toThrow(
      'User identity type is incompatible with the selected role',
    );
    await expect(
      usersService.enable('service-1', platformAdmin),
    ).rejects.toThrow(
      'Service account lifecycle must use the dedicated administration API',
    );
    await expect(
      usersService.recordAdminPasswordReset('service-1', platformAdmin),
    ).rejects.toThrow(
      'Service account lifecycle must use the dedicated administration API',
    );
    await expect(
      usersService.remove('service-1', platformAdmin),
    ).rejects.toThrow(
      'Service account lifecycle must use the dedicated administration API',
    );
    await expect(
      authService.login({
        email: 'analytics@example.com',
        password: initialPassword,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await administration.enable('service-1', platformAdmin);
    const initialSession = await authService.login({
      email: 'analytics@example.com',
      password: initialPassword,
    });
    const sessionProfile = await authService.getMe('service-1');
    expect(sessionProfile.user.identityType).toBe(UserIdentityType.Service);
    const initialAccessPayload = decodeJwtPayload(
      jwtService,
      initialSession.accessToken,
    );
    expect(initialAccessPayload.authenticationMethod).toBe(
      AuthenticationMethod.Local,
    );
    expect(initialAccessPayload.authenticatedAt).toBe(
      Math.floor(Date.now() / 1000),
    );
    await expect(strategy.validate(initialAccessPayload)).resolves.toEqual(
      expect.objectContaining({ userId: 'service-1' }),
    );

    jest.setSystemTime(new Date('2026-09-02T10:00:02.500Z'));
    const rotated = await administration.rotateCredentials(
      'service-1',
      { newPassword: rotatedPassword },
      platformAdmin,
    );
    expect(rotated.status).toBe('active');
    await expect(
      authService.login({
        email: 'analytics@example.com',
        password: initialPassword,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      strategy.validate(initialAccessPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      authService.refresh(initialSession.refreshToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const rotatedSession = await authService.login({
      email: 'analytics@example.com',
      password: rotatedPassword,
    });
    const rotatedAccessPayload = decodeJwtPayload(
      jwtService,
      rotatedSession.accessToken,
    );
    await expect(strategy.validate(rotatedAccessPayload)).resolves.toEqual(
      expect.objectContaining({ userId: 'service-1' }),
    );

    jest.setSystemTime(new Date('2026-09-02T10:00:04.500Z'));
    await administration.disable('service-1', platformAdmin);
    expect(storedUser?.status).toBe('disabled');
    await expect(
      authService.login({
        email: 'analytics@example.com',
        password: rotatedPassword,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      strategy.validate(rotatedAccessPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      authService.refresh(rotatedSession.refreshToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const disableWatermark = storedUser?.passwordChangedAt;
    jest.setSystemTime(new Date('2026-09-02T10:00:06.500Z'));
    await administration.enable('service-1', platformAdmin);
    expect(storedUser?.passwordChangedAt).toEqual(disableWatermark);
    await expect(
      strategy.validate(rotatedAccessPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      authService.refresh(rotatedSession.refreshToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const reenabledSession = await authService.login({
      email: 'analytics@example.com',
      password: rotatedPassword,
    });
    expect(typeof reenabledSession.accessToken).toBe('string');
    expect(typeof reenabledSession.refreshToken).toBe('string');

    expect(created.accountHistory[0]?.action).toBe('ServiceAccountCreated');
    expect(storedUser?.accountHistory.map(({ action }) => action)).toEqual([
      'ServiceAccountCreated',
      'ServiceAccountMetadataUpdated',
      'ServiceAccountMetadataUpdated',
      'ServiceAccountEnabled',
      'ServiceAccountCredentialsRotated',
      'ServiceAccountDisabled',
      'ServiceAccountEnabled',
    ]);
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain(initialPassword);
    expect(logged).not.toContain(rotatedPassword);
    expect(logged).not.toContain(initialSession.accessToken);
    expect(logged).not.toContain(initialSession.refreshToken);
  });

  it('denies non-Platform-Admin service administration at the service boundary', async () => {
    await expect(
      administration.findAll({
        roleId: 'role-project-manager',
        userId: 'project-manager-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function decodeJwtPayload(jwtService: JwtService, token: string): JwtPayload {
  const decoded: unknown = jwtService.decode(token);
  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Expected a decoded JWT payload');
  }
  return decoded as JwtPayload;
}
