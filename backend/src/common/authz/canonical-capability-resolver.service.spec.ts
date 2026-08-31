import { Logger } from '@nestjs/common';
import { ProjectRole } from '../enums/project-role.enum';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from './authorization-policy.service';
import {
  CanonicalCapabilityResolverService,
  classifyTaskAssignment,
} from './canonical-capability-resolver.service';
import { PermissionKey } from './permissions';

type MockAuthorizationPolicy = {
  canManageProject: jest.Mock;
  canViewProject: jest.Mock;
  getProjectMembershipRole: jest.Mock;
  hasPermission: jest.Mock;
  isExternalActor: jest.Mock;
  isPlatformAdministrator: jest.Mock;
};

const projectId = 'project-1';
const destinationProjectId = 'project-2';
const actorId = 'actor-1';
const targetUserId = 'target-user';

describe('CanonicalCapabilityResolverService', () => {
  let memberships: Map<string, ProjectRole>;
  let policy: MockAuthorizationPolicy;
  let service: CanonicalCapabilityResolverService;

  beforeEach(() => {
    memberships = new Map();
    policy = {
      canManageProject: jest.fn().mockResolvedValue(true),
      canViewProject: jest.fn().mockResolvedValue(true),
      getProjectMembershipRole: jest.fn(
        async (resolvedProjectId: string, userId: string) =>
          memberships.get(`${resolvedProjectId}:${userId}`) ?? null,
      ),
      hasPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
      isPlatformAdministrator: jest.fn(
        async (resolvedActor: AuthorizationActor) =>
          resolvedActor.roleId === 'role-PLATFORM_ADMIN',
      ),
    };

    service = new CanonicalCapabilityResolverService(
      policy as unknown as AuthorizationPolicyService,
    );
  });

  it('preserves existing project capability delegation', async () => {
    const actor = createActor('PROJECT_MANAGER');

    await expect(
      service.resolve({
        actor,
        capability: 'project.view',
        resource: { projectId, type: 'project' },
      }),
    ).resolves.toEqual(grantedDecision());
    expect(policy.canViewProject).toHaveBeenCalledWith(projectId, actor);

    await expect(
      service.resolve({
        actor,
        capability: 'project.create',
        resource: { type: 'project' },
      }),
    ).resolves.toEqual(grantedDecision());
    expect(policy.hasPermission).toHaveBeenCalledWith(
      actor,
      PermissionKey.ProjectCreate,
    );
  });

  it.each(['PROJECT_MANAGER', 'TEAM_MEMBER'])(
    'grants manager task authority independently of global %s role',
    async (globalRole) => {
      const actor = createActor(globalRole);
      setMembership(actor.userId, ProjectRole.Manager);
      setMembership(targetUserId, ProjectRole.Contributor);

      for (const capability of [
        'task.create',
        'task.assign',
        'task.reassign',
      ] as const) {
        await expect(
          service.resolve({
            actor,
            capability,
            requestedAssigneeId:
              capability === 'task.create' ? undefined : targetUserId,
            resource: taskResource({ assigneeId: actor.userId }),
          }),
        ).resolves.toEqual(grantedDecision());
      }
    },
  );

  it('grants owner and manager the complete project task capability set', async () => {
    for (const projectRole of [ProjectRole.Owner, ProjectRole.Manager]) {
      const actor = createActor('TEAM_MEMBER', `actor-${projectRole}`);
      setMembership(actor.userId, projectRole);

      for (const capability of [
        'task.view',
        'task.create',
        'task.edit_plan',
        'task.edit_execution',
        'task.record_update',
        'task.assign',
        'task.reassign',
        'task.complete',
        'task.move',
        'task.delete',
      ] as const) {
        await expect(
          service.resolve({
            actor,
            capability,
            resource: taskResource({ assigneeId: actor.userId }),
          }),
        ).resolves.toEqual(grantedDecision());
      }

      await expect(
        service.resolve({
          actor,
          capability: 'forecast.read',
          resource: { projectId, type: 'forecast' },
        }),
      ).resolves.toEqual(grantedDecision());
    }
  });

  it('allows a contributor to update permitted execution fields on an assigned task', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);

    await expect(
      service.resolve({
        actor,
        capability: 'task.edit_execution',
        changedFields: ['percentComplete', 'remarks', 'status'],
        resource: taskResource({ assigneeId: actor.userId }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        allowed: true,
        editableFields: expect.arrayContaining([
          'percentComplete',
          'remarks',
          'status',
        ]),
        reasonCode: 'GRANTED',
      }),
    );

    await expect(
      service.resolve({
        actor,
        capability: 'task.record_update',
        changedFields: ['priority', 'nextStep', 'updateNotes'],
        resource: taskResource({ assigneeId: actor.userId }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        allowed: true,
        editableFields: expect.arrayContaining([
          'priority',
          'nextStep',
          'updateNotes',
        ]),
        reasonCode: 'GRANTED',
      }),
    );
  });

  it('grants contributor task and forecast reads', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);

    await expect(
      service.resolve({
        actor,
        capability: 'task.view',
        resource: taskResource(),
      }),
    ).resolves.toEqual(grantedDecision());

    await expect(
      service.resolve({
        actor,
        capability: 'forecast.read',
        resource: { projectId, type: 'forecast' },
      }),
    ).resolves.toEqual(grantedDecision());
  });

  it('allows contributor completion and reassignment only for the current assignee', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);
    setMembership(targetUserId, ProjectRole.Contributor);

    for (const capability of ['task.complete', 'task.reassign'] as const) {
      await expect(
        service.resolve({
          actor,
          capability,
          requestedAssigneeId:
            capability === 'task.reassign' ? targetUserId : undefined,
          resource: taskResource({ assigneeId: actor.userId }),
        }),
      ).resolves.toEqual(grantedDecision());

      await expect(
        service.resolve({
          actor,
          capability,
          resource: taskResource({ assigneeId: 'somebody-else' }),
        }),
      ).resolves.toEqual(deniedDecision('ASSIGNMENT_REQUIRED'));
    }
  });

  it('denies contributor execution changes outside the approved field set', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);

    await expect(
      service.resolve({
        actor,
        capability: 'task.edit_execution',
        changedFields: ['nextStep'],
        resource: taskResource({ assigneeId: actor.userId }),
      }),
    ).resolves.toEqual(deniedDecision('FIELD_RESTRICTED'));

    await expect(
      service.resolve({
        actor,
        capability: 'task.record_update',
        changedFields: ['remarks'],
        resource: taskResource({ assigneeId: actor.userId }),
      }),
    ).resolves.toEqual(deniedDecision('FIELD_RESTRICTED'));
  });

  it("denies contributor updates to somebody else's task", async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);

    for (const capability of [
      'task.edit_execution',
      'task.record_update',
    ] as const) {
      await expect(
        service.resolve({
          actor,
          capability,
          changedFields: ['status'],
          resource: taskResource({ assigneeId: 'somebody-else' }),
        }),
      ).resolves.toEqual(deniedDecision('ASSIGNMENT_REQUIRED'));
    }
  });

  it('classifies assignment from persisted state and denies contributor assignment', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);
    setMembership(targetUserId, ProjectRole.Contributor);

    await expect(
      service.resolveTaskAssignment({
        actor,
        requestedAssigneeId: targetUserId,
        resource: taskResource({ assigneeId: null }),
      }),
    ).resolves.toEqual({
      ...deniedDecision('MISSING_PERMISSION'),
      capability: 'task.assign',
      operation: 'assign',
    });
  });

  it('classifies reassignment and unassignment without trusting the client capability', async () => {
    const actor = createActor('PROJECT_MANAGER');
    setMembership(actor.userId, ProjectRole.Manager);
    setMembership(targetUserId, ProjectRole.Contributor);

    await expect(
      service.resolveTaskAssignment({
        actor,
        requestedAssigneeId: targetUserId,
        resource: taskResource({ assigneeId: 'current-user' }),
      }),
    ).resolves.toEqual({
      ...grantedDecision(),
      capability: 'task.reassign',
      operation: 'reassign',
    });

    await expect(
      service.resolveTaskAssignment({
        actor,
        requestedAssigneeId: null,
        resource: taskResource({ assigneeId: 'current-user' }),
      }),
    ).resolves.toEqual({
      ...grantedDecision(),
      capability: 'task.reassign',
      operation: 'reassign',
    });
  });

  it('returns a no-op decision when the assignee does not change', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Contributor);

    await expect(
      service.resolveTaskAssignment({
        actor,
        requestedAssigneeId: actor.userId,
        resource: taskResource({ assigneeId: actor.userId }),
      }),
    ).resolves.toEqual({
      ...grantedDecision(),
      capability: null,
      operation: 'none',
    });

    expect(policy.getProjectMembershipRole).toHaveBeenCalledWith(
      projectId,
      actor.userId,
    );
  });

  it('grants viewer reads and denies every task mutation capability', async () => {
    const actor = createActor('PROJECT_MANAGER');
    setMembership(actor.userId, ProjectRole.Viewer);

    await expect(
      service.resolve({
        actor,
        capability: 'task.view',
        resource: taskResource(),
      }),
    ).resolves.toEqual(grantedDecision());

    await expect(
      service.resolve({
        actor,
        capability: 'forecast.read',
        resource: { projectId, type: 'forecast' },
      }),
    ).resolves.toEqual(grantedDecision());

    for (const capability of [
      'task.create',
      'task.edit_plan',
      'task.edit_execution',
      'task.record_update',
      'task.assign',
      'task.reassign',
      'task.complete',
      'task.move',
      'task.delete',
    ] as const) {
      await expect(
        service.resolve({
          actor,
          capability,
          resource: taskResource({ assigneeId: actor.userId }),
        }),
      ).resolves.toEqual(deniedDecision('MISSING_PERMISSION'));
    }
  });

  it('denies project task mutations without active membership', async () => {
    const actor = createActor('PROJECT_MANAGER');

    await expect(
      service.resolve({
        actor,
        capability: 'task.create',
        resource: taskResource(),
      }),
    ).resolves.toEqual(deniedDecision('PROJECT_MEMBERSHIP_REQUIRED'));
  });

  it('does not elevate a global project manager above contributor authority', async () => {
    const actor = createActor('PROJECT_MANAGER');
    setMembership(actor.userId, ProjectRole.Contributor);

    await expect(
      service.resolve({
        actor,
        capability: 'task.create',
        resource: taskResource(),
      }),
    ).resolves.toEqual(deniedDecision('MISSING_PERMISSION'));

    await expect(
      service.resolve({
        actor,
        capability: 'task.reassign',
        resource: taskResource({ assigneeId: 'somebody-else' }),
      }),
    ).resolves.toEqual(deniedDecision('ASSIGNMENT_REQUIRED'));
  });

  it('allows platform administration without actor membership but preserves target integrity', async () => {
    const actor = createActor('PLATFORM_ADMIN');

    await expect(
      service.resolve({
        actor,
        capability: 'task.create',
        resource: taskResource(),
      }),
    ).resolves.toEqual(grantedDecision());

    await expect(
      service.resolveTaskAssignment({
        actor,
        requestedAssigneeId: 'outside-project',
        resource: taskResource({ assigneeId: actorId }),
      }),
    ).resolves.toEqual({
      ...deniedDecision('TARGET_NOT_PROJECT_MEMBER'),
      capability: 'task.reassign',
      operation: 'reassign',
    });
  });

  it('does not let platform administration bypass task-kind or deleted-state restrictions', async () => {
    const actor = createActor('PLATFORM_ADMIN');
    setMembership(targetUserId, ProjectRole.Contributor);

    for (const capability of [
      'task.edit_execution',
      'task.record_update',
      'task.complete',
    ] as const) {
      await expect(
        service.resolve({
          actor,
          capability,
          resource: taskResource({
            assigneeId: actor.userId,
            taskKind: 'summary',
          }),
        }),
      ).resolves.toEqual(deniedDecision('OBJECT_STATE_RESTRICTED'));
    }

    await expect(
      service.resolveTaskAssignment({
        actor,
        requestedAssigneeId: targetUserId,
        resource: taskResource({ assigneeId: null, taskKind: 'summary' }),
      }),
    ).resolves.toEqual({
      ...deniedDecision('OBJECT_STATE_RESTRICTED'),
      capability: 'task.assign',
      operation: 'assign',
    });

    await expect(
      service.resolve({
        actor,
        capability: 'task.delete',
        resource: taskResource({ deletedAt: new Date() }),
      }),
    ).resolves.toEqual(deniedDecision('OBJECT_STATE_RESTRICTED'));
  });

  it.each([
    'task.create',
    'task.edit_plan',
    'task.edit_execution',
    'task.record_update',
    'task.complete',
    'task.assign',
    'task.reassign',
    'task.move',
    'task.delete',
  ] as const)(
    'denies %s mutations in archived projects',
    async (capability) => {
      const actor = createActor('PLATFORM_ADMIN');

      await expect(
        service.resolve({
          actor,
          capability,
          destinationProjectId:
            capability === 'task.move' ? destinationProjectId : undefined,
          requestedAssigneeId:
            capability === 'task.assign' || capability === 'task.reassign'
              ? targetUserId
              : undefined,
          resource: taskResource({ projectStatus: 'archived' }),
        }),
      ).resolves.toEqual(deniedDecision('OBJECT_STATE_RESTRICTED'));
    },
  );

  it('denies movement into an archived destination before the platform-admin override', async () => {
    const actor = createActor('PLATFORM_ADMIN');

    await expect(
      service.resolve({
        actor,
        capability: 'task.move',
        destinationProjectId,
        destinationProjectStatus: 'archived',
        resource: taskResource(),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        allowed: false,
        reasonCode: 'OBJECT_STATE_RESTRICTED',
        scopeDecisions: expect.arrayContaining([
          expect.objectContaining({ allowed: false, scope: 'destination' }),
        ]),
      }),
    );
  });

  it('requires task.move authority in both projects', async () => {
    const actor = createActor('TEAM_MEMBER');
    setMembership(actor.userId, ProjectRole.Manager);

    await expect(
      service.resolve({
        actor,
        capability: 'task.move',
        destinationProjectId,
        resource: taskResource(),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        allowed: false,
        reasonCode: 'DESTINATION_SCOPE_DENIED',
      }),
    );

    setMembership(actor.userId, ProjectRole.Manager, destinationProjectId);
    await expect(
      service.resolve({
        actor,
        capability: 'task.move',
        destinationProjectId,
        resource: taskResource(),
      }),
    ).resolves.toEqual(
      expect.objectContaining({ allowed: true, reasonCode: 'GRANTED' }),
    );
  });

  it('returns the legacy decision during shadow comparison', async () => {
    policy.hasPermission.mockResolvedValue(false);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(
      service.compareWithLegacy({
        legacyAllowed: true,
        resolverInput: {
          actor: createActor('PROJECT_MANAGER'),
          capability: 'project.create',
          resource: { type: 'project' },
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
    expect(JSON.stringify(warnSpy.mock.calls[0][0])).not.toContain(actorId);
    warnSpy.mockRestore();
  });

  it('does not evaluate the resolver when shadow comparison is disabled', async () => {
    const resolveSpy = jest.spyOn(service, 'resolve');

    await expect(
      service.compareWithLegacy({
        enabled: false,
        legacyAllowed: false,
        resolverInput: {
          actor: createActor('PROJECT_MANAGER'),
          capability: 'project.create',
          resource: { type: 'project' },
        },
      }),
    ).resolves.toBe(false);
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  function setMembership(
    userId: string,
    role: ProjectRole,
    resolvedProjectId = projectId,
  ) {
    memberships.set(`${resolvedProjectId}:${userId}`, role);
  }
});

describe('classifyTaskAssignment', () => {
  it.each([
    [null, targetUserId, 'assign'],
    [actorId, targetUserId, 'reassign'],
    [actorId, null, 'reassign'],
    [actorId, actorId, 'none'],
    [null, null, 'none'],
  ] as const)(
    'classifies %s -> %s as %s',
    (currentAssigneeId, requestedAssigneeId, expected) => {
      expect(
        classifyTaskAssignment(currentAssigneeId, requestedAssigneeId),
      ).toBe(expected);
    },
  );
});

function createActor(globalRole: string, userId = actorId): AuthorizationActor {
  return {
    roleId: `role-${globalRole}`,
    userId,
  };
}

function taskResource(
  overrides: Partial<{
    assigneeId: string | null;
    deletedAt: Date | string | null;
    projectStatus: string | null;
    status: string | null;
    taskKind: string | null;
  }> = {},
) {
  return {
    projectId,
    type: 'task' as const,
    ...overrides,
  };
}

function grantedDecision() {
  return {
    allowed: true,
    audience: 'internal',
    reasonCode: 'GRANTED',
  } as const;
}

function deniedDecision(reasonCode: string) {
  return {
    allowed: false,
    audience: 'internal',
    reasonCode,
  };
}
