/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectHealthService } from '../../health/project-health.service';
import { SchedulingFoundationService } from '../../../common/scheduling/scheduling-foundation.service';
import { Task } from '../../tasks/entities/task.entity';
import { TasksController } from '../../tasks/tasks.controller';
import { TasksService } from '../../tasks/tasks.service';
import { TaskAssignmentController } from '../../tasks/task-assignment.controller';
import { TaskAssignmentService } from '../../tasks/task-assignment.service';
import { MilestoneQueryService } from '../../tasks/milestone-query.service';
import { MilestoneResponseMapper } from '../../tasks/milestone-response.mapper';
import { ProjectsController } from '../projects.controller';
import { ProjectsService } from '../projects.service';
import { ProjectVisibilityService } from '../project-visibility.service';

const projectId = '11111111-1111-4111-8111-111111111111';
const managerId = '22222222-2222-4222-8222-222222222222';
const customerId = '33333333-3333-4333-8333-333333333333';
const taskId = '44444444-4444-4444-8444-444444444444';
const otherTaskId = '55555555-5555-4555-8555-555555555555';
const repo = <T extends object>(value: object = {}) => value as Repository<T>;

// Real controllers, permission guard, policy, resolver and domain services.
// Only authentication and persistence are replaced by deterministic fixtures.
describe('CUSTOMER participation HTTP boundaries', () => {
  let app: INestApplication;
  let members: any[];
  let users: any[];
  let tasks: any[];
  let candidateReads: jest.Mock;

  beforeEach(async () => {
    members = [
      {
        id: managerId,
        projectId,
        userId: managerId,
        role: ProjectRole.Manager,
      },
    ];
    users = [
      {
        id: managerId,
        firstName: 'Project',
        lastName: 'Manager',
        email: 'manager@example.com',
        status: 'active',
        role: { name: UserRole.ProjectManager },
      },
      {
        id: customerId,
        firstName: 'Customer',
        lastName: 'One',
        email: 'customer@example.com',
        status: 'active',
        role: { name: UserRole.Customer },
      },
    ];
    const project = {
      id: projectId,
      name: 'Customer project',
      status: 'active',
      tasks: [],
      risks: [],
      issues: [],
      budget: 999,
    };
    tasks = [
      {
        id: taskId,
        projectId,
        project,
        title: 'Customer action',
        status: 'todo',
        taskKind: 'standard',
        percentComplete: 0,
        assigneeId: null,
        remarks: 'Internal only',
      },
      {
        id: otherTaskId,
        projectId,
        project,
        title: 'Private work',
        status: 'todo',
        taskKind: 'standard',
        assigneeId: managerId,
      },
    ];
    const matches = (row: any, where: any): boolean =>
      Array.isArray(where)
        ? where.some((condition) => matches(row, condition))
        : Object.entries(where ?? {}).every(
            ([key, value]) => typeof value === 'object' || row[key] === value,
          );
    const projectsRepo = repo<any>({
      findOne: async ({ where }: any) =>
        matches(project, where) ? project : null,
      find: async () => [project],
    });
    const membersRepo = repo<any>({
      findOne: async ({ where, withDeleted }: any) => {
        const member = members.find(
          (row) => (withDeleted || !row.deletedAt) && matches(row, where),
        );
        return member
          ? { ...member, user: users.find((user) => user.id === member.userId) }
          : null;
      },
      find: async ({ where }: any) =>
        members.filter((row) => !row.deletedAt && matches(row, where)),
      create: (input: any) => input,
      save: async (input: any) => {
        const member = { ...input, id: input.id ?? customerId };
        members = [...members.filter((row) => row.id !== member.id), member];
        return member;
      },
    });
    candidateReads = jest.fn(async () =>
      users.filter(
        (user) =>
          user.status === 'active' &&
          user.role.name !== UserRole.Partner &&
          !members.some(
            (member) => !member.deletedAt && member.userId === user.id,
          ),
      ),
    );
    const candidateQuery: any = { getMany: candidateReads };
    for (const method of [
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'take',
    ])
      candidateQuery[method] = () => candidateQuery;
    const usersRepo = repo<any>({
      findOne: async ({ where }: any) =>
        users.find((user) => matches(user, where)),
      createQueryBuilder: () => candidateQuery,
    });
    const rolesRepo = repo<any>({
      findOne: async ({ where }: any) => ({
        name: where.id,
        // Deliberately stale mutation grants verify the CUSTOMER ceiling.
        permissions: Object.values(PermissionKey)
          .filter(
            (key) =>
              ![
                'portfolio.view',
                'executive.view',
                'user.manage',
                'role.manage',
                'permission.manage',
              ].includes(key),
          )
          .map((key) => ({ key })),
      }),
    });
    const taskQuery: any = {
      getMany: async () =>
        tasks.filter((task) => task.assigneeId === customerId),
    };
    for (const method of [
      'innerJoinAndSelect',
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
    ])
      taskQuery[method] = () => taskQuery;
    const tasksRepo = repo<Task>({
      findOne: async ({ where }: any) =>
        tasks.find((task) => matches(task, where)) ?? null,
      find: async ({ where }: any) =>
        tasks.filter((task) => matches(task, where)),
      save: async (task: any) => {
        tasks = tasks.map((row) => (row.id === task.id ? task : row));
        return task;
      },
      createQueryBuilder: () => taskQuery,
    });
    const policy = new AuthorizationPolicyService(
      projectsRepo,
      membersRepo,
      tasksRepo,
      rolesRepo,
    );
    const resolver = new CanonicalCapabilityResolverService(policy);
    const visibility = new ProjectVisibilityService(
      projectsRepo,
      membersRepo,
      tasksRepo,
      policy,
      resolver,
    );
    const assignment = new TaskAssignmentService(
      tasksRepo,
      membersRepo,
      usersRepo,
      resolver,
    );
    const updateQuery: any = { getMany: async () => [] };
    for (const method of ['distinctOn', 'where', 'orderBy', 'addOrderBy'])
      updateQuery[method] = () => updateQuery;
    const tasksService = new TasksService(
      tasksRepo,
      repo({ createQueryBuilder: () => updateQuery }),
      membersRepo,
      policy,
      resolver,
      visibility,
      {} as SchedulingFoundationService,
      assignment,
    );
    const projectsService = new ProjectsService(
      projectsRepo,
      membersRepo,
      repo(),
      repo(),
      tasksRepo,
      repo(),
      usersRepo,
      rolesRepo,
      new ProjectHealthService(),
      policy,
      resolver,
      visibility,
      {} as SchedulingFoundationService,
      assignment,
      tasksService,
    );
    const module = await Test.createTestingModule({
      controllers: [
        ProjectsController,
        TasksController,
        TaskAssignmentController,
      ],
      providers: [
        PermissionsGuard,
        { provide: ProjectsService, useValue: projectsService },
        { provide: TasksService, useValue: tasksService },
        { provide: TaskAssignmentService, useValue: assignment },
        { provide: AuthorizationPolicyService, useValue: policy },
        { provide: MilestoneQueryService, useValue: {} },
        { provide: MilestoneResponseMapper, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-role'];
          if (!role) throw new UnauthorizedException();
          req.user = {
            roleId: role,
            userId: role === UserRole.ProjectManager ? managerId : customerId,
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  const asManager = (req: request.Test) =>
    req.set('x-role', UserRole.ProjectManager);
  const asCustomer = (req: request.Test) =>
    req.set('x-role', UserRole.Customer);

  it('discovers, adds, assigns and reads a CUSTOMER viewer without internal fields', async () => {
    const candidates = await asManager(
      request(app.getHttpServer()).get(
        `/projects/${projectId}/member-candidates?search=Customer`,
      ),
    ).expect(200);
    expect(candidates.body).toEqual([
      {
        id: customerId,
        displayName: 'Customer One',
        email: 'customer@example.com',
        globalRoleName: 'CUSTOMER',
        allowedProjectRoles: ['viewer'],
      },
    ]);
    await asManager(
      request(app.getHttpServer()).post(`/projects/${projectId}/members`),
    )
      .send({ userId: customerId, role: 'viewer' })
      .expect(201);
    expect(users[1].role.name).toBe(UserRole.Customer);
    await asManager(
      request(app.getHttpServer()).post(
        `/projects/${projectId}/tasks/${taskId}/assign`,
      ),
    )
      .send({ assigneeId: customerId })
      .expect(200);
    const summary = await asCustomer(
      request(app.getHttpServer()).get(`/projects/${projectId}`),
    ).expect(200);
    expect(summary.body).toMatchObject({
      name: 'Customer project',
      status: 'active',
    });
    expect(summary.body).not.toHaveProperty('budget');
    const own = await asCustomer(
      request(app.getHttpServer()).get(`/tasks/${taskId}`),
    ).expect(200);
    expect(own.body).toMatchObject({
      id: taskId,
      status: 'todo',
      assigneeId: customerId,
    });
    expect(own.body).not.toHaveProperty('remarks');
    expect(own.body).not.toHaveProperty('project');
    await asCustomer(
      request(app.getHttpServer()).get(`/tasks/${otherTaskId}`),
    ).expect(404);
    const override = await asCustomer(
      request(app.getHttpServer()).get(
        `/projects/${projectId}/tasks?assigneeId=${managerId}`,
      ),
    ).expect(200);
    expect(override.body).toEqual([]);
    const list = await asCustomer(
      request(app.getHttpServer()).get(`/projects/${projectId}/tasks`),
    ).expect(200);
    expect(list.body.map((task: any) => task.id)).toEqual([taskId]);
    const my = await asCustomer(
      request(app.getHttpServer()).get('/tasks/my'),
    ).expect(200);
    expect(my.body.map((task: any) => task.id)).toEqual([taskId]);
    expect(
      (
        await asCustomer(
          request(app.getHttpServer()).get('/tasks/my/summary'),
        ).expect(200)
      ).body.totalTasks,
    ).toBe(1);
    members.find((member) => member.userId === customerId).deletedAt =
      new Date();
    await asCustomer(
      request(app.getHttpServer()).get(`/projects/${projectId}`),
    ).expect(403);
    await asCustomer(
      request(app.getHttpServer()).get(`/tasks/${taskId}`),
    ).expect(403);
    expect(
      (
        await asCustomer(request(app.getHttpServer()).get('/tasks/my')).expect(
          200,
        )
      ).body,
    ).toEqual([]);
    expect(
      (
        await asCustomer(
          request(app.getHttpServer()).get('/tasks/my/summary'),
        ).expect(200)
      ).body.totalTasks,
    ).toBe(0);
  });

  it('enforces candidate authentication, scope and search validation', async () => {
    const url = `/projects/${projectId}/member-candidates`;
    await request(app.getHttpServer()).get(url).expect(401);
    await asCustomer(request(app.getHttpServer()).get(url)).expect(403);
    expect(candidateReads).not.toHaveBeenCalled();
    await asManager(
      request(app.getHttpServer()).get(`${url}?search=${'x'.repeat(101)}`),
    ).expect(400);
    members = [];
    await asManager(request(app.getHttpServer()).get(url)).expect(403);
    expect(candidateReads).not.toHaveBeenCalled();
  });

  it('rejects customer team and task mutations, including legacy contributor no-ops', async () => {
    members.push({
      id: customerId,
      projectId,
      userId: customerId,
      role: ProjectRole.Contributor,
    });
    tasks[0].assigneeId = customerId;
    await asCustomer(
      request(app.getHttpServer()).post(`/projects/${projectId}/members`),
    )
      .send({ userId: customerId, role: 'viewer' })
      .expect(403);
    for (const operation of ['assign', 'reassign']) {
      for (const assigneeId of [customerId, managerId]) {
        await asCustomer(
          request(app.getHttpServer()).post(
            `/projects/${projectId}/tasks/${taskId}/${operation}`,
          ),
        )
          .send({ assigneeId })
          .expect(403);
      }
    }
    for (const body of [{}, { status: 'done' }, { title: 'Changed' }]) {
      await asCustomer(request(app.getHttpServer()).patch(`/tasks/${taskId}`))
        .send(body)
        .expect(403);
    }
    await asCustomer(
      request(app.getHttpServer()).delete(`/tasks/${taskId}`),
    ).expect(403);
  });

  it.each(['owner', 'manager'])(
    'rejects CUSTOMER %s membership',
    async (role) => {
      await asManager(
        request(app.getHttpServer()).post(`/projects/${projectId}/members`),
      )
        .send({ userId: customerId, role })
        .expect(400);
    },
  );

  it('restores removed viewer membership without changing the global role', async () => {
    members.push({
      id: customerId,
      projectId,
      userId: customerId,
      role: ProjectRole.Viewer,
      deletedAt: new Date(),
    });
    await asManager(
      request(app.getHttpServer()).post(`/projects/${projectId}/members`),
    )
      .send({ userId: customerId, role: 'viewer' })
      .expect(201);
    expect(
      members.filter((member) => member.userId === customerId),
    ).toHaveLength(1);
    expect(
      members.find((member) => member.userId === customerId).deletedAt,
    ).toBeNull();
    expect(users[1].role.name).toBe(UserRole.Customer);
  });
});
