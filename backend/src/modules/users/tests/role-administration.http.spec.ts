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

describe('Global role administration HTTP authorization', () => {
  let app: INestApplication;
  let createRole: jest.Mock;

  beforeEach(async () => {
    createRole = jest.fn().mockResolvedValue({
      description: 'Analytics metadata role',
      id: 'role-created',
      name: 'ANALYTICS_METADATA',
      permissions: [],
    });
    const policy = {
      isPlatformAdministrator: jest.fn(
        async (actor: Actor) => actor.roleId === UserRole.PlatformAdmin,
      ),
      getGrantedPermissionKeys: jest
        .fn()
        .mockResolvedValue(new Set([PermissionKey.RoleManage])),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        PermissionsGuard,
        { provide: AuthorizationPolicyService, useValue: policy },
        { provide: UsersService, useValue: { createRole } },
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

  it('allows a Platform Admin with role.manage to create a global role', async () => {
    const input = {
      description: 'Analytics metadata role',
      name: 'ANALYTICS_METADATA',
    };

    await request(app.getHttpServer())
      .post('/users/roles')
      .set(asActor(UserRole.PlatformAdmin, 'admin-1'))
      .send(input)
      .expect(201);

    expect(createRole).toHaveBeenCalledWith(input, {
      email: 'actor@example.com',
      roleId: UserRole.PlatformAdmin,
      userId: 'admin-1',
    });
  });

  it.each([
    UserRole.Executive,
    UserRole.PortfolioManager,
    UserRole.ProjectManager,
    UserRole.TeamMember,
    UserRole.Customer,
    UserRole.Partner,
  ])('denies %s even when role.manage is granted', async (roleName) => {
    await request(app.getHttpServer())
      .post('/users/roles')
      .set(asActor(roleName, 'non-admin-1'))
      .send({
        description: 'Attempted privileged role',
        name: UserRole.PlatformAdmin,
      })
      .expect(403);

    expect(createRole).not.toHaveBeenCalled();
  });

  it('denies Executive creation of a privileged role before invoking the service', async () => {
    await request(app.getHttpServer())
      .post('/users/roles')
      .set(asActor(UserRole.Executive, 'executive-1'))
      .send({
        description: 'Attempted Platform Admin replacement',
        name: UserRole.PlatformAdmin,
      })
      .expect(403);

    expect(createRole).not.toHaveBeenCalled();
  });
});

function asActor(role: UserRole, userId: string) {
  return {
    Authorization: 'Bearer test-token',
    'X-Global-Role': role,
    'X-User-Id': userId,
  };
}
