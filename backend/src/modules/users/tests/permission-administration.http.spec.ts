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
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PasswordUpdateService } from '../../auth/password-update.service';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

type Actor = { email: string; roleId: string; userId: string };

describe('Permission administration HTTP authorization', () => {
  let app: INestApplication;
  let updateRolePermissions: jest.Mock;

  beforeEach(async () => {
    updateRolePermissions = jest.fn().mockResolvedValue({
      description: null,
      id: 'role-target',
      name: UserRole.TeamMember,
      permissions: [],
    });
    const policy = {
      isPlatformAdministrator: jest.fn(
        async (actor: Actor) => actor.roleId === UserRole.PlatformAdmin,
      ),
      getGrantedPermissionKeys: jest
        .fn()
        .mockResolvedValue(new Set([PermissionKey.PermissionManage])),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        PermissionsGuard,
        { provide: AuthorizationPolicyService, useValue: policy },
        {
          provide: UsersService,
          useValue: { updateRolePermissions },
        },
        { provide: PasswordUpdateService, useValue: {} },
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

  it('allows a Platform Admin with permission.manage', async () => {
    await request(app.getHttpServer())
      .patch('/users/roles/role-target/permissions')
      .set(asActor(UserRole.PlatformAdmin, 'admin-1'))
      .send({ permissionKeys: [PermissionKey.ProjectRead] })
      .expect(200);

    expect(updateRolePermissions).toHaveBeenCalledWith(
      'role-target',
      { permissionKeys: [PermissionKey.ProjectRead] },
      {
        email: 'actor@example.com',
        roleId: UserRole.PlatformAdmin,
        userId: 'admin-1',
      },
    );
  });

  it.each([
    UserRole.Executive,
    UserRole.PortfolioManager,
    UserRole.ProjectManager,
    UserRole.TeamMember,
    UserRole.Customer,
    UserRole.Partner,
    UserRole.ServiceUser,
  ])('denies %s even when permission.manage is granted', async (roleName) => {
    await request(app.getHttpServer())
      .patch('/users/roles/role-target/permissions')
      .set(asActor(roleName, 'non-admin-1'))
      .send({ permissionKeys: [PermissionKey.ProjectRead] })
      .expect(403);

    expect(updateRolePermissions).not.toHaveBeenCalled();
  });

  it('denies Executive self-escalation before invoking the service', async () => {
    await request(app.getHttpServer())
      .patch(`/users/roles/${UserRole.Executive}/permissions`)
      .set(asActor(UserRole.Executive, 'executive-1'))
      .send({ permissionKeys: Object.values(PermissionKey) })
      .expect(403);

    expect(updateRolePermissions).not.toHaveBeenCalled();
  });

  it('denies a non-admin attempt to change another role', async () => {
    await request(app.getHttpServer())
      .patch(`/users/roles/${UserRole.PlatformAdmin}/permissions`)
      .set(asActor(UserRole.ProjectManager, 'project-manager-1'))
      .send({ permissionKeys: [PermissionKey.PermissionManage] })
      .expect(403);

    expect(updateRolePermissions).not.toHaveBeenCalled();
  });
});

function asActor(role: UserRole, userId: string) {
  return {
    Authorization: 'Bearer test-token',
    'X-Global-Role': role,
    'X-User-Id': userId,
  };
}
