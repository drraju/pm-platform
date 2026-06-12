import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Role } from '../../modules/users/entities/role.entity';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
  PermissionKey,
} from './permissions';
import { PermissionsGuard } from './permissions.guard';

type ReflectorMock = Pick<Reflector, 'getAllAndOverride'> & {
  getAllAndOverride: jest.Mock;
};

describe('PermissionsGuard', () => {
  let reflector: ReflectorMock;
  let rolesRepository: Pick<Repository<Role>, 'findOne'> & {
    findOne: jest.Mock;
  };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    rolesRepository = {
      findOne: jest.fn(),
    };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      rolesRepository as unknown as Repository<Role>,
    );
  });

  it('allows access when any required permission is granted', async () => {
    mockMetadata({
      all: [],
      any: [PermissionKey.ProjectRead, PermissionKey.ProjectTeamManage],
    });
    rolesRepository.findOne.mockResolvedValue({
      name: 'Program Manager',
      permissions: [{ key: PermissionKey.ProjectRead }],
    });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('denies access when no any-permission option is granted', async () => {
    mockMetadata({
      all: [],
      any: [PermissionKey.ProjectRead, PermissionKey.ProjectTeamManage],
    });
    rolesRepository.findOne.mockResolvedValue({
      name: 'Team Member',
      permissions: [{ key: PermissionKey.TaskComment }],
    });

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('keeps super admin bypass for all and any permission metadata', async () => {
    mockMetadata({
      all: [PermissionKey.UserManage],
      any: [PermissionKey.ProjectRead],
    });
    rolesRepository.findOne.mockResolvedValue({
      name: 'SUPER_ADMIN',
      permissions: [],
    });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  function mockMetadata(input: {
    all?: PermissionKey[];
    any?: PermissionKey[];
  }) {
    reflector.getAllAndOverride.mockImplementation((metadataKey: string) => {
      if (metadataKey === PERMISSIONS_KEY) {
        return input.all;
      }
      if (metadataKey === ANY_PERMISSIONS_KEY) {
        return input.any;
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
        user: { roleId: 'role-1' },
      }),
    })),
  } as unknown as ExecutionContext;
}
