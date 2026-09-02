/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ServiceAccountAdministrationService } from '../service-account-administration.service';
import { ServiceAccountsController } from '../service-accounts.controller';

type Actor = { email: string; roleId: string; userId: string };

const serviceAccountResponse = {
  accountHistory: [],
  createdAt: '2026-09-02T10:00:00.000Z',
  email: 'analytics@example.com',
  firstName: 'Analytics',
  id: 'service-1',
  identityType: UserIdentityType.Service,
  lastLoginAt: null,
  lastName: 'Extractor',
  role: {
    description: 'Machine-to-machine external API access',
    id: 'role-service-user',
    name: UserRole.ServiceUser,
    permissions: [],
  },
  roleId: 'role-service-user',
  status: 'disabled',
};

describe('service-account administration HTTP authorization', () => {
  let app: INestApplication;
  let serviceAccounts: Record<
    | 'create'
    | 'disable'
    | 'enable'
    | 'findAll'
    | 'findOne'
    | 'rotateCredentials'
    | 'update',
    jest.Mock
  >;

  beforeEach(async () => {
    serviceAccounts = {
      create: jest.fn().mockResolvedValue(serviceAccountResponse),
      disable: jest.fn().mockResolvedValue(serviceAccountResponse),
      enable: jest.fn().mockResolvedValue({
        ...serviceAccountResponse,
        status: 'active',
      }),
      findAll: jest.fn().mockResolvedValue([serviceAccountResponse]),
      findOne: jest.fn().mockResolvedValue(serviceAccountResponse),
      rotateCredentials: jest.fn().mockResolvedValue(serviceAccountResponse),
      update: jest.fn().mockResolvedValue(serviceAccountResponse),
    };
    const policy = {
      getGrantedPermissionKeys: jest
        .fn()
        .mockResolvedValue(new Set([PermissionKey.UserManage])),
      isPlatformAdministrator: jest.fn(
        async (actor: Actor) => actor.roleId === String(UserRole.PlatformAdmin),
      ),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ServiceAccountsController],
      providers: [
        PermissionsGuard,
        { provide: AuthorizationPolicyService, useValue: policy },
        {
          provide: ServiceAccountAdministrationService,
          useValue: serviceAccounts,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: Actor;
          }>();
          if (!httpRequest.headers.authorization) {
            throw new UnauthorizedException();
          }
          httpRequest.user = {
            email: 'actor@example.com',
            roleId: httpRequest.headers['x-global-role'] ?? UserRole.TeamMember,
            userId: httpRequest.headers['x-user-id'] ?? 'actor-1',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => app.close());

  it('allows Platform Admin creation without returning credentials', async () => {
    const password = 'InitialService1!';
    const response = await request(app.getHttpServer())
      .post('/users/service-accounts')
      .set(asActor(UserRole.PlatformAdmin, 'admin-1'))
      .send({
        email: 'analytics@example.com',
        firstName: 'Analytics',
        lastName: 'Extractor',
        password,
      })
      .expect(201);

    expect(serviceAccounts.create).toHaveBeenCalledWith(
      {
        email: 'analytics@example.com',
        firstName: 'Analytics',
        lastName: 'Extractor',
        password,
      },
      platformAdminActor(),
    );
    expect(response.body).toEqual(serviceAccountResponse);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it.each([
    { identityType: UserIdentityType.Human },
    { roleId: 'role-platform-admin' },
    { status: 'active' },
  ])('rejects client-controlled lifecycle fields: %o', async (injected) => {
    await request(app.getHttpServer())
      .post('/users/service-accounts')
      .set(asActor(UserRole.PlatformAdmin, 'admin-1'))
      .send({
        email: 'analytics@example.com',
        firstName: 'Analytics',
        lastName: 'Extractor',
        password: 'InitialService1!',
        ...injected,
      })
      .expect(400);

    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it.each([
    { identityType: UserIdentityType.Human },
    { roleId: 'role-platform-admin' },
    { status: 'first_login_pending' },
    { password: 'BackdoorCredential5!' },
  ])('rejects unsafe fields from metadata updates: %o', async (injected) => {
    await request(app.getHttpServer())
      .patch('/users/service-accounts/service-1')
      .set(asActor(UserRole.PlatformAdmin, 'admin-1'))
      .send({ firstName: 'Analytics', ...injected })
      .expect(400);

    expect(serviceAccounts.update).not.toHaveBeenCalled();
  });

  it('denies non-Platform-Admin actors before invoking the service', async () => {
    await request(app.getHttpServer())
      .get('/users/service-accounts')
      .set(asActor(UserRole.ProjectManager, 'project-manager-1'))
      .expect(403);

    expect(serviceAccounts.findAll).not.toHaveBeenCalled();
  });

  it('exposes only the dedicated minimum lifecycle operations', async () => {
    const headers = asActor(UserRole.PlatformAdmin, 'admin-1');
    await request(app.getHttpServer())
      .get('/users/service-accounts')
      .set(headers)
      .expect(200);
    await request(app.getHttpServer())
      .get('/users/service-accounts/service-1')
      .set(headers)
      .expect(200);
    await request(app.getHttpServer())
      .patch('/users/service-accounts/service-1')
      .set(headers)
      .send({ firstName: 'Scheduled Analytics' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/users/service-accounts/service-1/rotate-credentials')
      .set(headers)
      .send({ newPassword: 'RotatedService2!' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/users/service-accounts/service-1/enable')
      .set(headers)
      .expect(200);
    await request(app.getHttpServer())
      .post('/users/service-accounts/service-1/disable')
      .set(headers)
      .expect(200);
    await request(app.getHttpServer())
      .delete('/users/service-accounts/service-1')
      .set(headers)
      .expect(404);

    expect(serviceAccounts.findAll).toHaveBeenCalledWith(platformAdminActor());
    expect(serviceAccounts.findOne).toHaveBeenCalledWith(
      'service-1',
      platformAdminActor(),
    );
    expect(serviceAccounts.update).toHaveBeenCalledWith(
      'service-1',
      { firstName: 'Scheduled Analytics' },
      platformAdminActor(),
    );
    expect(serviceAccounts.rotateCredentials).toHaveBeenCalledWith(
      'service-1',
      { newPassword: 'RotatedService2!' },
      platformAdminActor(),
      expect.objectContaining({}),
    );
    expect(serviceAccounts.enable).toHaveBeenCalledWith(
      'service-1',
      platformAdminActor(),
    );
    expect(serviceAccounts.disable).toHaveBeenCalledWith(
      'service-1',
      platformAdminActor(),
    );
  });
});

function asActor(role: UserRole, userId: string) {
  return {
    Authorization: 'Bearer test-token',
    'X-Global-Role': role,
    'X-User-Id': userId,
  };
}

function platformAdminActor() {
  return {
    email: 'actor@example.com',
    roleId: UserRole.PlatformAdmin,
    userId: 'admin-1',
  };
}
