import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceController } from '../resource.controller';
import { ResourceApiService } from '../resource-api.service';

const permissionsByRoleName: Record<string, string[]> = {
  ResourceManager: [
    PermissionKey.ResourceArchive,
    PermissionKey.ResourceCreate,
    PermissionKey.ResourceRead,
    PermissionKey.ResourceUpdate,
  ],
  ResourceReader: [PermissionKey.ResourceRead],
  ViewerOnly: [PermissionKey.DashboardView],
};

describe('ResourceController authorization', () => {
  let controller: ResourceController;
  let guard: PermissionsGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceController],
      providers: [
        {
          provide: ResourceApiService,
          useValue: {
            createResource: jest.fn(),
            deleteResource: jest.fn(),
            getResource: jest.fn(),
            listResources: jest.fn(),
            updateResource: jest.fn(),
          },
        },
        Reflector,
        PermissionsGuard,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn(
              ({ roleId }: { roleId: string }) =>
                Promise.resolve(new Set(permissionsByRoleName[roleId] ?? [])),
            ),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(ResourceController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['ResourceReader', 'ResourceManager'])(
    'allows %s to access resource read endpoints',
    async (roleName) => {
      await expect(
        guard.canActivate(createContext(roleName, controller, 'listResources')),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(createContext(roleName, controller, 'getResource')),
      ).resolves.toBe(true);
    },
  );

  it('denies users without resource permissions from read endpoints', async () => {
    await expect(
      guard.canActivate(createContext('ViewerOnly', controller, 'listResources')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows resource managers and denies readers for write endpoints', async () => {
    await expect(
      guard.canActivate(
        createContext('ResourceManager', controller, 'createResource'),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createContext('ResourceReader', controller, 'updateResource'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        createContext('ResourceReader', controller, 'deleteResource'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createContext(
  roleName: string,
  controller: ResourceController,
  methodName:
    | 'createResource'
    | 'listResources'
    | 'getResource'
    | 'updateResource'
    | 'deleteResource',
): ExecutionContext {
  return {
    getClass: () => ResourceController,
    getHandler: () => controller[methodName],
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          email: `${roleName.toLowerCase()}@example.com`,
          roleId: roleName,
          userId: `user-${roleName.toLowerCase()}`,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}
