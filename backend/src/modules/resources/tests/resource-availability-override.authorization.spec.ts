import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceAvailabilityOverrideApiService } from '../resource-availability-override-api.service';
import { ResourceAvailabilityOverrideController } from '../resource-availability-override.controller';

const permissionsByRoleName: Record<string, string[]> = {
  ResourceAvailabilityManager: [
    PermissionKey.ResourceAvailabilityArchive,
    PermissionKey.ResourceAvailabilityCreate,
    PermissionKey.ResourceAvailabilityRead,
    PermissionKey.ResourceAvailabilityUpdate,
  ],
  ResourceAvailabilityReader: [PermissionKey.ResourceAvailabilityRead],
  ViewerOnly: [PermissionKey.DashboardView],
};

describe('ResourceAvailabilityOverrideController authorization', () => {
  let controller: ResourceAvailabilityOverrideController;
  let guard: PermissionsGuard;

  beforeEach(async () => {
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
            getGrantedPermissionKeys: jest.fn(
              ({ roleId }: { roleId: string }) =>
                Promise.resolve(new Set(permissionsByRoleName[roleId] ?? [])),
            ),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(ResourceAvailabilityOverrideController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['ResourceAvailabilityReader', 'ResourceAvailabilityManager'])(
    'allows %s to access read endpoints',
    async (roleName) => {
      await expect(
        guard.canActivate(
          createAvailabilityContext(
            roleName,
            controller,
            'listAvailabilityOverrides',
          ),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createAvailabilityContext(
            roleName,
            controller,
            'getAvailabilityOverride',
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it('denies users without availability permissions from read endpoints', async () => {
    await expect(
      guard.canActivate(
        createAvailabilityContext(
          'ViewerOnly',
          controller,
          'listAvailabilityOverrides',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows managers and denies readers for write endpoints', async () => {
    await expect(
      guard.canActivate(
        createAvailabilityContext(
          'ResourceAvailabilityManager',
          controller,
          'createAvailabilityOverride',
        ),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createAvailabilityContext(
          'ResourceAvailabilityReader',
          controller,
          'updateAvailabilityOverride',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        createAvailabilityContext(
          'ResourceAvailabilityReader',
          controller,
          'deleteAvailabilityOverride',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
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
