/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
import {
  CanonicalCapability,
  TaskCapabilityResource,
} from '../../../common/authz/canonical-capability.types';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanningController } from '../../planning/planning.controller';
import { PlanningService } from '../../planning/planning.service';
import { MilestoneQueryService } from '../milestone-query.service';
import { MilestoneResponseMapper } from '../milestone-response.mapper';
import { ProjectsController } from '../../projects/projects.controller';
import { ProjectsService } from '../../projects/projects.service';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';

const projectId = '11111111-1111-4111-8111-111111111111';
const destinationProjectId = '22222222-2222-4222-8222-222222222222';
const archivedProjectId = '33333333-3333-4333-8333-333333333333';
const ownTaskId = '44444444-4444-4444-8444-444444444444';
const otherTaskId = '55555555-5555-4555-8555-555555555555';
const technicalManagerId = '66666666-6666-4666-8666-666666666666';
const contributorId = '77777777-7777-4777-8777-777777777777';
const viewerId = '88888888-8888-4888-8888-888888888888';
const missingMemberId = '99999999-9999-4999-8999-999999999999';
const platformAdminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type Actor = { email: string; roleId: string; userId: string };

describe('Slice 4A project-scoped HTTP authorization', () => {
  let app: INestApplication;
  let resolver: CanonicalCapabilityResolverService;
  const memberships = new Map<string, ProjectRole>();

  beforeEach(async () => {
    memberships.clear();
    setMembership(technicalManagerId, ProjectRole.Manager);
    setMembership(contributorId, ProjectRole.Contributor);
    setMembership(viewerId, ProjectRole.Viewer);
    setMembership(otherUserId, ProjectRole.Contributor);
    setMembership(
      technicalManagerId,
      ProjectRole.Manager,
      destinationProjectId,
    );

    const policy = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getActorRoleName: jest.fn(async (actor: Actor) => actor.roleId),
      getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
      getProjectMembershipRole: jest.fn(
        async (resolvedProjectId: string, userId: string) =>
          memberships.get(`${resolvedProjectId}:${userId}`) ?? null,
      ),
      isExternalActor: jest.fn().mockResolvedValue(false),
      isPlatformAdministrator: jest.fn(
        async (actor: Actor) => actor.roleId === UserRole.PlatformAdmin,
      ),
    };
    resolver = new CanonicalCapabilityResolverService(
      policy as unknown as AuthorizationPolicyService,
    );

    const authorize = async (
      actor: Actor,
      capability: CanonicalCapability,
      resource: TaskCapabilityResource,
      options: {
        changedFields?: readonly string[];
        destinationProjectId?: string;
        destinationProjectStatus?: string;
      } = {},
    ) => {
      const decision = await resolver.resolve({
        actor,
        capability,
        resource,
        ...options,
      });
      if (!decision.allowed) {
        throw new ForbiddenException(decision.reasonCode);
      }
    };

    const taskResource = (
      taskId = ownTaskId,
      resolvedProjectId = projectId,
    ): TaskCapabilityResource => ({
      assigneeId: taskId === ownTaskId ? contributorId : otherUserId,
      projectId: resolvedProjectId,
      projectStatus:
        resolvedProjectId === archivedProjectId ? 'archived' : 'active',
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      type: 'task',
    });

    const tasksService = {
      create: jest.fn(async (input, actor: Actor) => {
        await authorize(
          actor,
          'task.create',
          taskResource(ownTaskId, input.projectId),
        );
        return { id: ownTaskId, ...input };
      }),
      findAll: jest.fn().mockResolvedValue([{ id: otherTaskId, projectId }]),
      findMyTasks: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(async (taskId: string, actor: Actor) => {
        await authorize(actor, 'task.view', taskResource(taskId));
        return { id: taskId, projectId };
      }),
      getMyTasksSummary: jest.fn().mockResolvedValue({}),
      findExecutionUpdates: jest.fn().mockResolvedValue([]),
      remove: jest.fn(async (taskId: string, actor: Actor) => {
        await authorize(
          actor,
          'task.delete',
          taskResource(
            taskId,
            taskId === archivedProjectId ? archivedProjectId : projectId,
          ),
        );
      }),
      update: jest.fn(async (taskId: string, input, actor: Actor) => {
        const resource = taskResource(
          taskId,
          taskId === archivedProjectId ? archivedProjectId : projectId,
        );
        if (input.projectId && input.projectId !== resource.projectId) {
          await authorize(actor, 'task.move', resource, {
            destinationProjectId: input.projectId,
            destinationProjectStatus:
              input.projectId === archivedProjectId ? 'archived' : 'active',
          });
        } else if (
          input.status === TaskStatus.Done ||
          input.percentComplete === 100
        ) {
          await authorize(actor, 'task.edit_execution', resource, {
            changedFields: Object.keys(input),
          });
          await authorize(actor, 'task.complete', resource);
        } else if (
          Object.keys(input).some((field) =>
            ['percentComplete', 'remarks', 'status'].includes(field),
          )
        ) {
          await authorize(actor, 'task.edit_execution', resource, {
            changedFields: Object.keys(input),
          });
        } else {
          await authorize(actor, 'task.edit_plan', resource, {
            changedFields: Object.keys(input),
          });
        }
        return {
          id: taskId,
          ...input,
          projectId: input.projectId ?? projectId,
        };
      }),
    };

    const projectsService = {
      createProjectTask: jest.fn(async (resolvedProjectId, input, actor) => {
        await authorize(
          actor,
          'task.create',
          taskResource(ownTaskId, resolvedProjectId),
        );
        return { id: ownTaskId, projectId: resolvedProjectId, ...input };
      }),
      findAll: jest.fn().mockResolvedValue([{ id: projectId }]),
      findOne: jest.fn().mockResolvedValue({ id: projectId }),
      findProjectTasks: jest.fn(
        async (resolvedProjectId, _query, actor: Actor) => {
          await authorize(
            actor,
            'task.view',
            taskResource(otherTaskId, resolvedProjectId),
          );
          return [{ id: otherTaskId, projectId: resolvedProjectId }];
        },
      ),
      recordProjectTaskExecutionUpdate: jest.fn(
        async (resolvedProjectId, taskId, input, actor) => {
          const resource = taskResource(taskId, resolvedProjectId);
          await authorize(actor, 'task.record_update', resource, {
            changedFields: Object.keys(input).filter(
              (field) => field !== 'assigneeId',
            ),
          });
          if (
            input.status === TaskStatus.Done ||
            input.percentComplete === 100
          ) {
            await authorize(actor, 'task.complete', resource);
          }
          return { id: taskId, projectId: resolvedProjectId, ...input };
        },
      ),
      removeProjectTask: jest.fn(async (resolvedProjectId, taskId, actor) => {
        await authorize(
          actor,
          'task.delete',
          taskResource(taskId, resolvedProjectId),
        );
      }),
      updateProjectTask: jest.fn(
        async (resolvedProjectId, taskId, input, actor) => {
          const capability = Object.keys(input).some((field) =>
            ['percentComplete', 'remarks', 'status'].includes(field),
          )
            ? 'task.edit_execution'
            : 'task.edit_plan';
          await authorize(
            actor,
            capability,
            taskResource(taskId, resolvedProjectId),
            { changedFields: Object.keys(input) },
          );
          return { id: taskId, projectId: resolvedProjectId, ...input };
        },
      ),
    };

    const planningService = {
      createPlanningTask: jest.fn(async (resolvedProjectId, input, actor) => {
        await authorize(
          actor,
          'task.create',
          taskResource(ownTaskId, resolvedProjectId),
        );
        return { id: 'schedule-id', projectId: resolvedProjectId, ...input };
      }),
      updatePlanningTaskSchedule: jest.fn(
        async (resolvedProjectId, scheduleId, input, actor) => {
          await authorize(
            actor,
            'task.edit_plan',
            taskResource(ownTaskId, resolvedProjectId),
            { changedFields: Object.keys(input) },
          );
          return { id: scheduleId, projectId: resolvedProjectId, ...input };
        },
      ),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PlanningController, ProjectsController, TasksController],
      providers: [
        PermissionsGuard,
        { provide: AuthorizationPolicyService, useValue: policy },
        { provide: PlanningService, useValue: planningService },
        { provide: ProjectsService, useValue: projectsService },
        { provide: TasksService, useValue: tasksService },
        { provide: MilestoneQueryService, useValue: {} },
        { provide: MilestoneResponseMapper, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: Actor;
          }>();
          if (!httpRequest.headers.authorization) {
            throw new UnauthorizedException();
          }
          httpRequest.user = {
            email: 'actor@example.com',
            roleId: httpRequest.headers['x-global-role'] ?? UserRole.TeamMember,
            userId: httpRequest.headers['x-user-id'] ?? missingMemberId,
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

  afterEach(async () => app.close());

  it('allows a global TEAM_MEMBER with project-manager task and Planning authority', async () => {
    const auth = asActor(technicalManagerId, UserRole.TeamMember);

    await request(app.getHttpServer())
      .post('/tasks')
      .set(auth)
      .send({ projectId, title: 'Technical manager task' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set(auth)
      .send({ title: 'Project task' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/planning/projects/${projectId}/tasks`)
      .set(auth)
      .send({ title: 'Planning task' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/planning/projects/${projectId}/task-schedules/schedule-1`)
      .set(auth)
      .send({ taskTitle: 'Updated schedule task' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/tasks/${otherTaskId}`)
      .set(auth)
      .send({ title: 'Manager plan edit' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks/${otherTaskId}/execution-updates`)
      .set(auth)
      .send({
        percentComplete: 60,
        priority: 'high',
        status: TaskStatus.InProgress,
      })
      .expect(201);
  });

  it('limits a global PROJECT_MANAGER with contributor membership to own execution', async () => {
    const auth = asActor(contributorId, UserRole.ProjectManager);

    await request(app.getHttpServer())
      .post('/tasks')
      .set(auth)
      .send({ projectId, title: 'Forbidden create' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/tasks/${ownTaskId}`)
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/planning/projects/${projectId}/task-schedules/schedule-1`)
      .set(auth)
      .send({ taskTitle: 'Forbidden plan edit' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tasks/${ownTaskId}`)
      .set(auth)
      .send({ percentComplete: 50, status: TaskStatus.InProgress })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/tasks/${ownTaskId}`)
      .set(auth)
      .send({ percentComplete: 100, status: TaskStatus.Done })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/tasks/${otherTaskId}`)
      .set(auth)
      .send({ percentComplete: 50, status: TaskStatus.InProgress })
      .expect(403);
  });

  it('keeps viewers read-only and denies missing membership', async () => {
    await request(app.getHttpServer())
      .get(`/tasks/${ownTaskId}`)
      .set(asActor(viewerId, UserRole.ProjectManager))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/tasks/${ownTaskId}`)
      .set(asActor(viewerId, UserRole.ProjectManager))
      .send({ status: TaskStatus.InProgress })
      .expect(403);
    await request(app.getHttpServer())
      .post('/tasks')
      .set(asActor(missingMemberId, UserRole.ProjectManager))
      .send({ projectId, title: 'No membership' })
      .expect(403);
  });

  it('allows Executive project and task reads without membership while preserving task mutation denial', async () => {
    const auth = asActor(missingMemberId, UserRole.Executive);

    await request(app.getHttpServer()).get('/projects').set(auth).expect(200);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer()).get('/tasks').set(auth).expect(200);
    await request(app.getHttpServer())
      .get(`/tasks/${otherTaskId}`)
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set(auth)
      .expect(200);

    await request(app.getHttpServer())
      .post('/tasks')
      .set(auth)
      .send({ projectId, title: 'Forbidden Executive create' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tasks/${otherTaskId}`)
      .set(auth)
      .send({ title: 'Forbidden Executive edit' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/tasks/${otherTaskId}`)
      .set(auth)
      .expect(403);
  });

  it('allows PLATFORM_ADMIN but preserves archived and destination integrity', async () => {
    const auth = asActor(platformAdminId, UserRole.PlatformAdmin);

    await request(app.getHttpServer())
      .post('/tasks')
      .set(auth)
      .send({ projectId, title: 'Admin task' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/tasks')
      .set(auth)
      .send({ projectId: archivedProjectId, title: 'Archived task' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tasks/${archivedProjectId}`)
      .set(auth)
      .send({ status: TaskStatus.Done })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/tasks/${archivedProjectId}`)
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/planning/projects/${archivedProjectId}/tasks`)
      .set(auth)
      .send({ title: 'Archived planning task' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(
        `/planning/projects/${archivedProjectId}/task-schedules/schedule-1`,
      )
      .set(auth)
      .send({ taskTitle: 'Archived plan edit' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/tasks/${ownTaskId}`)
      .set(auth)
      .send({ projectId: archivedProjectId })
      .expect(403);
  });

  it('requires independent destination authority for task movement', async () => {
    memberships.delete(`${destinationProjectId}:${technicalManagerId}`);

    await request(app.getHttpServer())
      .patch(`/tasks/${otherTaskId}`)
      .set(asActor(technicalManagerId, UserRole.TeamMember))
      .send({ projectId: destinationProjectId })
      .expect(403);
  });

  function setMembership(
    userId: string,
    role: ProjectRole,
    resolvedProjectId = projectId,
  ) {
    memberships.set(`${resolvedProjectId}:${userId}`, role);
  }
});

function asActor(userId: string, globalRole: UserRole) {
  return {
    Authorization: 'Bearer test',
    'x-global-role': globalRole,
    'x-user-id': userId,
  };
}
