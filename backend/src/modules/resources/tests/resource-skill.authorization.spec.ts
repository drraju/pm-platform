import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ResourceSkillApiService } from '../resource-skill-api.service';
import { ResourceSkillController } from '../resource-skill.controller';

const permissionsByRoleName: Record<string, string[]> = {
  ResourceSkillManager: [
    PermissionKey.ResourceSkillArchive,
    PermissionKey.ResourceSkillCreate,
    PermissionKey.ResourceSkillRead,
    PermissionKey.ResourceSkillUpdate,
  ],
  ResourceSkillReader: [PermissionKey.ResourceSkillRead],
  ViewerOnly: [PermissionKey.DashboardView],
};

describe('ResourceSkillController authorization', () => {
  let controller: ResourceSkillController;
  let guard: PermissionsGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceSkillController],
      providers: [
        {
          provide: ResourceSkillApiService,
          useValue: {
            createResourceSkill: jest.fn(),
            deleteResourceSkill: jest.fn(),
            getResourceSkill: jest.fn(),
            listResourceSkills: jest.fn(),
            listResourceSkillsByResource: jest.fn(),
            listResourceSkillsBySkill: jest.fn(),
            updateResourceSkill: jest.fn(),
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

    controller = moduleRef.get(ResourceSkillController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['ResourceSkillReader', 'ResourceSkillManager'])(
    'allows %s to access resource skill read endpoints',
    async (roleName) => {
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'listResourceSkills'),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'getResourceSkill'),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'listResourceSkillsByResource'),
        ),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(
          createContext(roleName, controller, 'listResourceSkillsBySkill'),
        ),
      ).resolves.toBe(true);
    },
  );

  it('denies users without resource skill permissions from read endpoints', async () => {
    await expect(
      guard.canActivate(
        createContext('ViewerOnly', controller, 'listResourceSkills'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows resource skill managers and denies readers for write endpoints', async () => {
    await expect(
      guard.canActivate(
        createContext(
          'ResourceSkillManager',
          controller,
          'createResourceSkill',
        ),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createContext('ResourceSkillReader', controller, 'updateResourceSkill'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        createContext('ResourceSkillReader', controller, 'deleteResourceSkill'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createContext(
  roleName: string,
  controller: ResourceSkillController,
  methodName:
    | 'createResourceSkill'
    | 'listResourceSkills'
    | 'getResourceSkill'
    | 'updateResourceSkill'
    | 'deleteResourceSkill'
    | 'listResourceSkillsByResource'
    | 'listResourceSkillsBySkill',
): ExecutionContext {
  return {
    getClass: () => ResourceSkillController,
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
