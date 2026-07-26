import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PortfolioController } from '../portfolio.controller';
import { PortfolioService } from '../portfolio.service';
import { MilestoneQueryService } from '../../tasks/milestone-query.service';
import { MilestoneResponseMapper } from '../../tasks/milestone-response.mapper';

const permissionsByRoleName: Record<string, string[]> = {
  [UserRole.PortfolioManager]: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
  ],
  [UserRole.Executive]: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
  ],
  [UserRole.Customer]: [PermissionKey.DashboardView, PermissionKey.ProjectRead],
  [UserRole.Partner]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
  ],
  [UserRole.TeamMember]: [
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
        {
          provide: MilestoneQueryService,
          useValue: { findPortfolioMilestones: jest.fn() },
        },
        {
          provide: MilestoneResponseMapper,
          useValue: { toListResponse: jest.fn(), toQuery: jest.fn() },
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

  it.each([UserRole.PortfolioManager, UserRole.Executive])(
    'allows %s to access portfolio reporting',
    async (roleName) => {
      await expect(
        guard.canActivate(createContext(roleName, controller)),
      ).resolves.toBe(true);
    },
  );

  it('applies portfolio.view to the milestone endpoint', async () => {
    await expect(
      guard.canActivate(
        createContext(UserRole.PortfolioManager, controller, 'findMilestones'),
      ),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        createContext(UserRole.Customer, controller, 'findMilestones'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([UserRole.Customer, UserRole.Partner, UserRole.TeamMember])(
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
  handler: 'getSummary' | 'findMilestones' = 'getSummary',
): ExecutionContext {
  return {
    getClass: () => PortfolioController,
    getHandler: () => controller[handler],
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
