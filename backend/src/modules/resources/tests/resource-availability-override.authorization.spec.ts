import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceAvailabilityOverrideApiService } from '../resource-availability-override-api.service';
import { ResourceAvailabilityOverrideController } from '../resource-availability-override.controller';

describe('ResourceAvailabilityOverrideController authorization', () => {
  let controller: ResourceAvailabilityOverrideController;
  let guard: PermissionsGuard;
  let grantedPermissions: PermissionKey[];

  beforeEach(async () => {
    grantedPermissions = [];
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceAvailabilityOverrideController],
      providers: [
        {
          provide: ResourceAvailabilityOverrideApiService,
          useValue: {
            createAvailabilityOverride: jest.fn(),
            deleteAvailabilityOverride: jest.fn(),
            getAvailabilityOverride: jest.fn(),
            listAvailabilityOverrides: jest.fn(),
            updateAvailabilityOverride: jest.fn(),
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

    controller = moduleRef.get(ResourceAvailabilityOverrideController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each([
    ['createAvailabilityOverride', PermissionKey.ResourceAvailabilityCreate],
    ['listAvailabilityOverrides', PermissionKey.ResourceAvailabilityRead],
    ['getAvailabilityOverride', PermissionKey.ResourceAvailabilityRead],
    ['updateAvailabilityOverride', PermissionKey.ResourceAvailabilityUpdate],
    ['deleteAvailabilityOverride', PermissionKey.ResourceAvailabilityArchive],
  ] as const)(
    'requires the exact permission for %s',
    async (methodName, requiredPermission) => {
      grantedPermissions = [requiredPermission];
      await expect(
        guard.canActivate(
          createAvailabilityContext('ExactPermission', controller, methodName),
        ),
      ).resolves.toBe(true);

      grantedPermissions = [];
      await expect(
        guard.canActivate(
          createAvailabilityContext('NoPermission', controller, methodName),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});

function createAvailabilityContext(
  roleName: string,
  controller: ResourceAvailabilityOverrideController,
  methodName:
    | 'createAvailabilityOverride'
    | 'listAvailabilityOverrides'
    | 'getAvailabilityOverride'
    | 'updateAvailabilityOverride'
    | 'deleteAvailabilityOverride',
): ExecutionContext {
  return {
    getClass: () => ResourceAvailabilityOverrideController,
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
