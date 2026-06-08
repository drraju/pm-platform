import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthorizationService } from '../src/modules/authorization/authorization.service';
import { PROJECT_ACCESS_KEY } from '../src/modules/authorization/decorators/project-access.decorator';
import { PermissionsGuard } from '../src/modules/authorization/guards/permissions.guard';
import { ProjectAccessGuard } from '../src/modules/authorization/guards/project-access.guard';
import { PermissionKey } from '../src/modules/authorization/permissions';

describe('Authorization integration', () => {
  let authorizationService: {
    assertCanReadProject: jest.Mock;
    assertHasAnyPermission: jest.Mock;
    getEffectiveUser: jest.Mock;
  };
  let permissionsGuard: PermissionsGuard;
  let projectAccessGuard: ProjectAccessGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    authorizationService = {
      assertCanReadProject: jest.fn(),
      assertHasAnyPermission: jest.fn(),
      getEffectiveUser: jest.fn().mockResolvedValue({
        permissions: [],
        userId: 'user-1',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        Reflector,
        PermissionsGuard,
        ProjectAccessGuard,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    permissionsGuard = moduleRef.get(PermissionsGuard);
    projectAccessGuard = moduleRef.get(ProjectAccessGuard);
    reflector = moduleRef.get(Reflector);
  });

  it('allows a route when permission enforcement passes', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([PermissionKey.ExecutiveSummaryRead]);

    await expect(permissionsGuard.canActivate(createContext({}))).resolves.toBe(
      true,
    );

    expect(authorizationService.assertHasAnyPermission).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      [PermissionKey.ExecutiveSummaryRead],
    );
  });

  it('denies a route when permission enforcement fails', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([PermissionKey.ExecutiveSummaryRead]);
    authorizationService.assertHasAnyPermission.mockImplementationOnce(() => {
      throw new ForbiddenException('Insufficient permissions');
    });

    await expect(
      permissionsGuard.canActivate(createContext({})),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows project workspace access when project access passes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PROJECT_ACCESS_KEY) {
        return { mode: 'read' };
      }
      return undefined;
    });

    await expect(
      projectAccessGuard.canActivate(
        createContext({ params: { id: 'project-1' } }),
      ),
    ).resolves.toBe(true);

    expect(authorizationService.assertCanReadProject).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'project-1',
    );
  });

  it('denies project workspace access when project access fails', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === PROJECT_ACCESS_KEY) {
        return { mode: 'read' };
      }
      return undefined;
    });
    authorizationService.assertCanReadProject.mockRejectedValueOnce(
      new ForbiddenException('Project access denied'),
    );

    await expect(
      projectAccessGuard.canActivate(
        createContext({ params: { id: 'project-1' } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createContext({ params = {} }: { params?: Record<string, string> }) {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        params,
        user: {
          email: 'user@example.com',
          roleId: 'role-1',
          userId: 'user-1',
        },
      }),
    }),
  } as never;
}
