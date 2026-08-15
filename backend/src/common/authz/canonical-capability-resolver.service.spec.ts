import { Logger } from '@nestjs/common';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from './authorization-policy.service';
import { CanonicalCapabilityResolverService } from './canonical-capability-resolver.service';
import { PermissionKey } from './permissions';

type MockAuthorizationPolicy = {
  canManageProject: jest.Mock;
  canManageTask: jest.Mock;
  canViewProject: jest.Mock;
  hasPermission: jest.Mock;
  isExternalActor: jest.Mock;
};

const actor: AuthorizationActor = {
  roleId: 'role-project-manager',
  userId: 'actor-1',
};

describe('CanonicalCapabilityResolverService', () => {
  let policy: MockAuthorizationPolicy;
  let service: CanonicalCapabilityResolverService;

  beforeEach(() => {
    policy = {
      canManageProject: jest.fn().mockResolvedValue(true),
      canManageTask: jest.fn().mockResolvedValue(true),
      canViewProject: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };

    service = new CanonicalCapabilityResolverService(
      policy as unknown as AuthorizationPolicyService,
    );
  });

  it('resolves project.view through the existing project policy', async () => {
    await expect(
      service.resolve({
        actor,
        capability: 'project.view',
        resource: {
          type: 'project',
          projectId: 'project-1',
        },
      }),
    ).resolves.toEqual({
      allowed: true,
      audience: 'internal',
      reasonCode: 'GRANTED',
    });

    expect(policy.canViewProject).toHaveBeenCalledWith(
      'project-1',
      actor,
    );
  });

  it('denies project.view when the existing project policy denies', async () => {
    policy.canViewProject.mockResolvedValue(false);

    await expect(
      service.resolve({
        actor,
        capability: 'project.view',
        resource: {
          type: 'project',
          projectId: 'project-1',
        },
      }),
    ).resolves.toEqual({
      allowed: false,
      audience: 'internal',
      reasonCode: 'OUTSIDE_PROJECT_SCOPE',
    });
  });

  it('resolves project.create through the existing permission model', async () => {
    await expect(
      service.resolve({
        actor,
        capability: 'project.create',
        resource: {
          type: 'project',
        },
      }),
    ).resolves.toEqual({
      allowed: true,
      audience: 'internal',
      reasonCode: 'GRANTED',
    });

    expect(policy.hasPermission).toHaveBeenCalledWith(
      actor,
      PermissionKey.ProjectCreate,
    );
  });

  it('denies when the required existing permission is missing', async () => {
    policy.hasPermission.mockResolvedValue(false);

    await expect(
      service.resolve({
        actor,
        capability: 'project.create',
        resource: {
          type: 'project',
        },
      }),
    ).resolves.toEqual({
      allowed: false,
      audience: 'internal',
      reasonCode: 'MISSING_PERMISSION',
    });
  });

  it('resolves task.reassign through the existing permission and task policy', async () => {
    await expect(
      service.resolve({
        actor,
        capability: 'task.reassign',
        resource: {
          type: 'task',
          projectId: 'project-1',
        },
      }),
    ).resolves.toEqual({
      allowed: true,
      audience: 'internal',
      reasonCode: 'GRANTED',
    });

    expect(policy.hasPermission).toHaveBeenCalledWith(
      actor,
      PermissionKey.TaskReassign,
    );

    expect(policy.canManageTask).toHaveBeenCalledWith(
      'project-1',
      actor,
    );
  });

  it('does not invent authorization for capabilities not yet migrated', async () => {
    await expect(
      service.resolve({
        actor,
        capability: 'task.complete',
        resource: {
          type: 'task',
          projectId: 'project-1',
        },
      }),
    ).resolves.toEqual({
      allowed: false,
      audience: 'internal',
      reasonCode: 'NOT_YET_MIGRATED',
    });

    expect(policy.hasPermission).not.toHaveBeenCalled();
    expect(policy.canManageTask).not.toHaveBeenCalled();
  });

  it('represents external audience without changing existing policy semantics', async () => {
    policy.isExternalActor.mockResolvedValue(true);

    await expect(
      service.resolve({
        actor,
        capability: 'project.create',
        resource: {
          type: 'project',
        },
      }),
    ).resolves.toEqual({
      allowed: true,
      audience: 'external',
      reasonCode: 'GRANTED',
    });
  });

  it('returns the legacy decision during shadow comparison', async () => {
    policy.hasPermission.mockResolvedValue(false);

    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation();

    await expect(
      service.compareWithLegacy({
        legacyAllowed: true,
        resolverInput: {
          actor,
          capability: 'project.create',
          resource: {
            type: 'project',
          },
        },
      }),
    ).resolves.toBe(true);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'project.create',
        event: 'capability_shadow_mismatch',
        legacyAllowed: true,
        resolverAllowed: false,
      }),
    );

    expect(
      JSON.stringify(warnSpy.mock.calls[0][0]),
    ).not.toContain('actor-1');

    warnSpy.mockRestore();
  });

  it('does not evaluate the resolver when shadow comparison is disabled', async () => {
    const resolveSpy = jest.spyOn(service, 'resolve');

    await expect(
      service.compareWithLegacy({
        enabled: false,
        legacyAllowed: false,
        resolverInput: {
          actor,
          capability: 'project.create',
          resource: {
            type: 'project',
          },
        },
      }),
    ).resolves.toBe(false);

    expect(resolveSpy).not.toHaveBeenCalled();
  });
});