import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
  PLATFORM_ADMIN_REQUIRED_KEY,
  PermissionKey,
} from './permissions';
import { AuthorizationPolicyService } from './authorization-policy.service';
import { PermissionsGuard } from './permissions.guard';

type ReflectorMock = Pick<Reflector, 'getAllAndOverride'> & {
  getAllAndOverride: jest.Mock;
};

describe('PermissionsGuard', () => {
  let reflector: ReflectorMock;
  let authorizationPolicyService: Pick<
    AuthorizationPolicyService,
    'canManageRolePermissions' | 'getGrantedPermissionKeys'
  > & {
    canManageRolePermissions: jest.Mock;
    getGrantedPermissionKeys: jest.Mock;
  };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    authorizationPolicyService = {
      canManageRolePermissions: jest.fn(),
      getGrantedPermissionKeys: jest.fn(),
    };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
    );
  });

  it('allows access when any required permission is granted', async () => {
    mockMetadata({
      all: [],
      any: [PermissionKey.ProjectRead, PermissionKey.ProjectTeamManage],
    });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.ProjectRead]),
    );

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('denies access when no any-permission option is granted', async () => {
    mockMetadata({
      all: [],
      any: [PermissionKey.ProjectRead, PermissionKey.ProjectTeamManage],
    });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.TaskComment]),
    );

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows access when a role has all required permissions', async () => {
    mockMetadata({
      all: [PermissionKey.UserManage],
      any: [PermissionKey.ProjectRead],
    });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.UserManage, PermissionKey.ProjectRead]),
    );

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('queries the centralized authorization service with request actor data', async () => {
    mockMetadata({
      all: [PermissionKey.ProjectRead],
    });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.ProjectRead]),
    );

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(
      authorizationPolicyService.getGrantedPermissionKeys,
    ).toHaveBeenCalledWith({
      email: 'user@example.com',
      roleId: 'role-1',
      userId: 'user-1',
    });
  });

  it('allows a permissioned Platform Admin through the administration boundary', async () => {
    mockMetadata({
      all: [PermissionKey.PermissionManage],
      platformAdminRequired: true,
    });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.PermissionManage]),
    );
    authorizationPolicyService.canManageRolePermissions.mockResolvedValue(true);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(
      authorizationPolicyService.canManageRolePermissions,
    ).toHaveBeenCalledWith({
      email: 'user@example.com',
      roleId: 'role-1',
      userId: 'user-1',
    });
  });

  it('denies a non-admin even when permission.manage is granted', async () => {
    mockMetadata({
      all: [PermissionKey.PermissionManage],
      platformAdminRequired: true,
    });
    authorizationPolicyService.getGrantedPermissionKeys.mockResolvedValue(
      new Set([PermissionKey.PermissionManage]),
    );
    authorizationPolicyService.canManageRolePermissions.mockResolvedValue(
      false,
    );

    await expect(guard.canActivate(createContext())).rejects.toThrow(
      'Insufficient permissions',
    );
  });

  function mockMetadata(input: {
    all?: PermissionKey[];
    any?: PermissionKey[];
    platformAdminRequired?: boolean;
  }) {
    reflector.getAllAndOverride.mockImplementation((metadataKey: string) => {
      if (metadataKey === PERMISSIONS_KEY) {
        return input.all;
      }
      if (metadataKey === ANY_PERMISSIONS_KEY) {
        return input.any;
      }
      if (metadataKey === PLATFORM_ADMIN_REQUIRED_KEY) {
        return input.platformAdminRequired;
      }
      return undefined;
    });
  }
});

function createContext(): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: () => ({
        user: {
          email: 'user@example.com',
          roleId: 'role-1',
          userId: 'user-1',
        },
      }),
    })),
  } as unknown as ExecutionContext;
}
