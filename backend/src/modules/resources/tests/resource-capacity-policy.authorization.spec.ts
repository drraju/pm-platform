import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceCapacityPolicyApiService } from '../resource-capacity-policy-api.service';
import { ResourceCapacityPolicyController } from '../resource-capacity-policy.controller';

const permissionsByRoleName: Record<string, string[]> = {
  ResourceCapacityManager: [
    PermissionKey.ResourceCapacityArchive,
    PermissionKey.ResourceCapacityCreate,
    PermissionKey.ResourceCapacityRead,
    PermissionKey.ResourceCapacityUpdate,
  ],
  ResourceCapacityReader: [PermissionKey.ResourceCapacityRead],
  ViewerOnly: [PermissionKey.DashboardView],
};

describe('ResourceCapacityPolicyController authorization', () => {
  let controller: ResourceCapacityPolicyController;
  let guard: PermissionsGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceCapacityPolicyController],
      providers: [
        {
          provide: ResourceCapacityPolicyApiService,
          useValue: {
            createCapacityPolicy: jest.fn(),
            deleteCapacityPolicy: jest.fn(),
            getCapacityPolicy: jest.fn(),
            listCapacityPolicies: jest.fn(),
            updateCapacityPolicy: jest.fn(),
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

    controller = moduleRef.get(ResourceCapacityPolicyController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['ResourceCapacityReader', 'ResourceCapacityManager'])(
    'allows %s to access read endpoints',
    async (roleName) => {
      await expect(
        guard.canActivate(
          createCapacityContext(roleName, controller, 'listCapacityPolicies'),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createCapacityContext(roleName, controller, 'getCapacityPolicy'),
        ),
      ).resolves.toBe(true);
    },
  );

  it('denies users without capacity permissions from read endpoints', async () => {
    await expect(
      guard.canActivate(
        createCapacityContext('ViewerOnly', controller, 'listCapacityPolicies'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows managers and denies readers for write endpoints', async () => {
    await expect(
      guard.canActivate(
        createCapacityContext(
          'ResourceCapacityManager',
          controller,
          'createCapacityPolicy',
        ),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createCapacityContext(
          'ResourceCapacityReader',
          controller,
          'updateCapacityPolicy',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        createCapacityContext(
          'ResourceCapacityReader',
          controller,
          'deleteCapacityPolicy',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createCapacityContext(
  roleName: string,
  controller: ResourceCapacityPolicyController,
  methodName:
    | 'createCapacityPolicy'
    | 'listCapacityPolicies'
    | 'getCapacityPolicy'
    | 'updateCapacityPolicy'
    | 'deleteCapacityPolicy',
): ExecutionContext {
  return {
    getClass: () => ResourceCapacityPolicyController,
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
