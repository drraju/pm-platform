import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { ExternalApiGuard } from '../auth/external-api.guard';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';
import { ExternalApiResource } from '../auth/external-api-resource';
import {
  ExternalDataScope,
  ExternalDataScopeService,
} from '../scope/external-data-scope';

describe('ExternalApiGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let policy: { canRead: jest.Mock };
  let scopeService: { resolve: jest.Mock };
  let guard: ExternalApiGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    policy = { canRead: jest.fn() };
    scopeService = {
      resolve: jest.fn().mockResolvedValue({
        kind: ExternalDataScope.AllProjects,
      }),
    };
    guard = new ExternalApiGuard(
      reflector as unknown as Reflector,
      policy as unknown as ExternalApiPolicyService,
      scopeService as unknown as ExternalDataScopeService,
    );
  });

  it('fails closed when a future external handler omits resource metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(policy.canRead).not.toHaveBeenCalled();
    expect(scopeService.resolve).not.toHaveBeenCalled();
  });

  it('denies missing identity context with a 403 boundary error', async () => {
    reflector.getAllAndOverride.mockReturnValue(ExternalApiResource.Tasks);
    policy.canRead.mockResolvedValue(false);

    await expect(guard.canActivate(context(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(scopeService.resolve).not.toHaveBeenCalled();
  });

  it('allows only when the external policy grants the mapped resource', async () => {
    const actor = {
      email: 'automation@example.com',
      identityType: UserIdentityType.Service,
      roleId: 'role-service-user',
      userId: 'service-1',
    };
    reflector.getAllAndOverride.mockReturnValue(ExternalApiResource.Risks);
    policy.canRead.mockResolvedValue(true);

    const request = { user: actor };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(policy.canRead).toHaveBeenCalledWith(
      actor,
      ExternalApiResource.Risks,
    );
    expect(scopeService.resolve).toHaveBeenCalledWith(actor);
    expect(request).toEqual({
      externalDataScope: { kind: ExternalDataScope.AllProjects },
      user: actor,
    });
  });

  it('fails closed when no data scope resolves after authorization', async () => {
    reflector.getAllAndOverride.mockReturnValue(ExternalApiResource.Projects);
    policy.canRead.mockResolvedValue(true);
    scopeService.resolve.mockResolvedValue(null);

    await expect(
      guard.canActivate(context({ user: {} })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function context(
  request: Record<string, unknown> = { user: {} },
): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: () => request,
    })),
  } as unknown as ExecutionContext;
}
