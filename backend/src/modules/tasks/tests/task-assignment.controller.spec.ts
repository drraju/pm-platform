/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from '../entities/task.entity';
import { TaskAssignmentController } from '../task-assignment.controller';
import { TaskAssignmentService } from '../task-assignment.service';

const projectId = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const actorId = '33333333-3333-4333-8333-333333333333';
const currentAssigneeId = '44444444-4444-4444-8444-444444444444';
const targetAssigneeId = '55555555-5555-4555-8555-555555555555';

describe('TaskAssignmentController integration', () => {
  let app: INestApplication;
  let persistedTask: Task;
  let memberships: Map<string, ProjectRole>;
  let tasksRepository: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    persistedTask = createTask();
    memberships = new Map([
      [membershipKey(actorId), ProjectRole.Manager],
      [membershipKey(currentAssigneeId), ProjectRole.Contributor],
      [membershipKey(targetAssigneeId), ProjectRole.Contributor],
    ]);
    const users = new Map<string, User>([
      [currentAssigneeId, activeUser(currentAssigneeId)],
      [targetAssigneeId, activeUser(targetAssigneeId)],
    ]);
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
    const policy = {
      getProjectMembershipRole: jest.fn(
        async (resolvedProjectId: string, userId: string) =>
          memberships.get(membershipKey(userId, resolvedProjectId)) ?? null,
      ),
      isExternalActor: jest.fn().mockResolvedValue(false),
      isPlatformAdministrator: jest.fn(
        async ({ roleId }: { roleId: string }) =>
          roleId === UserRole.PlatformAdmin,
      ),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [TaskAssignmentController],
      providers: [
        TaskAssignmentService,
        CanonicalCapabilityResolverService,
        PermissionsGuard,
        {
          provide: AuthorizationPolicyService,
          useValue: policy,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(async ({ where }) =>
              memberships.has(membershipKey(where.userId, where.projectId))
                ? { id: `membership-${where.userId}` }
                : null,
            ),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(async ({ where }) => users.get(where.id) ?? null),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { email: string; roleId: string; userId: string };
          }>();
          if (!httpRequest.headers.authorization) {
            throw new UnauthorizedException();
          }
          httpRequest.user = {
            email: 'actor@example.com',
            roleId: httpRequest.headers['x-global-role'] ?? UserRole.TeamMember,
            userId: actorId,
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('enforces authentication on the canonical assignment routes', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/assign`)
      .send({ assigneeId: targetAssigneeId })
      .expect(401);
  });

  it('enforces backend project-role authorization on a direct HTTP request', async () => {
    memberships.delete(membershipKey(actorId));

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/assign`)
      .set('Authorization', 'Bearer test')
      .set('x-global-role', UserRole.ProjectManager)
      .send({ assigneeId: targetAssigneeId })
      .expect(403);

    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('denies assignment mutations in archived projects', async () => {
    persistedTask.project.status = 'archived';

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/assign`)
      .set('Authorization', 'Bearer test')
      .send({ assigneeId: targetAssigneeId })
      .expect(403);

    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('allows the Technical Manager scenario through the HTTP command', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/assign`)
      .set('Authorization', 'Bearer test')
      .set('x-global-role', UserRole.TeamMember)
      .send({ assigneeId: targetAssigneeId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.assigneeId).toBe(targetAssigneeId);
      });

    expect(tasksRepository.save).toHaveBeenCalledTimes(1);
  });

  it('does not let the assign route classify an assigned task as task.assign', async () => {
    persistedTask.assigneeId = currentAssigneeId;
    memberships.set(membershipKey(actorId), ProjectRole.Contributor);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/assign`)
      .set('Authorization', 'Bearer test')
      .set('x-global-role', UserRole.TeamMember)
      .send({ assigneeId: targetAssigneeId })
      .expect(403);

    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('allows a global project manager with contributor membership to reassign their own task', async () => {
    persistedTask.assigneeId = actorId;
    memberships.set(membershipKey(actorId), ProjectRole.Contributor);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/reassign`)
      .set('Authorization', 'Bearer test')
      .set('x-global-role', UserRole.ProjectManager)
      .send({ assigneeId: targetAssigneeId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.assigneeId).toBe(targetAssigneeId);
      });

    expect(tasksRepository.save).toHaveBeenCalledTimes(1);
  });

  it('does not let the reassign route classify an unassigned task as task.reassign', async () => {
    memberships.set(membershipKey(actorId), ProjectRole.Contributor);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/reassign`)
      .set('Authorization', 'Bearer test')
      .set('x-global-role', UserRole.TeamMember)
      .send({ assigneeId: targetAssigneeId })
      .expect(403);

    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('accepts null for unassignment and rejects a missing assignee field', async () => {
    persistedTask.assigneeId = currentAssigneeId;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/reassign`)
      .set('Authorization', 'Bearer test')
      .send({ assigneeId: null })
      .expect(200)
      .expect(({ body }) => {
        expect(body.assigneeId).toBeNull();
      });

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${taskId}/assign`)
      .set('Authorization', 'Bearer test')
      .send({})
      .expect(400);
  });
});

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
    title: 'HTTP assignment task',
  } as Task;
}

function activeUser(userId: string): User {
  return {
    id: userId,
    role: { name: UserRole.TeamMember },
    status: 'active',
  } as User;
}

function membershipKey(userId: string, resolvedProjectId = projectId): string {
  return `${resolvedProjectId}:${userId}`;
}
