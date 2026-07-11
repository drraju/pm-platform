import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceAssignmentApiService } from '../resource-assignment-api.service';
import { ResourceAssignmentController } from '../resource-assignment.controller';

const permissionsByRoleName: Record<string, string[]> = {
  AssignmentManager: [
    PermissionKey.ResourceAssignmentArchive,
    PermissionKey.ResourceAssignmentCreate,
    PermissionKey.ResourceAssignmentRead,
    PermissionKey.ResourceAssignmentUpdate,
  ],
  AssignmentReader: [PermissionKey.ResourceAssignmentRead],
  ViewerOnly: [PermissionKey.DashboardView],
};

describe('ResourceAssignmentController authorization', () => {
  let controller: ResourceAssignmentController;
  let guard: PermissionsGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceAssignmentController],
      providers: [
        {
          provide: ResourceAssignmentApiService,
          useValue: {
            createAssignment: jest.fn(),
            deleteAssignment: jest.fn(),
            getAssignmentById: jest.fn(),
            listAssignmentsByProject: jest.fn(),
            listAssignmentsByResource: jest.fn(),
            updateAssignment: jest.fn(),
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

    controller = moduleRef.get(ResourceAssignmentController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['AssignmentReader', 'AssignmentManager'])(
    'allows %s to access assignment read endpoints',
    async (roleName) => {
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'getAssignmentById'),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'listAssignmentsByProject'),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'listAssignmentsByResource'),
        ),
      ).resolves.toBe(true);
    },
  );

  it('denies users without assignment permissions from read endpoints', async () => {
    await expect(
      guard.canActivate(
        createContext('ViewerOnly', controller, 'getAssignmentById'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows assignment managers and denies readers for write endpoints', async () => {
    await expect(
      guard.canActivate(
        createContext('AssignmentManager', controller, 'createAssignment'),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createContext('AssignmentReader', controller, 'updateAssignment'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        createContext('AssignmentReader', controller, 'deleteAssignment'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createContext(
  roleName: string,
  controller: ResourceAssignmentController,
  methodName:
    | 'createAssignment'
    | 'updateAssignment'
    | 'deleteAssignment'
    | 'getAssignmentById'
    | 'listAssignmentsByProject'
    | 'listAssignmentsByResource',
): ExecutionContext {
  return {
    getClass: () => ResourceAssignmentController,
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
