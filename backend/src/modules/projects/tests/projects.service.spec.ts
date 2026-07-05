import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { ProjectRole } from '../../../common/enums/project-role.enum';
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
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Project } from '../entities/project.entity';
import { ProjectVisibilityService } from '../project-visibility.service';
import { ProjectsService } from '../projects.service';
import { PlanningSnapshotService } from '../../planning/planning-snapshot.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const projectId = '2bbca1cb-1be2-4a04-b857-f1f8c7a26800';
const userId = 'f308d314-4cf3-4bc0-9607-e7ad88f264b8';
const taskId = '32b10c65-8a4b-4e03-a58c-ffea2ec860e6';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let projectBaselinesRepository: MockRepository<ProjectBaseline>;
  let projectBaselineTasksRepository: MockRepository<ProjectBaselineTask>;
  let tasksRepository: MockRepository<Task>;
  let taskDependenciesRepository: MockRepository<TaskDependency>;
  let usersRepository: MockRepository<User>;
  let authorizationPolicyService: {
    canDeleteProject: jest.Mock;
    canManageProject: jest.Mock;
    canManageTask: jest.Mock;
    hasPermission: jest.Mock;
  };
  let projectVisibilityService: {
    canViewProject: jest.Mock;
    getVisibleProjects: jest.Mock;
  };
  let planningSnapshotService: {
    rebuildWorkspaceSnapshot: jest.Mock;
  };
  let transactionalEntityManager: {
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    projectsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: projectId, ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    projectMembersRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: 'member-id', ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    projectBaselinesRepository = {
      create: jest.fn((input) => input),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'project-baseline-id', ...input }),
      ),
    };
    projectBaselineTasksRepository = {
      create: jest.fn((input) => input),
      save: jest.fn((input) => Promise.resolve(input)),
    };
    tasksRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: taskId, ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    transactionalEntityManager = {
      save: jest.fn((entity, input) => {
        if (entity === ProjectBaseline) {
          return Promise.resolve({ id: 'project-baseline-id', ...input });
        }

        return Promise.resolve(input);
      }),
      update: jest.fn(() => Promise.resolve()),
    };
    projectsRepository.manager = {
      transaction: jest.fn((callback) => callback(transactionalEntityManager)),
    } as Repository<Project>['manager'];
    taskDependenciesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'task-dependency-id', ...input }),
      ),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    authorizationPolicyService = {
      canDeleteProject: jest.fn().mockResolvedValue(true),
      canManageProject: jest.fn().mockResolvedValue(true),
      canManageTask: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
    };
    projectVisibilityService = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getVisibleProjects: jest.fn().mockResolvedValue([{ id: projectId }]),
    };
    planningSnapshotService = {
      rebuildWorkspaceSnapshot: jest.fn().mockResolvedValue(undefined),
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
        ProjectHealthService,
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
        {
          provide: PlanningSnapshotService,
          useValue: planningSnapshotService,
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  it('creates a project from the existing DTO shape', async () => {
    const result = await service.create({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      status: 'active',
      targetEndDate: '2026-09-30',
    });

    expect(projectsRepository.create).toHaveBeenCalledWith({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      status: 'active',
      targetEndDate: '2026-09-30',
    });
    expect(projectsRepository.save).toHaveBeenCalledWith({
      name: 'ERP Modernization',
      description: 'Finance platform delivery',
      status: 'active',
      targetEndDate: '2026-09-30',
    });
    expect(result).toEqual(
      expect.objectContaining({ id: projectId, name: 'ERP Modernization' }),
    );
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

    await expect(service.findOne(projectId)).resolves.toEqual(
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
      tasks: expect.arrayContaining([
        expect.objectContaining({
          childTaskCount: 2,
          id: 'phase-1',
          phaseEndDate: '2026-07-18',
          phaseProgress: 50,
          phaseStartDate: '2026-07-02',
        }),
      ]),
      }),
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

  it('soft deletes an existing project', async () => {
    const project = { id: projectId, name: 'ERP Modernization' };
    projectsRepository.findOne?.mockResolvedValue(project);

    await service.remove(projectId);

    expect(projectsRepository.softRemove).toHaveBeenCalledWith(project);
  });

  it('adds a project member when the project and user exist', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
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
      select: { id: true },
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
    usersRepository.findOne?.mockResolvedValue({ id: userId });
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
    usersRepository.findOne?.mockResolvedValue({ id: userId });
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
    usersRepository.findOne?.mockResolvedValue({ id: userId });
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
            name: 'Project Manager',
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
          role: 'Project Manager',
        },
      },
    ]);
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      relations: { user: { role: true } },
      where: { projectId },
    });
  });

  it('updates a project member role', async () => {
    const member = {
      id: 'member-id',
      projectId,
      userId,
      role: ProjectRole.Viewer,
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
    });
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
      service.findProjectTasks(projectId, {
        assigneeId: userId,
        priority: 'high',
        status: TaskStatus.InProgress,
      }),
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

  it('creates a project task when the assignee is a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });

    const result = await service.createProjectTask(projectId, {
      assigneeId: userId,
      priority: 'high',
      sequenceNumber: 20,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Complete steering committee readout',
    });

    expect(tasksRepository.create).toHaveBeenCalledWith({
      projectId,
      assigneeId: userId,
      priority: 'high',
      sequenceNumber: 20,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Complete steering committee readout',
    });
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

    await service.createProjectTask(projectId, {
      parentTaskId: 'parent-task-id',
      taskKind: TaskKind.Standard,
      title: 'Prepare cutover checklist',
    });

    expect(tasksRepository.create).toHaveBeenCalledWith({
      parentTaskId: 'parent-task-id',
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Prepare cutover checklist',
    });
  });

  it('rejects child project task creation under a non-summary parent', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValueOnce({
      id: 'parent-task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
    });

    await expect(
      service.createProjectTask(projectId, {
        parentTaskId: 'parent-task-id',
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      }),
    ).rejects.toThrow('Only summary tasks can contain child tasks');
  });

  it('rejects milestone project task creation when planned dates do not match', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(
      service.createProjectTask(projectId, {
        plannedEndDate: '2026-07-03',
        plannedStartDate: '2026-07-01',
        taskKind: TaskKind.Milestone,
        title: 'Go-live',
      }),
    ).rejects.toThrow('Milestones must have matching planned start and end dates');
  });

  it('creates an unassigned project task without assignee validation', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(projectId, {
      title: 'Prepare cutover checklist',
    });

    expect(usersRepository.findOne).not.toHaveBeenCalled();
    expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
    expect(tasksRepository.create).toHaveBeenCalledWith({
      projectId,
      title: 'Prepare cutover checklist',
    });
  });

  it('creates a project task from taskType while storing the compatible taskKind', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(projectId, {
      taskType: TaskType.Task,
      title: 'Prepare cutover checklist',
    });

    expect(tasksRepository.create).toHaveBeenCalledWith({
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Prepare cutover checklist',
    });
  });

  it('normalizes project milestone dates when only start is supplied', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await service.createProjectTask(projectId, {
      plannedStartDate: '2026-07-01',
      taskType: TaskType.Milestone,
      title: 'Go-live',
    });

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

    await expect(
      service.createProjectTask(projectId, {
        assigneeId: userId,
        taskKind: TaskKind.Summary,
        title: 'Planning Phase',
      }),
    ).rejects.toThrow('Summary tasks cannot be assigned to a user');
  });

  it('rejects project task creation when the assignee does not exist', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.createProjectTask(projectId, {
        assigneeId: userId,
        title: 'Prepare test evidence',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects project task creation when the assignee is not a project member', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    projectMembersRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.createProjectTask(projectId, {
        assigneeId: userId,
        title: 'Prepare test evidence',
      }),
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

    await service.updateProjectTask(projectId, taskId, {
      assigneeId: userId,
      sequenceNumber: 30,
      status: TaskStatus.Done,
      taskKind: TaskKind.Standard,
      title: 'Updated task',
    });

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
        assigneeId: userId,
        percentComplete: 100,
        sequenceNumber: 30,
        taskKind: TaskKind.Standard,
      }),
    );
  });

  it('sets percent complete to 100 when a project task status is updated to done', async () => {
    const task = {
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original task',
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(projectId, taskId, {
      status: TaskStatus.Done,
    });

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('sets status to done when project task percent complete is updated to 100', async () => {
    const task = {
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original task',
    };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.updateProjectTask(projectId, taskId, {
      percentComplete: 100,
    });

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
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
      service.updateProjectTask(projectId, taskId, {
        status: TaskStatus.Done,
      }),
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
      service.updateProjectTask(projectId, taskId, {
        parentTaskId: taskId,
      }),
    ).rejects.toThrow('A task cannot be its own parent');
  });

  it('throws when updating a task outside the project scope', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updateProjectTask(projectId, taskId, {
        title: 'Updated task',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('soft deletes a project-scoped task', async () => {
    const task = { id: taskId, projectId, title: 'Task to delete' };
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.removeProjectTask(projectId, taskId);

    expect(tasksRepository.softRemove).toHaveBeenCalledWith(task);
    expect(planningSnapshotService.rebuildWorkspaceSnapshot).toHaveBeenCalledWith(
      projectId,
      undefined,
    );
  });

  it('captures a project baseline with immutable snapshot rows', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    projectBaselinesRepository.findOne?.mockResolvedValue({
      id: 'existing-baseline-id',
      versionNumber: 2,
    });
    tasksRepository.find?.mockResolvedValue([
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
    expect(transactionalEntityManager.update).toHaveBeenCalledWith(
      ProjectBaseline,
      { isCurrent: true, projectId },
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
    projectBaselinesRepository.findOne?.mockResolvedValue(null);
    tasksRepository.find?.mockResolvedValue([]);

    await service.captureProjectBaseline(
      projectId,
      {
        name: 'Draft Baseline',
        setAsCurrent: false,
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
        versionNumber: 1,
      }),
    );
  });

  it('lists project task dependencies', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskDependenciesRepository.find?.mockResolvedValue([
      { id: 'task-dependency-id' },
    ]);

    await expect(service.findProjectTaskDependencies(projectId)).resolves.toEqual([
      { id: 'task-dependency-id' },
    ]);
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

  it.each([
    TaskDependencyType.StartToStart,
    TaskDependencyType.FinishToFinish,
  ])('creates a %s project task dependency', async (dependencyType) => {
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

    await service.createProjectTaskDependency(projectId, {
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      dependencyType,
    });

    expect(taskDependenciesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ dependencyType }),
    );
  });

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
      })

    await service.createProjectTaskDependency(projectId, {
      predecessorTaskId: 'pred-milestone-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.FinishToFinish,
    });

    expect(taskDependenciesRepository.create).toHaveBeenCalledWith({
      predecessorTaskId: 'pred-milestone-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.FinishToFinish,
      lagDays: 0,
      createdById: undefined,
      updatedById: undefined,
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

    await service.createProjectTaskDependency(projectId, {
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-milestone-id',
      dependencyType: TaskDependencyType.StartToStart,
    });

    expect(taskDependenciesRepository.create).toHaveBeenCalledWith({
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-milestone-id',
      dependencyType: TaskDependencyType.StartToStart,
      lagDays: 0,
      createdById: undefined,
      updatedById: undefined,
    });
  });

  it('rejects self-referential project task dependencies', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });

    await expect(
      service.createProjectTaskDependency(projectId, {
        predecessorTaskId: taskId,
        successorTaskId: taskId,
        dependencyType: TaskDependencyType.FinishToStart,
      }),
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
      service.createProjectTaskDependency(projectId, {
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
        dependencyType: TaskDependencyType.FinishToStart,
      }),
    ).rejects.toThrow('Summary tasks cannot be dependency predecessor endpoints');
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

    await service.createProjectTaskDependency(projectId, {
      predecessorTaskId: 'pred-task-id',
      successorTaskId: 'succ-task-id',
      dependencyType: TaskDependencyType.StartToStart,
    });

    expect(taskDependenciesRepository.create).toHaveBeenCalled();
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
      })
    taskDependenciesRepository.find?.mockResolvedValue([
      {
        id: 'existing-task-dependency-id',
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
      },
    ]);

    await expect(
      service.createProjectTaskDependency(projectId, {
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
        dependencyType: TaskDependencyType.FinishToStart,
      }),
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
      service.createProjectTaskDependency(projectId, {
        predecessorTaskId: 'task-c',
        successorTaskId: 'task-a',
        dependencyType: TaskDependencyType.FinishToStart,
      }),
    ).rejects.toThrow('Task dependencies cannot contain circular relationships');
  });

  it('updates a project task dependency', async () => {
    projectsRepository.findOne?.mockResolvedValue({ id: projectId });
    taskDependenciesRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'task-dependency-id',
        predecessorTaskId: 'pred-task-id',
        successorTaskId: 'succ-task-id',
        dependencyType: TaskDependencyType.FinishToStart,
        lagDays: 0,
        predecessorTask: { projectId },
        successorTask: { projectId },
      })
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
