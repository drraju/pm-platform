import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceCapacityPolicyApiService } from '../resource-capacity-policy-api.service';
import { ResourceCapacityPolicyController } from '../resource-capacity-policy.controller';

describe('ResourceCapacityPolicyController authorization', () => {
  let controller: ResourceCapacityPolicyController;
  let guard: PermissionsGuard;
  let grantedPermissions: PermissionKey[];

  beforeEach(async () => {
    grantedPermissions = [];
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
            getGrantedPermissionKeys: jest.fn(() =>
              Promise.resolve(new Set(grantedPermissions)),
            ),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(ResourceCapacityPolicyController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each([
    ['createCapacityPolicy', PermissionKey.ResourceCapacityCreate],
    ['listCapacityPolicies', PermissionKey.ResourceCapacityRead],
    ['getCapacityPolicy', PermissionKey.ResourceCapacityRead],
    ['updateCapacityPolicy', PermissionKey.ResourceCapacityUpdate],
    ['deleteCapacityPolicy', PermissionKey.ResourceCapacityArchive],
  ] as const)(
    'requires the exact permission for %s',
    async (methodName, requiredPermission) => {
      grantedPermissions = [requiredPermission];
      await expect(
        guard.canActivate(
          createCapacityContext('ExactPermission', controller, methodName),
        ),
      ).resolves.toBe(true);

      grantedPermissions = [];
      await expect(
        guard.canActivate(
          createCapacityContext('NoPermission', controller, methodName),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
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
