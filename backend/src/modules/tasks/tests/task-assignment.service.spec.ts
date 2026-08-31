/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from '../entities/task.entity';
import { TaskAssignmentService } from '../task-assignment.service';

const projectId = '11111111-1111-4111-8111-111111111111';
const otherProjectId = '22222222-2222-4222-8222-222222222222';
const taskId = '33333333-3333-4333-8333-333333333333';
const actorId = '44444444-4444-4444-8444-444444444444';
const currentAssigneeId = '55555555-5555-4555-8555-555555555555';
const targetAssigneeId = '66666666-6666-4666-8666-666666666666';

describe('TaskAssignmentService', () => {
  let persistedTask: Task;
  let memberships: Map<string, ProjectRole>;
  let users: Map<string, User>;
  let tasksRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let projectMembersRepository: { findOne: jest.Mock };
  let usersRepository: { findOne: jest.Mock };
  let policy: {
    getProjectMembershipRole: jest.Mock;
    isExternalActor: jest.Mock;
    isPlatformAdministrator: jest.Mock;
  };
  let service: TaskAssignmentService;

  beforeEach(() => {
    persistedTask = createTask();
    memberships = new Map();
    users = new Map();
    tasksRepository = {
      findOne: jest.fn(async ({ relations, where }) => {
        if (
          where.id !== persistedTask.id ||
          (where.projectId && where.projectId !== persistedTask.projectId)
        ) {
          return null;
        }
        return {
          ...persistedTask,
          ...(relations?.assignee
            ? {
                assignee: persistedTask.assigneeId
                  ? (users.get(persistedTask.assigneeId) ?? null)
                  : null,
              }
            : {}),
        };
      }),
      save: jest.fn(async (task: Task) => {
        persistedTask = { ...task };
        return task;
      }),
    };
    projectMembersRepository = {
      findOne: jest.fn(async ({ where }) =>
        memberships.has(membershipKey(where.projectId, where.userId))
          ? { id: `membership-${where.userId}` }
          : null,
      ),
    };
    usersRepository = {
      findOne: jest.fn(async ({ where }) => users.get(where.id) ?? null),
    };
    policy = {
      getProjectMembershipRole: jest.fn(
        async (resolvedProjectId: string, userId: string) =>
          memberships.get(membershipKey(resolvedProjectId, userId)) ?? null,
      ),
      isExternalActor: jest.fn().mockResolvedValue(false),
      isPlatformAdministrator: jest.fn(
        async (resolvedActor: AuthorizationActor) =>
          resolvedActor.roleId === UserRole.PlatformAdmin,
      ),
    };
    const resolver = new CanonicalCapabilityResolverService(
      policy as unknown as AuthorizationPolicyService,
    );
    service = new TaskAssignmentService(
      tasksRepository as unknown as Repository<Task>,
      projectMembersRepository as unknown as Repository<ProjectMember>,
      usersRepository as unknown as Repository<User>,
      resolver,
    );

    addUser(currentAssigneeId);
    addUser(targetAssigneeId);
    grantMembership(currentAssigneeId, ProjectRole.Contributor);
    grantMembership(targetAssigneeId, ProjectRole.Contributor);
  });

  it.each([
    [UserRole.ProjectManager, ProjectRole.Manager],
    [UserRole.TeamMember, ProjectRole.Manager],
    [UserRole.TeamMember, ProjectRole.Owner],
  ])(
    'allows global %s with project %s authority to assign an unassigned task',
    async (globalRole, projectRole) => {
      grantMembership(actorId, projectRole);

      const result = await service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(globalRole),
      );

      expect(result.assigneeId).toBe(targetAssigneeId);
      expect(tasksRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeId: targetAssigneeId,
          updatedById: actorId,
        }),
      );
    },
  );

  it('allows a manager to reassign user A to user B', async () => {
    persistedTask.assigneeId = currentAssigneeId;
    grantMembership(actorId, ProjectRole.Manager);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).resolves.toMatchObject({ assigneeId: targetAssigneeId });
  });

  it('uses caller-provided transactional repositories for canonical persistence', async () => {
    grantMembership(actorId, ProjectRole.Manager);
    const entityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Task) return tasksRepository;
        if (entity === ProjectMember) return projectMembersRepository;
        if (entity === User) return usersRepository;
        throw new Error(`Unexpected repository ${String(entity)}`);
      }),
    };

    await service.changeTaskAssignment(
      projectId,
      taskId,
      targetAssigneeId,
      actor(UserRole.TeamMember),
      entityManager as never,
    );

    expect(entityManager.getRepository).toHaveBeenCalledWith(Task);
    expect(entityManager.getRepository).toHaveBeenCalledWith(ProjectMember);
    expect(entityManager.getRepository).toHaveBeenCalledWith(User);
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: targetAssigneeId }),
    );
  });

  it('allows a manager to unassign an assigned task', async () => {
    persistedTask.assigneeId = currentAssigneeId;
    grantMembership(actorId, ProjectRole.Manager);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        null,
        actor(UserRole.TeamMember),
      ),
    ).resolves.toMatchObject({ assigneeId: null });
  });

  it('allows a contributor to reassign their own task', async () => {
    persistedTask.assigneeId = actorId;
    grantMembership(actorId, ProjectRole.Contributor);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.TeamMember),
      ),
    ).resolves.toMatchObject({ assigneeId: targetAssigneeId });
  });

  it('allows a contributor to unassign their own task', async () => {
    persistedTask.assigneeId = actorId;
    grantMembership(actorId, ProjectRole.Contributor);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        null,
        actor(UserRole.TeamMember),
      ),
    ).resolves.toMatchObject({ assigneeId: null });
  });

  it("denies a contributor reassignment of somebody else's task", async () => {
    persistedTask.assigneeId = currentAssigneeId;
    grantMembership(actorId, ProjectRole.Contributor);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.TeamMember),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('denies a contributor assignment of an unassigned task', async () => {
    grantMembership(actorId, ProjectRole.Contributor);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.TeamMember),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies task assignment without active project membership', async () => {
    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies a target outside the task project', async () => {
    grantMembership(actorId, ProjectRole.Manager);
    memberships.delete(membershipKey(projectId, targetAssigneeId));
    grantMembership(targetAssigneeId, ProjectRole.Contributor, otherProjectId);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies an inactive target', async () => {
    grantMembership(actorId, ProjectRole.Manager);
    addUser(targetAssigneeId, 'inactive');

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies a target user that does not exist', async () => {
    grantMembership(actorId, ProjectRole.Manager);
    users.delete(targetAssigneeId);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([UserRole.Customer, UserRole.Partner])(
    'denies an otherwise active target with ineligible %s role',
    async (roleName) => {
      grantMembership(actorId, ProjectRole.Manager);
      addUser(targetAssigneeId, 'active', roleName);

      await expect(
        service.changeTaskAssignment(
          projectId,
          taskId,
          targetAssigneeId,
          actor(UserRole.ProjectManager),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('returns the authoritative task without persisting an assignment no-op', async () => {
    persistedTask.assigneeId = actorId;
    grantMembership(actorId, ProjectRole.Contributor);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        actorId,
        actor(UserRole.TeamMember),
      ),
    ).resolves.toMatchObject({ assigneeId: actorId });
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('denies assignment mutation of a deleted task', async () => {
    persistedTask.deletedAt = new Date('2026-08-30T12:00:00.000Z');
    grantMembership(actorId, ProjectRole.Manager);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('preserves the summary-task assignment restriction', async () => {
    persistedTask.taskKind = TaskKind.Summary;
    grantMembership(actorId, ProjectRole.Manager);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows reassignment of a completed task', async () => {
    persistedTask.assigneeId = currentAssigneeId;
    persistedTask.status = TaskStatus.Done;
    persistedTask.percentComplete = 100;
    grantMembership(actorId, ProjectRole.Manager);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).resolves.toMatchObject({
      assigneeId: targetAssigneeId,
      percentComplete: 100,
      status: TaskStatus.Done,
    });
  });

  it('rejects a project/task mismatch', async () => {
    persistedTask.projectId = otherProjectId;
    grantMembership(actorId, ProjectRole.Manager);

    await expect(
      service.changeTaskAssignment(
        projectId,
        taskId,
        targetAssigneeId,
        actor(UserRole.ProjectManager),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function grantMembership(
    userId: string,
    role: ProjectRole,
    resolvedProjectId = projectId,
  ) {
    memberships.set(membershipKey(resolvedProjectId, userId), role);
  }

  function addUser(
    userId: string,
    status = 'active',
    roleName: UserRole = UserRole.TeamMember,
  ) {
    users.set(userId, {
      id: userId,
      role: { name: roleName },
      status,
    } as User);
  }
});

function actor(globalRole: UserRole): AuthorizationActor {
  return {
    roleId: globalRole,
    userId: actorId,
  };
}

function createTask(): Task {
  return {
    assigneeId: null,
    deletedAt: null,
    id: taskId,
    percentComplete: 0,
    project: { id: projectId, status: 'active' },
    projectId,
    status: TaskStatus.Backlog,
    taskKind: TaskKind.Standard,
    title: 'Canonical assignment task',
  } as Task;
}

function membershipKey(resolvedProjectId: string, userId: string): string {
  return `${resolvedProjectId}:${userId}`;
}
