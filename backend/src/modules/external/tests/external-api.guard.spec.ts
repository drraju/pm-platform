import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { ExternalApiGuard } from '../auth/external-api.guard';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';
import { ExternalApiResource } from '../auth/external-api-resource';

describe('ExternalApiGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let policy: { canRead: jest.Mock };
  let guard: ExternalApiGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    policy = { canRead: jest.fn() };
    guard = new ExternalApiGuard(
      reflector as unknown as Reflector,
      policy as unknown as ExternalApiPolicyService,
    );
  });

  it('fails closed when a future external handler omits resource metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(policy.canRead).not.toHaveBeenCalled();
  });

  it('denies missing identity context with a 403 boundary error', async () => {
    reflector.getAllAndOverride.mockReturnValue(ExternalApiResource.Tasks);
    policy.canRead.mockResolvedValue(false);

    await expect(guard.canActivate(context(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
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

    await expect(guard.canActivate(context(actor))).resolves.toBe(true);
    expect(policy.canRead).toHaveBeenCalledWith(
      actor,
      ExternalApiResource.Risks,
    );
  });
});

function context(user: unknown = {}): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: () => ({ user }),
    })),
  } as unknown as ExecutionContext;
}
