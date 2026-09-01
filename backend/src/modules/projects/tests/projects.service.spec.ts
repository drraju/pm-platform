import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
import { INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE } from '../../../common/authz/project-role-eligibility';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskType } from '../../../common/enums/task-type.enum';
import { SchedulingFoundationService } from '../../../common/scheduling/scheduling-foundation.service';
import { ProjectHealthStatus } from '../../health/dto/project-health.dto';
import { ProjectHealthService } from '../../health/project-health.service';
import { ProjectBaselineTask } from '../entities/project-baseline-task.entity';
import { ProjectBaseline } from '../entities/project-baseline.entity';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Role } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { ProjectVisibilityService } from '../project-visibility.service';
import { ProjectsService } from '../projects.service';
import { PlanningSnapshotService } from '../../planning/planning-snapshot.service';
import { TaskAssignmentService } from '../../tasks/task-assignment.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const projectId = '2bbca1cb-1be2-4a04-b857-f1f8c7a26800';
const userId = 'f308d314-4cf3-4bc0-9607-e7ad88f264b8';
const taskId = '32b10c65-8a4b-4e03-a58c-ffea2ec860e6';

type BaselineFindOptions = {
  where: {
    id?: string;
    isCurrent?: boolean;
  };
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let projectBaselinesRepository: MockRepository<ProjectBaseline>;
  let projectBaselineTasksRepository: MockRepository<ProjectBaselineTask>;
  let tasksRepository: MockRepository<Task>;
  let taskDependenciesRepository: MockRepository<TaskDependency>;
  let usersRepository: MockRepository<User>;
  let rolesRepository: MockRepository<Role>;
  let authorizationPolicyService: {
    canDeleteProject: jest.Mock;
    canManageProject: jest.Mock;
    canManageTask: jest.Mock;
    hasPermission: jest.Mock;
    isExternalActor: jest.Mock;
  };
  let projectVisibilityService: {
    canViewProject: jest.Mock;
    getVisibleProjects: jest.Mock;
  };
  let planningSnapshotService: {
    rebuildWorkspaceSnapshot: jest.Mock;
  };
  let taskAssignmentService: { changeTaskAssignment: jest.Mock };
  let canonicalCapabilityResolver: { resolve: jest.Mock };
  let transactionalEntityManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    getRepository: jest.Mock;
    query: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  const actor = {
    email: 'owner@example.com',
    roleId: 'role-id',
    userId,
  };

  beforeEach(async () => {
    projectsRepository = {
      create: jest.fn((input: Partial<Project>) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input: Partial<Project>) =>
        Promise.resolve({ id: projectId, ...input }),
      ),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    projectMembersRepository = {
      create: jest.fn((input: Partial<ProjectMember>) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input: Partial<ProjectMember>) =>
        Promise.resolve({ id: 'member-id', ...input }),
      ),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    projectBaselinesRepository = {
      create: jest.fn((input: Partial<ProjectBaseline>) => input),
      findOne: jest.fn(),
      save: jest.fn((input: Partial<ProjectBaseline>) =>
        Promise.resolve({ id: 'project-baseline-id', ...input }),
      ),
    };
    projectBaselineTasksRepository = {
      create: jest.fn((input: Partial<ProjectBaselineTask>) => input),
      save: jest.fn((input: Partial<ProjectBaselineTask>) =>
        Promise.resolve(input),
      ),
    };
    tasksRepository = {
      create: jest.fn((input: Partial<Task>) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input: Partial<Task>) =>
        Promise.resolve({ id: taskId, ...input }),
      ),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    transactionalEntityManager = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn((entity) =>
        Promise.resolve(entity === Project ? { id: projectId } : null),
      ),
      getRepository: jest.fn((entity) => {
        if (entity === Task) return tasksRepository;
        throw new Error(`Unexpected repository ${String(entity)}`);
      }),
      query: jest.fn((sql: string) =>
        Promise.resolve(
          sql.toLowerCase().includes('select count') ? [{ count: 0 }] : [],
        ),
      ),
      save: jest.fn((entity, input) => {
        if (entity === ProjectBaseline) {
          return Promise.resolve({ id: 'project-baseline-id', ...input });
        }

        if (entity === Project) {
          return Promise.resolve({ id: projectId, ...input });
        }

        if (entity === ProjectMember) {
          return Promise.resolve({ id: 'member-id', ...input });
        }

        return Promise.resolve(input);
      }),
      update: jest.fn(() => Promise.resolve()),
    };
    const transactionMock = jest.fn(
      (
        callback: (manager: typeof transactionalEntityManager) => unknown,
      ): unknown => callback(transactionalEntityManager),
    );
    projectsRepository.manager = {
      transaction: transactionMock,
    } as unknown as Repository<Project>['manager'];
    taskDependenciesRepository = {
      create: jest.fn((input: Partial<TaskDependency>) => input),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((input: Partial<TaskDependency>) =>
        Promise.resolve({ id: 'task-dependency-id', ...input }),
      ),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    usersRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        role: { name: UserRole.ProjectManager },
      }),
    };
    rolesRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'role-id',
        name: UserRole.PlatformAdmin,
      }),
    };
    authorizationPolicyService = {
      canDeleteProject: jest.fn().mockResolvedValue(true),
      canManageProject: jest.fn().mockResolvedValue(true),
      canManageTask: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };
    projectVisibilityService = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getVisibleProjects: jest.fn().mockResolvedValue([{ id: projectId }]),
    };
    planningSnapshotService = {
      rebuildWorkspaceSnapshot: jest.fn().mockResolvedValue(undefined),
    };
    taskAssignmentService = {
      changeTaskAssignment: jest.fn(
        (...args: [string, string, string | null]) =>
          Promise.resolve({
            assigneeId: args[2],
            id: args[1],
            projectId,
            title: 'Complete steering committee readout',
          }),
      ),
    };
    canonicalCapabilityResolver = {
      resolve: jest.fn().mockResolvedValue({
        allowed: true,
        audience: 'internal',
        reasonCode: 'GRANTED',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        SchedulingFoundationService,
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        {
          provide: getRepositoryToken(ProjectBaseline),
          useValue: projectBaselinesRepository,
        },
        {
          provide: getRepositoryToken(ProjectBaselineTask),
          useValue: projectBaselineTasksRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(TaskDependency),
          useValue: taskDependenciesRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: rolesRepository,
        },
        ProjectHealthService,
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
        {
          provide: CanonicalCapabilityResolverService,
          useValue: canonicalCapabilityResolver,
        },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
        {
          provide: PlanningSnapshotService,
          useValue: planningSnapshotService,
        },
        {
          provide: TaskAssignmentService,
          useValue: taskAssignmentService,
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  it('creates a project from the existing DTO shape', async () => {
    const result = await service.create(
      {
        name: 'ERP Modernization',
        description: 'Finance platform delivery',
        status: 'active',
        targetEndDate: '2026-09-30',
      },
      actor,
    );

    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      ownerId: userId,
      status: 'active',
      targetEndDate: '2026-09-30',
    });
    expect(projectsRepository.manager.transaction).toHaveBeenCalled();
    expect(transactionalEntityManager.save).toHaveBeenCalledWith(
      Project,
      expect.objectContaining({
        name: 'ERP Modernization',
        ownerId: userId,
      }),
    );
    expect(projectMembersRepository.create).toHaveBeenCalledWith({
      createdById: userId,
      projectId,
      role: ProjectRole.Owner,
      updatedById: userId,
      userId,
    });
    expect(transactionalEntityManager.save).toHaveBeenCalledWith(
      ProjectMember,
      expect.objectContaining({
        projectId,
        role: ProjectRole.Owner,
        userId,
      }),
    );
    expect(projectMembersRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: projectId,
        name: 'ERP Modernization',
        ownerId: userId,
      }),
    );
  });

  it('rejects direct archived status during project creation', async () => {
    await expect(
      service.create(
        {
          name: 'Archived project',
          status: 'archived',
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(projectsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('overrides any incoming ownerId with the authenticated creator', async () => {
    await service.create(
      {
        name: 'ERP Modernization',
        ownerId: 'different-user-id',
      },
      actor,
    );

    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'ERP Modernization',
      ownerId: userId,
    });
  });

  it('requires an authenticated creator when creating a project', async () => {
    await expect(
      service.create({
        name: 'ERP Modernization',
      }),
    ).rejects.toThrow('Authenticated user is required');
  });

  it.each([UserRole.Customer, UserRole.Partner])(
    'does not create an Owner membership for a %s creator even if project-create permission is granted',
    async (globalRole) => {
      usersRepository.findOne?.mockResolvedValue({
        id: userId,
        role: { name: globalRole },
      });

      await expect(
        service.create({ name: 'External-owned project' }, actor),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          reasonCode: INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE,
        }),
      });
      expect(projectsRepository.manager.transaction).not.toHaveBeenCalled();
    },
  );

  it('rolls back project creation when owner membership creation fails', async () => {
    const failure = new Error('membership insert failed');
    transactionalEntityManager.save.mockImplementation((entity, input) => {
      if (entity === Project) {
        return Promise.resolve({ id: projectId, ...input });
      }
      if (entity === ProjectMember) {
        return Promise.reject(failure);
      }
      return Promise.resolve(input);
    });

    await expect(
      service.create(
        {
          name: 'ERP Modernization',
        },
        actor,
      ),
    ).rejects.toThrow('membership insert failed');

    expect(projectsRepository.manager.transaction).toHaveBeenCalled();
  });

  it('lists projects with owner details newest first', async () => {
    projectVisibilityService.getVisibleProjects.mockResolvedValue([
      { id: projectId },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({
        health: {
          reasons: [
            'No critical issues, high risks, or overdue task threshold breaches',
          ],
          status: ProjectHealthStatus.Green,
        },
        id: projectId,
        taskCounts: {
          milestones: 0,
          phases: 0,
          tasks: 0,
        },
        tasks: [],
      }),
    ]);
    expect(projectVisibilityService.getVisibleProjects).toHaveBeenCalledWith(
      undefined,
    );
  });

  it('hides archived projects from the normal project list', async () => {
    projectVisibilityService.getVisibleProjects.mockResolvedValue([
      { id: 'active-project', status: 'active' },
      { id: 'archived-project', status: 'archived' },
    ]);

    await expect(service.findAll(actor)).resolves.toEqual([
      expect.objectContaining({ id: 'active-project' }),
    ]);

    await expect(
      service.findAll(actor, { lifecycle: 'archived' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'archived-project' })]);
  });

  it('loads project details with members, tasks, and RAID context', async () => {
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      tasks: [
        {
          id: 'phase-1',
          plannedEndDate: '2026-07-21',
          plannedStartDate: '2026-07-01',
          projectId,
          status: TaskStatus.Backlog,
          taskKind: TaskKind.Summary,
          title: 'Planning',
        },
        {
          id: 'task-1',
          parentTaskId: 'phase-1',
          percentComplete: 100,
          plannedEndDate: '2026-07-10',
          plannedStartDate: '2026-07-02',
          projectId,
          status: TaskStatus.Done,
          taskKind: TaskKind.Standard,
          title: 'Scope',
        },
        {
          id: 'task-2',
          parentTaskId: 'phase-1',
          percentComplete: 0,
          plannedEndDate: '2026-07-18',
          plannedStartDate: '2026-07-11',
          projectId,
          status: TaskStatus.InProgress,
          taskKind: TaskKind.Standard,
          title: 'Design',
        },
      ],
    });

    const result = await service.findOne(projectId);

    expect(result).toEqual(
      expect.objectContaining({
        health: {
          reasons: [
            'No critical issues, high risks, or overdue task threshold breaches',
          ],
          status: ProjectHealthStatus.Green,
        },
        id: projectId,
        taskCounts: {
          milestones: 0,
          phases: 1,
          tasks: 2,
        },
      }),
    );
    expect(result.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          childTaskCount: 2,
          id: 'phase-1',
          phaseEndDate: '2026-07-18',
          phaseProgress: 50,
          phaseStartDate: '2026-07-02',
        }),
      ]),
    );
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: projectId },
      relations: {
        assumptions: { owner: true },
        businessOwner: true,
        dependencies: { owner: true },
        deliveryLead: true,
        executiveSponsor: true,
        issues: { owner: true },
        members: { user: { role: true } },
        owner: true,
        risks: { owner: true },
        tasks: { assignee: true },
      },
    });
  });

  it.each([
    ['Customer', 'customer-role', 'customer-1'],
    ['Partner', 'partner-role', 'partner-1'],
  ])(
    'returns a conservative project projection to %s actors',
    async (_audience, roleId, externalUserId) => {
      authorizationPolicyService.isExternalActor.mockResolvedValue(true);
      projectsRepository.findOne?.mockResolvedValue({
        assumptions: [{ id: 'assumption-1', title: 'Internal assumption' }],
        businessOwner: { email: 'business-owner@example.com', id: 'owner-1' },
        createdAt: new Date('2026-01-01T00:00:00Z'),
        dependencies: [],
        description: 'Approved project description',
        id: projectId,
        issues: [{ id: 'issue-1', title: 'Internal issue' }],
        members: [{ id: 'member-1', userId: userId }],
        name: 'ERP Modernization',
        risks: [{ id: 'risk-1', title: 'Internal risk' }],
        startDate: '2026-01-01',
        status: 'active',
        targetEndDate: '2026-12-31',
        tasks: [{ id: taskId, projectId, title: 'Internal task detail' }],
        updatedAt: new Date('2026-02-01T00:00:00Z'),
      });

      const result = await service.findOne(projectId, {
        roleId,
        userId: externalUserId,
      });

      expect(result.health.status).toEqual(expect.any(String));
      expect(result).toEqual({
        createdAt: new Date('2026-01-01T00:00:00Z'),
        description: 'Approved project description',
        health: {
          reasons: [],
          status: result.health.status,
        },
        id: projectId,
        name: 'ERP Modernization',
        startDate: '2026-01-01',
        status: 'active',
        targetEndDate: '2026-12-31',
        updatedAt: new Date('2026-02-01T00:00:00Z'),
      });
      expect(result).not.toHaveProperty('members');
      expect(result).not.toHaveProperty('risks');
      expect(result).not.toHaveProperty('tasks');
      expect(result).not.toHaveProperty('businessOwner');
    },
  );

  it('throws when project details are missing', async () => {
    projectsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findOne(projectId)).rejects.toThrow(NotFoundException);
  });

  it('lists project RAID collections from project details', async () => {
    const project = {
      id: projectId,
      assumptions: [{ id: 'assumption-id', projectId }],
      dependencies: [{ id: 'dependency-id', projectId }],
      issues: [{ id: 'issue-id', projectId }],
      risks: [{ id: 'risk-id', projectId }],
    };
    projectsRepository.findOne?.mockResolvedValue(project);

    await expect(service.findProjectRisks(projectId)).resolves.toEqual(
      project.risks,
    );
    await expect(service.findProjectIssues(projectId)).resolves.toEqual(
      project.issues,
    );
    await expect(service.findProjectAssumptions(projectId)).resolves.toEqual(
      project.assumptions,
    );
    await expect(service.findProjectDependencies(projectId)).resolves.toEqual(
      project.dependencies,
    );
    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: projectId },
      relations: {
        assumptions: { owner: true },
        businessOwner: true,
        dependencies: { owner: true },
        deliveryLead: true,
        executiveSponsor: true,
        issues: { owner: true },
        members: { user: { role: true } },
        owner: true,
        risks: { owner: true },
        tasks: { assignee: true },
      },
    });
  });

  it('updates an existing project', async () => {
    const project = { id: projectId, name: 'Original', status: 'active' };
    projectsRepository.findOne?.mockResolvedValue(project);

    await service.update(projectId, { name: 'Updated', status: 'at_risk' });

    expect(projectsRepository.save).toHaveBeenCalledWith({
      id: projectId,
      name: 'Updated',
      status: 'at_risk',
    });
  });

  it('denies Executive legacy project and membership mutations before persistence', async () => {
    const executiveActor = {
      email: 'executive@example.com',
      roleId: 'role-EXECUTIVE',
      userId: 'executive-id',
    };
    authorizationPolicyService.hasPermission.mockResolvedValue(false);
    authorizationPolicyService.canManageProject.mockResolvedValue(false);
    authorizationPolicyService.canDeleteProject.mockResolvedValue(false);
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      status: 'active',
    });

    const mutations = [
      () => service.create({ name: 'Forbidden project' }, executiveActor),
      () =>
        service.update(projectId, { name: 'Forbidden update' }, executiveActor),
      () => service.archive(projectId, executiveActor),
      () => service.remove(projectId, executiveActor),
      () => service.restore(projectId, executiveActor),
      () =>
        service.addMember(
          projectId,
          { role: ProjectRole.Owner, userId },
          executiveActor,
        ),
      () =>
        service.updateMember(
          projectId,
          'member-id',
          { role: ProjectRole.Owner },
          executiveActor,
        ),
      () => service.removeMember(projectId, 'member-id', executiveActor),
    ];

    for (const mutate of mutations) {
      await expect(mutate()).rejects.toBeInstanceOf(ForbiddenException);
    }

    expect(projectsRepository.save).not.toHaveBeenCalled();
    expect(projectMembersRepository.save).not.toHaveBeenCalled();
    expect(projectMembersRepository.softRemove).not.toHaveBeenCalled();
    expect(projectsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects direct archived status during project updates', async () => {
    await expect(
      service.update(projectId, { status: 'archived' }, actor),
    ).rejects.toThrow(BadRequestException);
    expect(projectsRepository.save).not.toHaveBeenCalled();
  });

  it('archives an existing project instead of deleting it', async () => {
    const project = {
      id: projectId,
      name: 'ERP Modernization',
      status: 'active',
    };
    projectsRepository.findOne?.mockResolvedValue(project);

    await service.remove(projectId);

    expect(projectsRepository.save).toHaveBeenCalledWith({
      deletedAt: null,
      deletedById: null,
      id: projectId,
      name: 'ERP Modernization',
      status: 'archived',
      updatedById: undefined,
    });
    expect(projectsRepository.softRemove).not.toHaveBeenCalled();
  });

  it('restores an archived project without deleting relationships', async () => {
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      status: 'archived',
    });

    await service.restore(projectId, actor);

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      where: { id: projectId },
      withDeleted: true,
    });
    expect(projectsRepository.save).toHaveBeenCalledWith({
      deletedAt: null,
      deletedById: null,
      id: projectId,
      status: 'active',
      updatedById: actor.userId,
    });
  });

  it('permanently purges project-owned data for platform administrators', async () => {
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      status: 'archived',
    });

    await service.purge(projectId, actor);

    expect(rolesRepository.findOne).toHaveBeenCalledWith({
      select: { id: true, name: true },
      where: { id: actor.roleId },
    });
    expect(projectsRepository.manager.transaction).toHaveBeenCalled();
    expect(transactionalEntityManager.query).toHaveBeenCalledWith(
      "SET LOCAL pm_platform.project_purge = 'on'",
    );
    expect(transactionalEntityManager.query).toHaveBeenCalledWith(
      'DELETE FROM task_execution_updates WHERE project_id = $1',
      [projectId],
    );
    expect(transactionalEntityManager.query).toHaveBeenCalledWith(
      'DELETE FROM projects WHERE id = $1',
      [projectId],
    );
    expect(transactionalEntityManager.query).toHaveBeenCalledWith(
      'SELECT COUNT(*)::int AS count FROM projects WHERE id = $1',
      [projectId],
    );
  });

  it('rolls back permanent purge when integrity verification fails', async () => {
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      status: 'archived',
    });
    transactionalEntityManager.query.mockImplementation((sql: string) => {
      if (sql.toLowerCase().includes('select count')) {
        return Promise.resolve([{ count: sql.includes('FROM tasks') ? 1 : 0 }]);
      }

      return Promise.resolve([]);
    });

    await expect(service.purge(projectId, actor)).rejects.toThrow(
      ConflictException,
    );

    expect(projectsRepository.manager.transaction).toHaveBeenCalled();
  });

  it('rejects permanent purge for active projects', async () => {
    projectsRepository.findOne?.mockResolvedValue({
      id: projectId,
      status: 'active',
    });

    await expect(service.purge(projectId, actor)).rejects.toThrow(
      'Only archived projects can be permanently purged',
    );
    expect(projectsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects permanent purge for non-platform administrators', async () => {
    rolesRepository.findOne?.mockResolvedValue({
      id: 'role-id',
      name: UserRole.ProjectManager,
    });

    await expect(service.purge(projectId, actor)).rejects.toThrow(
      'Platform administrator access is required',
    );
    expect(projectsRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('adds a project member when the project and user exist', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({
      id: userId,
      role: { name: UserRole.ProjectManager },
    });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
      });

    const result = await service.addMember(projectId, {
      userId,
      role: ProjectRole.Manager,
    });

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: projectId },
    });
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      relations: { role: true },
      where: { id: userId },
    });
    expect(projectMembersRepository.create).toHaveBeenCalledWith({
      projectId,
      userId,
      role: ProjectRole.Manager,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
      }),
    );
  });

  it('restores a soft-deleted project member when re-adding the same user', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({
      id: userId,
      role: { name: UserRole.ProjectManager },
    });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Viewer,
        deletedAt: new Date('2026-06-19T09:00:00Z'),
        deletedById: 'user-remover',
      })
      .mockResolvedValueOnce({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Owner,
      });

    const result = await service.addMember(
      projectId,
      {
        userId,
        role: ProjectRole.Owner,
      },
      {
        email: 'manager@example.com',
        roleId: 'role-project-manager',
        userId: 'user-manager',
      },
    );

    expect(projectMembersRepository.create).not.toHaveBeenCalled();
    expect(projectMembersRepository.save).toHaveBeenCalledWith({
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Owner,
      deletedAt: null,
      deletedById: null,
      updatedById: 'user-manager',
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Owner,
      }),
    );
  });

  it('defaults new project members to contributor', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({
      id: userId,
      role: { name: UserRole.ProjectManager },
    });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Contributor,
      });

    await service.addMember(projectId, { userId });

    expect(projectMembersRepository.create).toHaveBeenCalledWith({
      projectId,
      userId,
      role: ProjectRole.Contributor,
    });
  });

  it('rejects duplicate project membership', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({
      id: userId,
      role: { name: UserRole.ProjectManager },
    });
    projectMembersRepository.findOne?.mockResolvedValue({
      id: 'existing-member-id',
      projectId,
      userId,
      deletedAt: null,
    });

    await expect(service.addMember(projectId, { userId })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects membership creation when the project is missing', async () => {
    projectsRepository.findOne?.mockResolvedValue(null);

    await expect(service.addMember(projectId, { userId })).rejects.toThrow(
      NotFoundException,
    );
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });

  it('rejects membership creation when the user is missing', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue(null);

    await expect(service.addMember(projectId, { userId })).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each([
    [UserRole.Customer, ProjectRole.Owner],
    [UserRole.Customer, ProjectRole.Manager],
    [UserRole.Partner, ProjectRole.Owner],
    [UserRole.Partner, ProjectRole.Manager],
  ])(
    'rejects membership creation for %s as %s',
    async (globalRole, projectRole) => {
      projectsRepository.findOne?.mockResolvedValue({ id: projectId });
      usersRepository.findOne?.mockResolvedValue({
        id: userId,
        role: { name: globalRole },
      });

      await expect(
        service.addMember(projectId, { userId, role: projectRole }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          reasonCode: INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE,
        }),
      });
      expect(projectMembersRepository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    [UserRole.Customer, ProjectRole.Contributor],
    [UserRole.Customer, ProjectRole.Viewer],
    [UserRole.Partner, ProjectRole.Contributor],
    [UserRole.Partner, ProjectRole.Viewer],
  ])(
    'allows membership creation for %s as %s',
    async (globalRole, projectRole) => {
      projectsRepository.findOne?.mockResolvedValue({ id: projectId });
      usersRepository.findOne?.mockResolvedValue({
        id: userId,
        role: { name: globalRole },
      });
      projectMembersRepository.findOne
        ?.mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'member-id',
          projectId,
          role: projectRole,
          userId,
        });

      await expect(
        service.addMember(projectId, { userId, role: projectRole }),
      ).resolves.toEqual(expect.objectContaining({ role: projectRole }));
    },
  );

  it('rejects restoration of an external member into a management role', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({
      id: userId,
      role: { name: UserRole.Customer },
    });
    projectMembersRepository.findOne?.mockResolvedValue({
      deletedAt: new Date('2026-06-19T09:00:00Z'),
      id: 'member-id',
      projectId,
      role: ProjectRole.Viewer,
      userId,
    });

    await expect(
      service.addMember(projectId, { userId, role: ProjectRole.Manager }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        reasonCode: INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE,
      }),
    });
    expect(projectMembersRepository.save).not.toHaveBeenCalled();
  });

  it('lists project members after validating the project exists', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    projectMembersRepository.find?.mockResolvedValue([
      {
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
        user: {
          id: userId,
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          passwordHash: 'hashed-password',
          role: {
            name: UserRole.ProjectManager,
          },
        },
      },
    ]);

    await expect(service.findMembers(projectId)).resolves.toEqual([
      {
        id: 'member-id',
        projectId,
        userId,
        role: ProjectRole.Manager,
        user: {
          id: userId,
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          displayName: 'Jane Doe',
          role: UserRole.ProjectManager,
        },
      },
    ]);
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: { user: { role: true } },
      where: { projectId },
    });
  });

  it('limits external project member reads to the caller membership', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValue(true);
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    projectMembersRepository.find?.mockResolvedValue([
      {
        id: 'customer-member',
        projectId,
        role: ProjectRole.Viewer,
        userId: 'customer-1',
        user: { id: 'customer-1', role: { name: UserRole.Customer } },
      },
      {
        id: 'internal-member',
        projectId,
        role: ProjectRole.Manager,
        userId: userId,
        user: { id: userId, role: { name: UserRole.ProjectManager } },
      },
    ]);

    const result = await service.findMembers(projectId, {
      roleId: 'customer-role',
      userId: 'customer-1',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 'customer-member', userId: 'customer-1' }),
    );
  });

  it('updates a project member role', async () => {
    const member = {
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Viewer,
      user: { role: { name: UserRole.ProjectManager } },
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne
      ?.mockResolvedValueOnce(member)
      .mockResolvedValueOnce({ ...member, role: ProjectRole.Owner });

    await service.updateMember(projectId, userId, {
      role: ProjectRole.Owner,
    });

    expect(projectMembersRepository.save).toHaveBeenCalledWith({
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Owner,
      user: { role: { name: UserRole.ProjectManager } },
    });
  });

  it.each([
    [UserRole.Customer, ProjectRole.Owner],
    [UserRole.Customer, ProjectRole.Manager],
    [UserRole.Partner, ProjectRole.Owner],
    [UserRole.Partner, ProjectRole.Manager],
  ])('rejects promotion of %s to %s', async (globalRole, projectRole) => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    projectMembersRepository.findOne?.mockResolvedValue({
      id: 'member-id',
      projectId,
      role: ProjectRole.Viewer,
      user: { role: { name: globalRole } },
      userId,
    });

    await expect(
      service.updateMember(projectId, 'member-id', { role: projectRole }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        reasonCode: INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE,
      }),
    });
    expect(projectMembersRepository.save).not.toHaveBeenCalled();
  });

  it('throws when updating a missing project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updateMember(projectId, userId, { role: ProjectRole.Owner }),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes a project member with soft delete', async () => {
    const member = {
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Viewer,
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(member);

    await service.removeMember(projectId, userId, {
      email: 'manager@example.com',
      roleId: 'role-project-manager',
      userId: 'user-manager',
    });

    expect(projectMembersRepository.softRemove).toHaveBeenCalledWith({
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Viewer,
      deletedById: 'user-manager',
      updatedById: 'user-manager',
    });
  });

  it('lists project tasks with optional filters', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.find?.mockResolvedValue([
      {
        id: 'phase-1',
        projectId,
        taskKind: TaskKind.Summary,
        title: 'Planning',
      },
      { id: taskId, projectId, taskKind: TaskKind.Standard },
    ]);

    await expect(
      service.findProjectTasks(
        projectId,
        {
          assigneeId: userId,
          priority: 'high',
          status: TaskStatus.InProgress,
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'phase-1', childTaskCount: 0 }),
        expect.objectContaining({ id: taskId, childTaskCount: 0 }),
      ]),
    );

    expect(tasksRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        projectId,
        assigneeId: userId,
        priority: 'high',
        status: TaskStatus.InProgress,
      },
    });
  });

  it('limits external task reads to assigned execution fields', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValue(true);
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.find?.mockResolvedValue([
      {
        assigneeId: 'customer-1',
        id: taskId,
        latestExecutionUpdate: { updateNotes: 'Internal update' },
        percentComplete: 25,
        priority: 'high',
        projectId,
        remarks: 'Internal remarks',
        status: TaskStatus.InProgress,
        taskKind: TaskKind.Standard,
        title: 'Customer action',
      },
    ]);

    const [result] = await service.findProjectTasks(
      projectId,
      {},
      { roleId: 'customer-role', userId: 'customer-1' },
    );

    expect(tasksRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assigneeId: 'customer-1',
          projectId,
        }) as unknown,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        assigneeId: 'customer-1',
        id: taskId,
        percentComplete: 25,
        title: 'Customer action',
      }),
    );
    expect(result).not.toHaveProperty('remarks');
    expect(result).not.toHaveProperty('latestExecutionUpdate');
  });

  it('creates a project task when the assignee is a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });

    const result = await service.createProjectTask(
      projectId,
      {
        assigneeId: userId,
        priority: 'high',
        sequenceNumber: 20,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Complete steering committee readout',
      },
      actor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        priority: 'high',
        sequenceNumber: 20,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Complete steering committee readout',
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenCalledWith(
      projectId,
      taskId,
      userId,
      actor,
      transactionalEntityManager,
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: taskId,
        projectId,
        assigneeId: userId,
        title: 'Complete steering committee readout',
      }),
    );
  });

  it('creates a child project task under a summary parent', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValueOnce({
      id: 'parent-task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Summary,
    });

    await service.createProjectTask(
      projectId,
      {
        parentTaskId: 'parent-task-id',
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      },
      actor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parentTaskId: 'parent-task-id',
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      }),
    );
  });

  it('creates a child project task under a standard task parent', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValueOnce({
      id: 'parent-task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
    });

    await service.createProjectTask(
      projectId,
      {
        parentTaskId: 'parent-task-id',
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      },
      actor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parentTaskId: 'parent-task-id',
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      }),
    );
  });

  it('rejects child project task creation under a subtask', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'subtask-id',
        parentTaskId: 'parent-task-id',
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'parent-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });

    await expect(
      service.createProjectTask(
        projectId,
        {
          parentTaskId: 'subtask-id',
          taskKind: TaskKind.Standard,
          title: 'Nested child',
        },
        actor,
      ),
    ).rejects.toThrow('Subtasks cannot contain child tasks');
  });

  it('rejects milestone project task creation when planned dates do not match', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(
      service.createProjectTask(
        projectId,
        {
          plannedEndDate: '2026-07-03',
          plannedStartDate: '2026-07-01',
          taskKind: TaskKind.Milestone,
          title: 'Go-live',
        },
        actor,
      ),
    ).rejects.toThrow(
      'Milestones must have matching planned start and end dates',
    );
  });

  it('creates an unassigned project task without assignee validation', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(
      projectId,
      {
        title: 'Prepare cutover checklist',
      },
      actor,
    );

    expect(usersRepository.findOne).not.toHaveBeenCalled();
    expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        title: 'Prepare cutover checklist',
      }),
    );
  });

  it('creates a project task from taskType while storing the compatible taskKind', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(
      projectId,
      {
        taskType: TaskType.Task,
        title: 'Prepare cutover checklist',
      },
      actor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      }),
    );
  });

  it('normalizes project milestone dates when only start is supplied', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(
      projectId,
      {
        plannedStartDate: '2026-07-01',
        taskType: TaskType.Milestone,
        title: 'Go-live',
      },
      actor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedEndDate: '2026-07-01',
        plannedStartDate: '2026-07-01',
        taskKind: TaskKind.Milestone,
      }),
    );
  });

  it('rejects assigning a summary task to a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskAssignmentService.changeTaskAssignment.mockRejectedValueOnce(
      new BadRequestException('Summary tasks cannot be assigned to a user'),
    );

    await expect(
      service.createProjectTask(
        projectId,
        {
          assigneeId: userId,
          taskKind: TaskKind.Summary,
          title: 'Planning Phase',
        },
        actor,
      ),
    ).rejects.toThrow('Summary tasks cannot be assigned to a user');
  });

  it('rejects project task creation when the assignee does not exist', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskAssignmentService.changeTaskAssignment.mockRejectedValueOnce(
      new NotFoundException(`Assignee ${userId} not found`),
    );

    await expect(
      service.createProjectTask(
        projectId,
        {
          assigneeId: userId,
          title: 'Prepare test evidence',
        },
        actor,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects project task creation when the assignee is not a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskAssignmentService.changeTaskAssignment.mockRejectedValueOnce(
      new ConflictException('Assignee must be an active project member'),
    );

    await expect(
      service.createProjectTask(
        projectId,
        {
          assigneeId: userId,
          title: 'Prepare test evidence',
        },
        actor,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates a project-scoped task and validates a changed assignee', async () => {
    const task = {
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Original task',
      status: TaskStatus.Backlog,
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(
      projectId,
      taskId,
      {
        assigneeId: userId,
        sequenceNumber: 30,
        status: TaskStatus.Done,
        taskKind: TaskKind.Standard,
        title: 'Updated task',
      },
      actor,
    );

    expect(tasksRepository.findOne).toHaveBeenCalledWith({
      relations: { assignee: true, project: true },
      where: { id: taskId, projectId },
    });
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        projectId,
        title: 'Updated task',
        status: TaskStatus.Done,
        percentComplete: 100,
        sequenceNumber: 30,
        taskKind: TaskKind.Standard,
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenCalledWith(
      projectId,
      taskId,
      userId,
      actor,
      transactionalEntityManager,
    );
  });

  it('sets percent complete to 100 when a project task status is updated to done', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: null,
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original task',
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(
      projectId,
      taskId,
      {
        status: TaskStatus.Done,
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        actualEndDate: '2026-08-03',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('sets status to done when project task percent complete is updated to 100', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: null,
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original task',
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(
      projectId,
      taskId,
      {
        percentComplete: 100,
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        actualEndDate: '2026-08-03',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('preserves an existing project task completion date when completing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: '2026-07-29',
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original task',
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(
      projectId,
      taskId,
      {
        status: TaskStatus.Done,
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actualEndDate: '2026-07-29',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('rejects manually completing a project summary task', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Summary,
      title: 'Planning Phase',
    });

    await expect(
      service.updateProjectTask(
        projectId,
        taskId,
        {
          status: TaskStatus.Done,
        },
        actor,
      ),
    ).rejects.toThrow('Summary task status is calculated from child work');
  });

  it('rejects setting a project task as its own parent', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Original task',
    });

    await expect(
      service.updateProjectTask(
        projectId,
        taskId,
        {
          parentTaskId: taskId,
        },
        actor,
      ),
    ).rejects.toThrow('A task cannot be its own parent');
  });

  it('throws when updating a task outside the project scope', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updateProjectTask(
        projectId,
        taskId,
        {
          title: 'Updated task',
        },
        actor,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('soft deletes a project-scoped task', async () => {
    const task = { id: taskId, projectId, title: 'Task to delete' };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.removeProjectTask(projectId, taskId, actor);

    expect(tasksRepository.softRemove).toHaveBeenCalledWith(task);
    expect(
      planningSnapshotService.rebuildWorkspaceSnapshot,
    ).not.toHaveBeenCalled();
  });

  it('captures a project baseline with immutable snapshot rows', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    transactionalEntityManager.findOne.mockImplementation(
      (entity: unknown, options: BaselineFindOptions) => {
        if (entity === Project) return Promise.resolve({ id: projectId });
        if (options.where.isCurrent) {
          return Promise.resolve({
            id: 'current-baseline-id',
            isCurrent: true,
            status: 'approved',
          });
        }
        return Promise.resolve({
          id: 'existing-baseline-id',
          versionNumber: 2,
        });
      },
    );
    transactionalEntityManager.find.mockResolvedValue([
      {
        id: 'summary-task-id',
        projectId,
        title: 'Design Phase',
        taskKind: TaskKind.Summary,
        parentTaskId: null,
        sequenceNumber: 10,
        plannedStartDate: '2026-07-01',
        plannedEndDate: '2026-07-21',
        estimatedHours: 120,
        percentComplete: 40,
        createdAt: new Date('2026-06-19T10:00:00Z'),
      },
      {
        id: 'child-task-id',
        projectId,
        title: 'Solution Design',
        taskKind: TaskKind.Standard,
        parentTaskId: 'summary-task-id',
        sequenceNumber: 20,
        plannedStartDate: '2026-07-02',
        plannedEndDate: '2026-07-10',
        estimatedHours: 48,
        percentComplete: 25,
        createdAt: new Date('2026-06-19T11:00:00Z'),
      },
    ]);

    const result = await service.captureProjectBaseline(
      projectId,
      {
        name: 'Approved Delivery Baseline',
        status: 'approved',
        setAsCurrent: true,
      },
      {
        email: 'manager@example.com',
        roleId: 'role-project-manager',
        userId: 'user-manager',
      },
    );

    expect(projectsRepository.manager?.transaction).toHaveBeenCalled();
    expect(transactionalEntityManager.findOne).toHaveBeenCalledWith(Project, {
      lock: { mode: 'pessimistic_write' },
      select: { id: true },
      where: { id: projectId },
    });
    expect(
      transactionalEntityManager.findOne.mock.invocationCallOrder[0],
    ).toBeLessThan(transactionalEntityManager.find.mock.invocationCallOrder[0]);
    expect(transactionalEntityManager.update).toHaveBeenCalledWith(
      ProjectBaseline,
      { id: 'current-baseline-id', projectId },
      {
        isCurrent: false,
        status: 'superseded',
        updatedById: 'user-manager',
      },
    );
    expect(transactionalEntityManager.save).toHaveBeenCalledTimes(2);
    expect(projectBaselinesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        capturedById: 'user-manager',
        createdById: 'user-manager',
        isCurrent: true,
        name: 'Approved Delivery Baseline',
        projectId,
        status: 'approved',
        updatedById: 'user-manager',
        versionNumber: 3,
      }),
    );
    expect(projectBaselineTasksRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        projectBaselineId: 'project-baseline-id',
        projectId,
        taskId: 'summary-task-id',
        taskTitle: 'Design Phase',
        taskKind: TaskKind.Summary,
      }),
    );
    expect(projectBaselineTasksRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        parentTaskId: 'summary-task-id',
        projectBaselineId: 'project-baseline-id',
        projectId,
        taskId: 'child-task-id',
        taskTitle: 'Solution Design',
        taskKind: TaskKind.Standard,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'project-baseline-id',
        isCurrent: true,
        name: 'Approved Delivery Baseline',
        projectId,
        status: 'approved',
        versionNumber: 3,
      }),
    );
  });

  it('captures a non-current baseline without demoting the current baseline', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    transactionalEntityManager.findOne.mockImplementation(
      (entity: unknown, options: BaselineFindOptions) => {
        if (entity === Project) return Promise.resolve({ id: projectId });
        if (options.where.isCurrent) {
          return Promise.resolve({
            id: 'current-baseline-id',
            isCurrent: true,
            status: 'approved',
          });
        }
        return Promise.resolve({
          id: 'existing-baseline-id',
          versionNumber: 1,
        });
      },
    );
    transactionalEntityManager.find.mockResolvedValue([]);

    await service.captureProjectBaseline(
      projectId,
      {
        name: 'Approved Rebaseline Candidate',
      },
      {
        email: 'manager@example.com',
        roleId: 'role-project-manager',
        userId: 'user-manager',
      },
    );

    expect(transactionalEntityManager.update).not.toHaveBeenCalled();
    expect(projectBaselinesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isCurrent: false,
        status: 'approved',
        versionNumber: 2,
      }),
    );
  });

  it('establishes the first approved baseline as active', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    transactionalEntityManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Project ? { id: projectId } : null),
    );

    const result = await service.captureProjectBaseline(
      projectId,
      { name: 'Initial Approved Baseline' },
      actor,
    );

    expect(result).toEqual(
      expect.objectContaining({
        isCurrent: true,
        status: 'approved',
        versionNumber: 1,
      }),
    );
    expect(transactionalEntityManager.update).not.toHaveBeenCalled();
  });

  it('allows an explicitly draft baseline only as non-current', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    transactionalEntityManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Project ? { id: projectId } : null),
    );

    const result = await service.captureProjectBaseline(
      projectId,
      { name: 'Working Draft', status: 'draft' },
      actor,
    );

    expect(result).toEqual(
      expect.objectContaining({ isCurrent: false, status: 'draft' }),
    );
  });

  it('rejects creating a baseline directly as superseded', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(
      service.captureProjectBaseline(
        projectId,
        { name: 'Invalid Baseline', status: 'superseded' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(projectsRepository.manager?.transaction).not.toHaveBeenCalled();
  });

  it('rejects creating a current draft baseline', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(
      service.captureProjectBaseline(
        projectId,
        { name: 'Invalid Draft', setAsCurrent: true, status: 'draft' },
        actor,
      ),
    ).rejects.toThrow('A draft baseline cannot be active');
    expect(projectsRepository.manager?.transaction).not.toHaveBeenCalled();
  });

  it('sets an approved historical baseline active and supersedes the previous active baseline', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    const target = {
      id: 'target-baseline-id',
      isCurrent: false,
      projectId,
      status: 'approved',
      tasks: [{ id: 'immutable-baseline-task-id' }],
    };
    transactionalEntityManager.findOne.mockImplementation(
      (entity: unknown, options: BaselineFindOptions) => {
        if (entity === Project) return Promise.resolve({ id: projectId });
        if (options.where.id) return Promise.resolve(target);
        return Promise.resolve({ id: 'current-baseline-id' });
      },
    );

    const result = await service.setActiveProjectBaseline(
      projectId,
      target.id,
      actor,
    );

    expect(transactionalEntityManager.findOne).toHaveBeenCalledWith(Project, {
      lock: { mode: 'pessimistic_write' },
      select: { id: true },
      where: { id: projectId },
    });
    expect(transactionalEntityManager.update).toHaveBeenNthCalledWith(
      1,
      ProjectBaseline,
      { id: 'current-baseline-id', projectId },
      {
        isCurrent: false,
        status: 'superseded',
        updatedById: userId,
      },
    );
    expect(transactionalEntityManager.update).toHaveBeenNthCalledWith(
      2,
      ProjectBaseline,
      { id: target.id, projectId },
      {
        isCurrent: true,
        status: 'approved',
        updatedById: userId,
      },
    );
    expect(result).toEqual(
      expect.objectContaining({ isCurrent: true, status: 'approved' }),
    );
    expect(result.tasks).toEqual([{ id: 'immutable-baseline-task-id' }]);
    expect(transactionalEntityManager.save).not.toHaveBeenCalled();
  });

  it('reactivates a superseded baseline as approved', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    const target = {
      id: 'superseded-baseline-id',
      isCurrent: false,
      projectId,
      status: 'superseded',
    };
    transactionalEntityManager.findOne.mockImplementation(
      (entity: unknown, options: BaselineFindOptions) => {
        if (entity === Project) return Promise.resolve({ id: projectId });
        if (options.where.id) return Promise.resolve(target);
        return Promise.resolve(null);
      },
    );

    await expect(
      service.setActiveProjectBaseline(projectId, target.id, actor),
    ).resolves.toEqual(
      expect.objectContaining({ isCurrent: true, status: 'approved' }),
    );
  });

  it('returns the already-active approved baseline as a no-op', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    const target = {
      id: 'current-baseline-id',
      isCurrent: true,
      projectId,
      status: 'approved',
    };
    transactionalEntityManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Project ? { id: projectId } : target),
    );

    await expect(
      service.setActiveProjectBaseline(projectId, target.id, actor),
    ).resolves.toBe(target);
    expect(transactionalEntityManager.update).not.toHaveBeenCalled();
    expect(transactionalEntityManager.save).not.toHaveBeenCalled();
  });

  it('rejects activating a draft baseline', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    transactionalEntityManager.findOne.mockImplementation((entity) =>
      Promise.resolve(
        entity === Project
          ? { id: projectId }
          : {
              id: 'draft-baseline-id',
              isCurrent: false,
              projectId,
              status: 'draft',
            },
      ),
    );

    await expect(
      service.setActiveProjectBaseline(projectId, 'draft-baseline-id', actor),
    ).rejects.toThrow('A draft baseline cannot be active');
    expect(transactionalEntityManager.update).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', 'missing-baseline-id'],
    ['deleted', 'deleted-baseline-id'],
    ['wrong-project', 'other-project-baseline-id'],
  ])('rejects a %s baseline when setting active', async (_case, baselineId) => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    transactionalEntityManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Project ? { id: projectId } : null),
    );

    await expect(
      service.setActiveProjectBaseline(projectId, baselineId, actor),
    ).rejects.toThrow(NotFoundException);
    expect(transactionalEntityManager.update).not.toHaveBeenCalled();
  });

  it('rejects baseline activation without project-management authority', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    authorizationPolicyService.canManageProject.mockResolvedValue(false);

    await expect(
      service.setActiveProjectBaseline(
        projectId,
        'approved-baseline-id',
        actor,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(projectsRepository.manager?.transaction).not.toHaveBeenCalled();
  });

  it('rejects baseline activation by an external actor', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    authorizationPolicyService.isExternalActor.mockResolvedValue(true);

    await expect(
      service.setActiveProjectBaseline(
        projectId,
        'approved-baseline-id',
        actor,
      ),
    ).rejects.toThrow('External actors cannot manage project baselines');
    expect(authorizationPolicyService.canManageProject).not.toHaveBeenCalled();
    expect(projectsRepository.manager?.transaction).not.toHaveBeenCalled();
  });

  it('serializes concurrent captures before allocating versions and snapshot rows', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    const persistedBaselines: Array<Partial<ProjectBaseline> & { id: string }> =
      [];
    const persistedTaskRows: ProjectBaselineTask[] = [];
    const capturedTasks = [
      {
        id: 'captured-task-1',
        projectId,
        title: 'Captured Task',
        taskKind: TaskKind.Standard,
        parentTaskId: null,
        sequenceNumber: 1,
        plannedStartDate: '2026-08-01',
        plannedEndDate: '2026-08-05',
        estimatedHours: 24,
        percentComplete: 0,
      } as Task,
    ];
    let lockTail = Promise.resolve();

    const transaction = jest.fn(
      async (callback: (manager: EntityManager) => Promise<unknown>) => {
        const precedingLock = lockTail;
        let releaseLock = () => undefined;
        lockTail = new Promise<void>((resolve) => {
          releaseLock = resolve;
        });
        let projectLockAcquired = false;
        const manager = {
          find: jest.fn((entity: unknown) => {
            expect(projectLockAcquired).toBe(true);
            return Promise.resolve(entity === Task ? capturedTasks : []);
          }),
          findOne: jest.fn(
            async (entity: unknown, options: BaselineFindOptions) => {
              if (entity === Project) {
                await precedingLock;
                projectLockAcquired = true;
                return { id: projectId };
              }
              expect(projectLockAcquired).toBe(true);
              if (options.where.isCurrent) {
                return (
                  persistedBaselines.find((baseline) => baseline.isCurrent) ??
                  null
                );
              }
              return (
                [...persistedBaselines].sort(
                  (left, right) =>
                    Number(right.versionNumber) - Number(left.versionNumber),
                )[0] ?? null
              );
            },
          ),
          save: jest.fn((entity: unknown, input: unknown) => {
            expect(projectLockAcquired).toBe(true);
            if (entity === ProjectBaseline) {
              const baselineInput = input as Partial<ProjectBaseline>;
              const baseline = {
                ...baselineInput,
                id: `baseline-${baselineInput.versionNumber}`,
              } as ProjectBaseline & { id: string };
              persistedBaselines.push(baseline);
              return Promise.resolve(baseline);
            }
            if (entity === ProjectBaselineTask) {
              persistedTaskRows.push(...(input as ProjectBaselineTask[]));
            }
            return Promise.resolve(input);
          }),
          update: jest.fn(() => Promise.resolve(undefined)),
        };

        try {
          return await callback(manager as unknown as EntityManager);
        } finally {
          releaseLock();
        }
      },
    );
    projectsRepository.manager = {
      transaction,
    } as unknown as Repository<Project>['manager'];

    const results = await Promise.all([
      service.captureProjectBaseline(
        projectId,
        { name: 'Concurrent Baseline A' },
        actor,
      ),
      service.captureProjectBaseline(
        projectId,
        { name: 'Concurrent Baseline B' },
        actor,
      ),
    ]);

    expect(results.map((baseline) => baseline.versionNumber).sort()).toEqual([
      1, 2,
    ]);
    expect(
      persistedBaselines.filter((baseline) => baseline.isCurrent),
    ).toHaveLength(1);
    expect(persistedTaskRows).toHaveLength(2);
    expect(
      persistedTaskRows.map((row) => row.projectBaselineId).sort(),
    ).toEqual(['baseline-1', 'baseline-2']);
  });

  it('lists project task dependencies', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskDependenciesRepository.find?.mockResolvedValue([
      { id: 'task-dependency-id' },
    ]);

    await expect(
      service.findProjectTaskDependencies(projectId),
    ).resolves.toEqual([{ id: 'task-dependency-id' }]);
    expect(taskDependenciesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: [
        { predecessorTask: { projectId } },
        { successorTask: { projectId } },
      ],
    });
  });

  it('lists task predecessors and successors', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue({
      id: 'task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
    });
    taskDependenciesRepository.find
      ?.mockResolvedValueOnce([{ id: 'predecessor-dependency-id' }])
      .mockResolvedValueOnce([{ id: 'successor-dependency-id' }]);

    await expect(
      service.findProjectTaskPredecessors(projectId, 'task-id'),
    ).resolves.toEqual([{ id: 'predecessor-dependency-id' }]);
    expect(taskDependenciesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: {
        successorTaskId: 'task-id',
        successorTask: { projectId },
      },
    });

    await expect(
      service.findProjectTaskSuccessors(projectId, 'task-id'),
    ).resolves.toEqual([{ id: 'successor-dependency-id' }]);
    expect(taskDependenciesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: {
        predecessorTaskId: 'task-id',
        predecessorTask: { projectId },
      },
    });
  });

  it('creates a project task dependency between two leaf tasks', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'succ-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.createProjectTaskDependency(
      projectId,
      {
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
        dependencyType: TaskDependencyType.FinishToStart,
        lagDays: 2,
      },
      {
        email: 'manager@example.com',
        roleId: 'role-project-manager',
        userId: 'user-manager',
      },
    );

    expect(taskDependenciesRepository.create).toHaveBeenCalledWith({
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.FinishToStart,
      lagDays: 2,
      createdById: 'user-manager',
      updatedById: 'user-manager',
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'task-dependency-id',
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
      }),
    );
  });

  it.each([TaskDependencyType.StartToStart, TaskDependencyType.FinishToFinish])(
    'creates a %s project task dependency',
    async (dependencyType) => {
      projectsRepository.findOne?.mockResolvedValue({ id: projectId });
      tasksRepository.findOne
        ?.mockResolvedValueOnce({
          id: 'pred-task-id',
          parentTaskId: null,
          projectId,
          taskKind: TaskKind.Standard,
        })
        .mockResolvedValueOnce({
          id: 'succ-task-id',
          parentTaskId: null,
          projectId,
          taskKind: TaskKind.Standard,
        });

      await service.createProjectTaskDependency(
        projectId,
        {
          predecessorTaskId: 'pred-task-id',
          successorTaskId: 'succ-task-id',
          dependencyType,
        },
        actor,
      );

      expect(taskDependenciesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dependencyType }),
      );
    },
  );

  it('allows milestones as predecessor dependency endpoints', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-milestone-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Milestone,
      })
      .mockResolvedValueOnce({
        id: 'succ-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });

    await service.createProjectTaskDependency(
      projectId,
      {
        predecessorTaskId: 'pred-milestone-id',
        successorTaskId: 'succ-task-id',
        dependencyType: TaskDependencyType.FinishToFinish,
      },
      actor,
    );

    expect(taskDependenciesRepository.create).toHaveBeenCalledWith({
      predecessorTaskId: 'pred-milestone-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.FinishToFinish,
      lagDays: 0,
      createdById: actor.userId,
      updatedById: actor.userId,
    });
  });

  it('allows milestones as successor dependency endpoints', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'succ-milestone-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Milestone,
      });

    await service.createProjectTaskDependency(
      projectId,
      {
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-milestone-id',
        dependencyType: TaskDependencyType.StartToStart,
      },
      actor,
    );

    expect(taskDependenciesRepository.create).toHaveBeenCalledWith({
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-milestone-id',
      dependencyType: TaskDependencyType.StartToStart,
      lagDays: 0,
      createdById: actor.userId,
      updatedById: actor.userId,
    });
  });

  it('rejects self-referential project task dependencies', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(
      service.createProjectTaskDependency(
        projectId,
        {
          predecessorTaskId: taskId,
          successorTaskId: taskId,
          dependencyType: TaskDependencyType.FinishToStart,
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects dependency creation when an endpoint is a summary task', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Summary,
      })
      .mockResolvedValueOnce({
        id: 'succ-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });

    await expect(
      service.createProjectTaskDependency(
        projectId,
        {
          predecessorTaskId: 'pred-task-id',
          successorTaskId: 'succ-task-id',
          dependencyType: TaskDependencyType.FinishToStart,
        },
        actor,
      ),
    ).rejects.toThrow(
      'Summary tasks cannot be dependency predecessor endpoints',
    );
  });

  it('allows non-summary task endpoints even when they have children', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'succ-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });

    await service.createProjectTaskDependency(
      projectId,
      {
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
        dependencyType: TaskDependencyType.StartToStart,
      },
      actor,
    );

    expect(taskDependenciesRepository.create).toHaveBeenCalled();
  });

  it('rejects dependencies between a task and its subtask', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'parent-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'subtask-id',
        parentTaskId: 'parent-task-id',
        projectId,
        taskKind: TaskKind.Standard,
      });

    await expect(
      service.createProjectTaskDependency(
        projectId,
        {
          predecessorTaskId: 'parent-task-id',
          successorTaskId: 'subtask-id',
          dependencyType: TaskDependencyType.StartToStart,
        },
        actor,
      ),
    ).rejects.toThrow(
      'Parent tasks and their subtasks cannot depend on each other',
    );
  });

  it('rejects duplicate active dependencies between the same tasks', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'succ-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });
    taskDependenciesRepository.find?.mockResolvedValue([
      {
        id: 'existing-task-dependency-id',
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
      },
    ]);

    await expect(
      service.createProjectTaskDependency(
        projectId,
        {
          predecessorTaskId: 'pred-task-id',
          successorTaskId: 'succ-task-id',
          dependencyType: TaskDependencyType.FinishToStart,
        },
        actor,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects circular task dependency creation', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'task-c',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'task-a',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });
    taskDependenciesRepository.find?.mockResolvedValue([
      {
        id: 'dependency-a-b',
        predecessorTaskId: 'task-a',
        successorTaskId: 'task-b',
      },
      {
        id: 'dependency-b-c',
        predecessorTaskId: 'task-b',
        successorTaskId: 'task-c',
      },
    ]);

    await expect(
      service.createProjectTaskDependency(
        projectId,
        {
          predecessorTaskId: 'task-c',
          successorTaskId: 'task-a',
          dependencyType: TaskDependencyType.FinishToStart,
        },
        actor,
      ),
    ).rejects.toThrow(
      'Task dependencies cannot contain circular relationships',
    );
  });

  it('updates a project task dependency', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskDependenciesRepository.findOne?.mockResolvedValueOnce({
      id: 'task-dependency-id',
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.FinishToStart,
      lagDays: 0,
      predecessorTask: { projectId },
      successorTask: { projectId },
    });
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'pred-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      })
      .mockResolvedValueOnce({
        id: 'succ-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Standard,
      });

    await service.updateProjectTaskDependency(
      projectId,
      'task-dependency-id',
      {
        dependencyType: TaskDependencyType.StartToStart,
        lagDays: 3,
      },
      {
        email: 'manager@example.com',
        roleId: 'role-project-manager',
        userId: 'user-manager',
      },
    );

    expect(taskDependenciesRepository.save).toHaveBeenCalledWith({
      id: 'task-dependency-id',
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.StartToStart,
      lagDays: 3,
      predecessorTask: { projectId },
      successorTask: { projectId },
      updatedById: 'user-manager',
    });
  });

  it('soft deletes a project task dependency', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskDependenciesRepository.findOne?.mockResolvedValue({
      id: 'task-dependency-id',
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      predecessorTask: { projectId },
      successorTask: { projectId },
    });

    await service.removeProjectTaskDependency(projectId, 'task-dependency-id', {
      email: 'manager@example.com',
      roleId: 'role-project-manager',
      userId: 'user-manager',
    });

    expect(taskDependenciesRepository.softRemove).toHaveBeenCalledWith({
      id: 'task-dependency-id',
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      predecessorTask: { projectId },
      successorTask: { projectId },
      deletedById: 'user-manager',
      updatedById: 'user-manager',
    });
  });
});
