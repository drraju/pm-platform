import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { SkillApiService } from '../skill-api.service';
import { SkillController } from '../skill.controller';

const permissionsByRoleName: Record<string, string[]> = {
  SkillManager: [
    PermissionKey.SkillArchive,
    PermissionKey.SkillCreate,
    PermissionKey.SkillRead,
    PermissionKey.SkillUpdate,
  ],
  SkillReader: [PermissionKey.SkillRead],
  ViewerOnly: [PermissionKey.DashboardView],
};

describe('SkillController authorization', () => {
  let controller: SkillController;
  let guard: PermissionsGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SkillController],
      providers: [
        {
          provide: SkillApiService,
          useValue: {
            createSkill: jest.fn(),
            deleteSkill: jest.fn(),
            getSkill: jest.fn(),
            listSkills: jest.fn(),
            updateSkill: jest.fn(),
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

    controller = moduleRef.get(SkillController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['SkillReader', 'SkillManager'])(
    'allows %s to access skill read endpoints',
    async (roleName) => {
      await expect(
        guard.canActivate(createContext(roleName, controller, 'listSkills')),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(createContext(roleName, controller, 'getSkill')),
      ).resolves.toBe(true);
    },
  );

  it('denies users without skill permissions from read endpoints', async () => {
    await expect(
      guard.canActivate(createContext('ViewerOnly', controller, 'listSkills')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows skill managers and denies readers for write endpoints', async () => {
    await expect(
      guard.canActivate(
        createContext('SkillManager', controller, 'createSkill'),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createContext('SkillReader', controller, 'updateSkill'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(
        createContext('SkillReader', controller, 'deleteSkill'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createContext(
  roleName: string,
  controller: SkillController,
  methodName:
    | 'createSkill'
    | 'listSkills'
    | 'getSkill'
    | 'updateSkill'
    | 'deleteSkill',
): ExecutionContext {
  return {
    getClass: () => SkillController,
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
