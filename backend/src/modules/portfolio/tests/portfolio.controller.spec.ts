import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { PortfolioController } from '../portfolio.controller';
import { PortfolioService } from '../portfolio.service';

const permissionsByRoleName: Record<string, string[]> = {
  'Program Manager': [PermissionKey.DashboardView, PermissionKey.PortfolioView],
  'Portfolio Manager': [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
  ],
  Executive: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
  ],
  Customer: [PermissionKey.DashboardView, PermissionKey.ProjectRead],
  Partner: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
  ],
  'Team Member': [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.TaskUpdate,
  ],
};

describe('PortfolioController authorization', () => {
  let controller: PortfolioController;
  let guard: PermissionsGuard;
  let authorizationPolicyService: {
    getGrantedPermissionKeys: jest.Mock;
  };

  beforeEach(async () => {
    authorizationPolicyService = {
      getGrantedPermissionKeys: jest.fn(({ roleId }: { roleId: string }) =>
        Promise.resolve(new Set(permissionsByRoleName[roleId] ?? [])),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        {
          provide: PortfolioService,
          useValue: { getSummary: jest.fn() },
        },
        Reflector,
        PermissionsGuard,
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
      ],
    }).compile();

    controller = moduleRef.get(PortfolioController);
    guard = moduleRef.get(PermissionsGuard);
  });

  it.each(['Program Manager', 'Portfolio Manager', 'Executive'])(
    'allows %s to access portfolio reporting',
    async (roleName) => {
      await expect(
        guard.canActivate(createContext(roleName, controller)),
      ).resolves.toBe(true);
    },
  );

  it.each(['Customer', 'Partner', 'Team Member'])(
    'denies %s from accessing portfolio reporting',
    async (roleName) => {
      await expect(
        guard.canActivate(createContext(roleName, controller)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});

function createContext(
  roleName: string,
  controller: PortfolioController,
): ExecutionContext {
  return {
    getClass: () => PortfolioController,
    getHandler: () => controller.getSummary,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          email: `${roleName.toLowerCase().replaceAll(' ', '.')}@example.com`,
          roleId: roleName,
          userId: `user-${roleName.toLowerCase().replaceAll(' ', '-')}`,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}
