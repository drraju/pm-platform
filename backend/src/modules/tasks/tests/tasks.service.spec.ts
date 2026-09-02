import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../../common/authz/canonical-capability-resolver.service';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskType } from '../../../common/enums/task-type.enum';
import { SchedulingFoundationService } from '../../../common/scheduling/scheduling-foundation.service';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { TaskExecutionUpdate } from '../entities/task-execution-update.entity';
import { Task } from '../entities/task.entity';
import { TaskAssignmentService } from '../task-assignment.service';
import { TasksService } from '../tasks.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const taskId = '32b10c65-8a4b-4e03-a58c-ffea2ec860e6';
const userId = 'f308d314-4cf3-4bc0-9607-e7ad88f264b8';
const projectId = '2bbca1cb-1be2-4a04-b857-f1f8c7a26800';
const managerActor = {
  email: 'manager@example.com',
  roleId: 'manager-role-id',
  userId: 'manager-user-id',
};

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: MockRepository<Task>;
  let taskExecutionUpdatesRepository: MockRepository<TaskExecutionUpdate> & {
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
  };
  let executionUpdateQueryBuilder: {
    addOrderBy: jest.Mock;
    distinctOn: jest.Mock;
    getMany: jest.Mock;
    orderBy: jest.Mock;
    where: jest.Mock;
  };
  let taskTransactionManager: {
    create: jest.Mock;
    getRepository: jest.Mock;
    save: jest.Mock;
  };
  let taskQueryBuilder: {
    addOrderBy: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
    innerJoinAndSelect: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    where: jest.Mock;
  };
  let projectMembersRepository: MockRepository<ProjectMember>;
  let authorizationPolicyService: {
    canManageProject: jest.Mock;
    canManageTask: jest.Mock;
    hasPermission: jest.Mock;
    isExternalActor: jest.Mock;
  };
  let projectVisibilityService: {
    canViewProject: jest.Mock;
    getVisibleProjectIds: jest.Mock;
  };
  let taskAssignmentService: { changeTaskAssignment: jest.Mock };
  let canonicalCapabilityResolver: { resolve: jest.Mock };

  beforeEach(async () => {
    taskQueryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    tasksRepository = {
      create: jest.fn((input) => input),
      createQueryBuilder: jest.fn(() => taskQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      manager: {
        getRepository: jest.fn((entity) => {
          if (entity === Project) {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: projectId,
                status: 'active',
              }),
            };
          }
          throw new Error(`Unexpected repository ${String(entity)}`);
        }),
        transaction: jest.fn((callback) => callback(taskTransactionManager)),
      } as never,
      remove: jest.fn(() => Promise.resolve()),
      save: jest.fn((input) => Promise.resolve({ id: taskId, ...input })),
      softRemove: jest.fn(() => Promise.resolve()),
    };
    taskTransactionManager = {
      create: jest.fn((_entity, input) => input),
      getRepository: jest.fn((entity) => {
        if (entity === Task) return tasksRepository;
        throw new Error(`Unexpected repository ${String(entity)}`);
      }),
      save: jest.fn((_entity, input) =>
        Promise.resolve({ id: 'execution-update-id', ...input }),
      ),
    };
    executionUpdateQueryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    taskExecutionUpdatesRepository = {
      createQueryBuilder: jest.fn(() => executionUpdateQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
    };
    projectMembersRepository = {
      findOne: jest.fn(),
    };
    authorizationPolicyService = {
      canManageProject: jest.fn().mockResolvedValue(true),
      canManageTask: jest.fn().mockResolvedValue(true),
      hasPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };
    projectVisibilityService = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getVisibleProjectIds: jest.fn().mockResolvedValue('all'),
    };
    taskAssignmentService = {
      changeTaskAssignment: jest.fn(
        (...args: [string, string, string | null]) =>
          Promise.resolve({
            assigneeId: args[2],
            id: args[1],
            percentComplete: 20,
            priority: 'medium',
            projectId,
            status: TaskStatus.Todo,
            taskKind: TaskKind.Standard,
            title: 'Task',
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
        TasksService,
        SchedulingFoundationService,
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(TaskExecutionUpdate),
          useValue: taskExecutionUpdatesRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
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
          provide: TaskAssignmentService,
          useValue: taskAssignmentService,
        },
      ],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a task from the existing DTO shape', async () => {
    const result = await service.create(
      {
        projectId,
        sequenceNumber: 10,
        taskKind: TaskKind.Standard,
        title: 'Prepare steering committee readout',
        status: TaskStatus.Todo,
      },
      managerActor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        sequenceNumber: 10,
        taskKind: TaskKind.Standard,
        title: 'Prepare steering committee readout',
        status: TaskStatus.Todo,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: taskId,
        projectId,
        title: 'Prepare steering committee readout',
      }),
    );
  });

  it('creates assigned tasks unassigned before invoking the canonical command', async () => {
    await service.create(
      {
        assigneeId: userId,
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare steering committee readout',
      },
      managerActor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: managerActor.userId,
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare steering committee readout',
        updatedById: managerActor.userId,
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenCalledWith(
      projectId,
      taskId,
      userId,
      managerActor,
      taskTransactionManager,
    );
  });

  it('allows assigned team members to record execution updates on their tasks', async () => {
    const task = {
      assigneeId: userId,
      id: taskId,
      percentComplete: 20,
      priority: 'medium',
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Prepare release plan',
    };
    tasksRepository.findOne?.mockResolvedValue(task);
    authorizationPolicyService.canManageTask.mockResolvedValueOnce(false);
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });

    const result = await service.recordExecutionUpdate(
      taskId,
      {
        nextActionOwnerId: userId,
        nextStep: 'Confirm API owner',
        percentComplete: 50,
        priority: 'medium',
        status: TaskStatus.InProgress,
        updateNotes: 'Stand-up progress for assigned work.',
      },
      { email: 'member@example.com', roleId: 'role-tm', userId },
    );

    expect(result).toEqual(
      expect.objectContaining({
        latestExecutionUpdate: expect.objectContaining({
          nextStep: 'Confirm API owner',
          updateNotes: 'Stand-up progress for assigned work.',
        }),
        percentComplete: 50,
        status: TaskStatus.InProgress,
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).not.toHaveBeenCalled();
    expect(taskTransactionManager.create).toHaveBeenCalledWith(
      TaskExecutionUpdate,
      expect.objectContaining({
        changes: expect.objectContaining({
          assigneeId: {
            nextValue: userId,
            previousValue: userId,
          },
        }),
      }),
    );
  });

  it('allows assigned contributors to change canonical execution-update fields', async () => {
    const task = {
      assigneeId: userId,
      id: taskId,
      percentComplete: 20,
      priority: 'medium',
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Prepare release plan',
    };
    tasksRepository.findOne?.mockResolvedValue(task);
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'membership' });

    await expect(
      service.recordExecutionUpdate(
        taskId,
        {
          nextActionOwnerId: userId,
          nextStep: 'Confirm API owner',
          percentComplete: 50,
          priority: 'high',
          status: TaskStatus.InProgress,
          updateNotes: 'Stand-up progress for assigned work.',
        },
        { email: 'member@example.com', roleId: 'role-tm', userId },
      ),
    ).resolves.toEqual(expect.objectContaining({ priority: 'high' }));
    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ capability: 'task.record_update' }),
    );
  });

  it('records an execution update with priority and timeline details', async () => {
    const task = {
      assigneeId: null,
      id: taskId,
      percentComplete: 20,
      priority: 'medium',
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Prepare release plan',
    };
    tasksRepository.findOne?.mockResolvedValue(task);
    authorizationPolicyService.canManageTask.mockResolvedValueOnce(true);
    projectMembersRepository.findOne?.mockResolvedValue({ id: 'member-id' });

    const result = await service.recordExecutionUpdate(
      taskId,
      {
        assigneeId: userId,
        nextActionOwnerId: userId,
        nextStep: 'Confirm API owner',
        percentComplete: 50,
        priority: 'critical',
        status: TaskStatus.InProgress,
        targetCompletionDate: '2026-08-07',
        updateNotes: 'Customer review moved the API task up.',
      },
      { email: 'pm@example.com', roleId: 'role-1', userId },
    );

    expect(result).toEqual(
      expect.objectContaining({
        assigneeId: userId,
        dueDate: '2026-08-07',
        latestExecutionUpdate: expect.objectContaining({
          nextActionOwnerId: userId,
          nextStep: 'Confirm API owner',
          priority: 'critical',
          updateNotes: 'Customer review moved the API task up.',
          updatedById: userId,
        }),
        percentComplete: 50,
        priority: 'critical',
        status: TaskStatus.InProgress,
      }),
    );
    expect(taskTransactionManager.create).toHaveBeenCalledWith(
      TaskExecutionUpdate,
      expect.objectContaining({
        changes: expect.objectContaining({
          priority: {
            previousValue: 'medium',
            nextValue: 'critical',
          },
        }),
        nextStep: 'Confirm API owner',
        priority: 'critical',
        updateNotes: 'Customer review moved the API task up.',
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenCalledWith(
      projectId,
      taskId,
      userId,
      { email: 'pm@example.com', roleId: 'role-1', userId },
      taskTransactionManager,
    );
  });

  it('applies completion defaults when an execution update moves a task to done', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      assigneeId: null,
      actualEndDate: null,
      id: taskId,
      percentComplete: 60,
      priority: 'medium',
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Prepare release plan',
    };
    tasksRepository.findOne?.mockResolvedValue(task);
    authorizationPolicyService.canManageTask.mockResolvedValueOnce(true);

    const result = await service.recordExecutionUpdate(
      taskId,
      {
        percentComplete: 60,
        priority: 'medium',
        status: TaskStatus.Done,
        updateNotes: 'Kanban status changed to Done.',
      },
      { email: 'pm@example.com', roleId: 'role-1', userId },
    );

    expect(taskTransactionManager.save).toHaveBeenCalledWith(
      Task,
      expect.objectContaining({
        actualEndDate: '2026-08-03',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
    expect(taskTransactionManager.create).toHaveBeenCalledWith(
      TaskExecutionUpdate,
      expect.objectContaining({
        percentComplete: 100,
        status: TaskStatus.Done,
        updateNotes: 'Kanban status changed to Done.',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        actualEndDate: '2026-08-03',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('loads recent execution history for one visible task', async () => {
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
    });
    taskExecutionUpdatesRepository.find.mockResolvedValue([
      {
        changes: {
          priority: { previousValue: 'medium', nextValue: 'high' },
        },
        createdAt: new Date('2026-08-02T09:00:00.000Z'),
        id: 'execution-update-1',
        nextStep: 'Clear blocker',
        percentComplete: 60,
        priority: 'high',
        projectId,
        status: TaskStatus.Blocked,
        taskId,
        updateNotes: 'Blocker: Waiting for credentials.',
        updatedById: userId,
      },
    ]);

    await expect(
      service.findExecutionUpdates(taskId, managerActor),
    ).resolves.toEqual([
      expect.objectContaining({
        changes: {
          priority: { previousValue: 'medium', nextValue: 'high' },
        },
        nextStep: 'Clear blocker',
        updateNotes: 'Blocker: Waiting for credentials.',
      }),
    ]);
    expect(taskExecutionUpdatesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      where: { taskId },
      take: 10,
    });
  });

  it('does not expose execution history to external actors', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

    await expect(
      service.findExecutionUpdates(taskId, {
        roleId: 'partner-role',
        userId: 'partner-1',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(taskExecutionUpdatesRepository.find).not.toHaveBeenCalled();
  });

  it('creates a child task under a summary parent in the same project', async () => {
    tasksRepository.findOne?.mockResolvedValueOnce({
      id: 'parent-task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Summary,
    });

    await service.create(
      {
        parentTaskId: 'parent-task-id',
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      },
      managerActor,
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

  it('creates a task from the new taskType DTO shape while storing the compatible taskKind', async () => {
    const result = await service.create(
      {
        projectId,
        taskType: TaskType.Task,
        title: 'Build data migration plan',
      },
      managerActor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Build data migration plan',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: taskId,
        taskKind: TaskKind.Standard,
      }),
    );
  });

  it('creates a child task under a standard task parent', async () => {
    tasksRepository.findOne?.mockResolvedValueOnce({
      id: 'parent-task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
    });

    await service.create(
      {
        parentTaskId: 'parent-task-id',
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Prepare cutover checklist',
      },
      managerActor,
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

  it('rejects child task creation under a subtask', async () => {
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
      service.create(
        {
          parentTaskId: 'subtask-id',
          projectId,
          taskKind: TaskKind.Standard,
          title: 'Nested child',
        },
        managerActor,
      ),
    ).rejects.toThrow('Subtasks cannot contain child tasks');
  });

  it('rejects milestone creation when planned dates are explicitly conflicting', async () => {
    await expect(
      service.create(
        {
          plannedEndDate: '2026-07-03',
          plannedStartDate: '2026-07-01',
          projectId,
          taskKind: TaskKind.Milestone,
          title: 'Go-live',
        },
        managerActor,
      ),
    ).rejects.toThrow(
      'Milestones must have matching planned start and end dates',
    );
  });

  it('normalizes milestone creation when only the planned start date is supplied', async () => {
    await service.create(
      {
        plannedStartDate: '2026-07-01',
        projectId,
        taskType: TaskType.Milestone,
        title: 'Go-live',
      },
      managerActor,
    );

    expect(tasksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedEndDate: '2026-07-01',
        plannedStartDate: '2026-07-01',
        taskKind: TaskKind.Milestone,
      }),
    );
  });

  it('denies a SERVICE task create through the canonical capability boundary before persistence', async () => {
    const serviceActor = {
      email: 'service@example.com',
      identityType: UserIdentityType.Service,
      roleId: 'role-PLATFORM_ADMIN',
      userId: 'service-id',
    };
    canonicalCapabilityResolver.resolve.mockResolvedValue({
      allowed: false,
      audience: 'internal',
      reasonCode: 'MISSING_PERMISSION',
    });

    await expect(
      service.create({ projectId, title: 'Forbidden task' }, serviceActor),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: serviceActor,
        capability: 'task.create',
      }),
    );
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('lists all tasks with project and assignee relations', async () => {
    taskQueryBuilder.getMany.mockResolvedValue([{ id: taskId }]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ id: taskId }),
    ]);
    expect(tasksRepository.createQueryBuilder).toHaveBeenCalledWith('task');
    expect(taskQueryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
      'task.project',
      'project',
    );
    expect(taskQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'task.assignee',
      'assignee',
    );
    expect(taskQueryBuilder.where).not.toHaveBeenCalled();
    expect(executionUpdateQueryBuilder.distinctOn).toHaveBeenCalledWith([
      'executionUpdate.taskId',
    ]);
    expect(executionUpdateQueryBuilder.orderBy).toHaveBeenCalledWith(
      'executionUpdate.taskId',
      'ASC',
    );
    expect(executionUpdateQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'executionUpdate.createdAt',
      'DESC',
    );
  });

  it('lists tasks across all visible projects for an Executive without membership filtering', async () => {
    const executiveActor = {
      email: 'executive@example.com',
      roleId: 'role-EXECUTIVE',
      userId: 'executive-user-id',
    };
    taskQueryBuilder.getMany.mockResolvedValue([{ id: taskId, projectId }]);

    await expect(service.findAll(executiveActor)).resolves.toEqual([
      expect.objectContaining({ id: taskId, projectId }),
    ]);

    expect(projectVisibilityService.getVisibleProjectIds).toHaveBeenCalledWith(
      executiveActor,
    );
    expect(taskQueryBuilder.where).not.toHaveBeenCalled();
  });

  it('lists authenticated user tasks with filters and required sorting', async () => {
    taskQueryBuilder.getMany.mockResolvedValue([
      { id: taskId, assigneeId: userId },
    ]);

    await expect(
      service.findMyTasks(userId, {
        priority: 'high',
        projectId,
        status: TaskStatus.InProgress,
      }),
    ).resolves.toEqual([
      { id: taskId, assigneeId: userId, latestExecutionUpdate: null },
    ]);

    expect(taskQueryBuilder.where).toHaveBeenCalledWith(
      'task.assignee_id = :userId',
      { userId },
    );
    expect(taskQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.task_kind IN (:...taskKinds)',
      { taskKinds: [TaskKind.Standard, TaskKind.Milestone] },
    );
    expect(taskQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.status = :status',
      { status: TaskStatus.InProgress },
    );
    expect(taskQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.project_id = :projectId',
      { projectId },
    );
    expect(taskQueryBuilder.andWhere).toHaveBeenCalledWith(
      'task.priority = :priority',
      { priority: 'high' },
    );
    expect(taskQueryBuilder.orderBy).toHaveBeenCalledWith(
      'task.due_date',
      'ASC',
    );
    expect(taskQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'task.created_at',
      'DESC',
    );
  });

  it('includes direct child context for an authenticated parent task owner', async () => {
    const parentTask = {
      id: 'parent-task-id',
      assigneeId: userId,
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Task A',
    };
    const childTask = {
      id: 'child-task-id',
      assigneeId: 'delegated-user-id',
      parentTaskId: parentTask.id,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Sub-task A1',
    };
    taskQueryBuilder.getMany.mockResolvedValue([parentTask]);
    tasksRepository.find?.mockResolvedValueOnce([childTask]);

    await expect(service.findMyTasks(userId)).resolves.toEqual([
      expect.objectContaining({ id: parentTask.id }),
      expect.objectContaining({ id: childTask.id }),
    ]);

    expect(tasksRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { assignee: true, project: true },
        where: expect.objectContaining({
          parentTaskId: expect.any(Object),
          projectId: expect.any(Object),
        }),
      }),
    );
  });

  it('includes parent context for an authenticated child task assignee', async () => {
    const parentTask = {
      id: 'parent-task-id',
      assigneeId: 'parent-owner-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Task A',
    };
    const childTask = {
      id: 'child-task-id',
      assigneeId: userId,
      parentTaskId: parentTask.id,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Sub-task A1',
    };
    taskQueryBuilder.getMany.mockResolvedValue([childTask]);
    tasksRepository.find
      ?.mockResolvedValueOnce([])
      .mockResolvedValueOnce([parentTask]);

    await expect(service.findMyTasks(userId)).resolves.toEqual([
      expect.objectContaining({ id: parentTask.id }),
      expect.objectContaining({ id: childTask.id }),
    ]);
  });

  it('does not expose unassigned contextual tasks to external actors', async () => {
    const externalActor = {
      email: 'customer@example.com',
      roleId: 'customer-role',
      userId,
    };
    const parentTask = {
      assigneeId: userId,
      id: 'parent-task-id',
      parentTaskId: null,
      percentComplete: 10,
      priority: 'medium',
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Customer action',
    };
    const childTask = {
      assigneeId: 'internal-user-id',
      id: 'child-task-id',
      parentTaskId: parentTask.id,
      projectId,
      remarks: 'Internal detail',
      taskKind: TaskKind.Standard,
      title: 'Internal child task',
    };
    taskQueryBuilder.getMany.mockResolvedValue([parentTask]);
    tasksRepository.find?.mockResolvedValueOnce([childTask]);
    authorizationPolicyService.isExternalActor.mockResolvedValue(true);

    const result = await service.findMyTasks(userId, {}, externalActor);

    expect(result).toEqual([
      expect.objectContaining({ id: parentTask.id, title: parentTask.title }),
    ]);
    expect(result[0]).not.toHaveProperty('remarks');
    expect(result).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: childTask.id })]),
    );
  });

  it('keeps personal task context bounded to directly assigned task branches', async () => {
    const parentTask = {
      id: 'parent-task-id',
      assigneeId: userId,
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Task A',
    };
    taskQueryBuilder.getMany.mockResolvedValue([parentTask]);
    tasksRepository.find?.mockResolvedValueOnce([]);

    await service.findMyTasks(userId);

    expect(tasksRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          parentTaskId: expect.any(Object),
          projectId: expect.any(Object),
        }),
      }),
    );
  });

  it('omits empty authenticated user task filters', async () => {
    taskQueryBuilder.getMany.mockResolvedValue([]);

    await service.findMyTasks(userId);

    expect(taskQueryBuilder.where).toHaveBeenCalledWith(
      'task.assignee_id = :userId',
      { userId },
    );
    expect(taskQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
  });

  it('intersects all-task listing with visible project ids', async () => {
    projectVisibilityService.getVisibleProjectIds.mockResolvedValue([
      projectId,
    ]);
    taskQueryBuilder.getMany.mockResolvedValue([{ id: taskId, projectId }]);

    await service.findAll({
      email: 'pm@example.com',
      roleId: 'role-1',
      userId,
    });

    expect(taskQueryBuilder.where).toHaveBeenCalledWith(
      'task.project_id IN (:...projectIds)',
      { projectIds: [projectId] },
    );
  });

  it('summarizes authenticated user tasks', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));
    tasksRepository.find?.mockResolvedValue([
      {
        id: 'todo-overdue',
        assigneeId: userId,
        dueDate: '2026-06-01',
        status: TaskStatus.Todo,
      },
      {
        id: 'in-progress-overdue',
        assigneeId: userId,
        dueDate: '2026-06-05',
        status: TaskStatus.InProgress,
      },
      {
        id: 'blocked-future',
        assigneeId: userId,
        dueDate: '2026-06-10',
        status: TaskStatus.Blocked,
      },
      {
        id: 'done-overdue-but-complete',
        assigneeId: userId,
        dueDate: '2026-06-01',
        status: TaskStatus.Done,
      },
      {
        id: 'backlog-without-due-date',
        assigneeId: userId,
        status: TaskStatus.Backlog,
      },
      {
        id: 'summary-phase',
        assigneeId: userId,
        status: TaskStatus.Done,
        taskKind: TaskKind.Summary,
      },
    ]);

    await expect(service.getMyTasksSummary(userId)).resolves.toEqual({
      totalTasks: 5,
      todoTasks: 1,
      inProgressTasks: 1,
      blockedTasks: 1,
      completedTasks: 1,
      overdueTasks: 2,
    });
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: expect.objectContaining({ assigneeId: userId }),
    });
  });

  it('rejects assigning a summary task to a user', async () => {
    taskAssignmentService.changeTaskAssignment.mockRejectedValueOnce(
      new BadRequestException('Summary tasks cannot be assigned to a user'),
    );

    await expect(
      service.create(
        {
          assigneeId: userId,
          projectId,
          taskKind: TaskKind.Summary,
          title: 'Planning Phase',
        },
        managerActor,
      ),
    ).rejects.toThrow('Summary tasks cannot be assigned to a user');
  });

  it('rejects manually completing a summary task', async () => {
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Summary,
      title: 'Planning Phase',
    });

    await expect(
      service.update(
        taskId,
        {
          status: TaskStatus.Done,
        },
        managerActor,
      ),
    ).rejects.toThrow('Summary task status is calculated from child work');
  });

  it('gets one task with project and assignee relations', async () => {
    tasksRepository.findOne?.mockResolvedValue({ id: taskId });

    await expect(service.findOne(taskId, managerActor)).resolves.toEqual(
      expect.objectContaining({ id: taskId }),
    );
    expect(tasksRepository.findOne).toHaveBeenCalledWith({
      where: { id: taskId },
      relations: { project: true, assignee: true },
    });
  });

  it('resolves Executive task detail through canonical task.view without a service-level membership check', async () => {
    const executiveActor = {
      email: 'executive@example.com',
      roleId: 'role-EXECUTIVE',
      userId: 'executive-user-id',
    };
    tasksRepository.findOne?.mockResolvedValue({ id: taskId, projectId });

    await expect(service.findOne(taskId, executiveActor)).resolves.toEqual(
      expect.objectContaining({ id: taskId, projectId }),
    );

    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: executiveActor,
        capability: 'task.view',
      }),
    );
    expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
  });

  it('throws when a task is missing', async () => {
    tasksRepository.findOne?.mockResolvedValue(null);

    await expect(service.findOne(taskId)).rejects.toThrow(NotFoundException);
  });

  it('updates an existing task', async () => {
    const task = { id: taskId, title: 'Original', status: TaskStatus.Backlog };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.update(
      taskId,
      {
        status: TaskStatus.Done,
        title: 'Updated',
      },
      managerActor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        title: 'Updated',
        status: TaskStatus.Done,
      }),
    );
  });

  it('requires task authority in both projects when moving a task', async () => {
    const targetProjectId = '79e91799-0c04-46da-a729-07cabf1da901';
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Original',
    });
    canonicalCapabilityResolver.resolve.mockResolvedValueOnce({
      allowed: false,
      audience: 'internal',
      reasonCode: 'DESTINATION_SCOPE_DENIED',
    });

    await expect(
      service.update(taskId, { projectId: targetProjectId }, managerActor),
    ).rejects.toThrow('DESTINATION_SCOPE_DENIED');

    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'task.move',
        destinationProjectId: targetProjectId,
        resource: expect.objectContaining({ projectId }),
      }),
    );
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('rejects task movement when source-project authority is missing', async () => {
    const targetProjectId = '79e91799-0c04-46da-a729-07cabf1da901';
    tasksRepository.findOne?.mockResolvedValue({
      assigneeId: 'another-user-id',
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Original',
    });
    canonicalCapabilityResolver.resolve.mockResolvedValueOnce({
      allowed: false,
      audience: 'internal',
      reasonCode: 'MISSING_PERMISSION',
    });

    await expect(
      service.update(taskId, { projectId: targetProjectId }, managerActor),
    ).rejects.toThrow('MISSING_PERMISSION');

    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledTimes(1);
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('allows task movement when the actor can manage both projects', async () => {
    const targetProjectId = '79e91799-0c04-46da-a729-07cabf1da901';
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: taskId,
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Original',
      })
      .mockResolvedValueOnce({
        id: taskId,
        projectId: targetProjectId,
        taskKind: TaskKind.Standard,
        title: 'Original',
      });

    await service.update(taskId, { projectId: targetProjectId }, managerActor);

    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: 'task.move',
        destinationProjectId: targetProjectId,
      }),
    );
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: targetProjectId }),
    );
  });

  it('does not require a second authority check when the project is unchanged', async () => {
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: taskId,
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Original',
      })
      .mockResolvedValueOnce({ id: taskId, projectId });

    await service.update(taskId, { projectId }, managerActor);

    expect(canonicalCapabilityResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ capability: 'task.view' }),
    );
    expect(tasksRepository.save).toHaveBeenCalled();
  });

  it('revalidates a preserved assignee when moving a task between projects', async () => {
    const targetProjectId = 'f7287215-927c-47ca-b7c2-47ce47119899';
    const task = {
      assigneeId: userId,
      id: taskId,
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    tasksRepository.findOne
      ?.mockResolvedValueOnce(task)
      .mockResolvedValueOnce({ ...task, projectId: targetProjectId });

    await service.update(taskId, { projectId: targetProjectId }, managerActor);

    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenNthCalledWith(
      1,
      projectId,
      taskId,
      null,
      managerActor,
      taskTransactionManager,
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenNthCalledWith(
      2,
      targetProjectId,
      taskId,
      userId,
      managerActor,
      taskTransactionManager,
    );
  });

  it('fails closed when task update is called without an actor', async () => {
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Original',
    });

    await expect(service.update(taskId, { title: 'Updated' })).rejects.toThrow(
      'Authenticated user is required',
    );
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('persists reassignment on a raw mutation task and reloads the read model', async () => {
    const previousAssigneeId = 'e47142f0-1111-4111-8111-111111111111';
    const nextAssigneeId = '1612c003-6ff0-4852-8dc9-2b0d5c422cd6';
    const task = {
      id: taskId,
      assigneeId: previousAssigneeId,
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    const reloadedTask = {
      ...task,
      assignee: { id: nextAssigneeId },
      assigneeId: nextAssigneeId,
    };
    tasksRepository.findOne
      ?.mockResolvedValueOnce(task)
      .mockResolvedValueOnce(reloadedTask);
    projectMembersRepository.findOne?.mockResolvedValueOnce({
      id: 'assignee-member-id',
    });

    const result = await service.update(
      taskId,
      {
        assigneeId: nextAssigneeId,
        percentComplete: 0,
        remarks: '',
        status: TaskStatus.Todo,
      },
      managerActor,
    );

    expect(tasksRepository.findOne).toHaveBeenNthCalledWith(1, {
      relations: { project: true },
      where: { id: taskId },
    });
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        assigneeId: previousAssigneeId,
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenCalledWith(
      projectId,
      taskId,
      nextAssigneeId,
      managerActor,
      taskTransactionManager,
    );
    expect(tasksRepository.findOne).toHaveBeenNthCalledWith(2, {
      where: { id: taskId },
      relations: { project: true, assignee: true },
    });
    expect(result.assigneeId).toBe(nextAssigneeId);
    expect(result.assignee?.id).toBe(nextAssigneeId);
  });

  it('persists clearing an assignee with null and reloads the read model', async () => {
    const task = {
      id: taskId,
      assigneeId: userId,
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    const reloadedTask = {
      ...task,
      assignee: null,
      assigneeId: null,
    };
    tasksRepository.findOne
      ?.mockResolvedValueOnce(task)
      .mockResolvedValueOnce(reloadedTask);

    const result = await service.update(
      taskId,
      {
        assigneeId: null,
      },
      managerActor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        assigneeId: userId,
      }),
    );
    expect(taskAssignmentService.changeTaskAssignment).toHaveBeenCalledWith(
      projectId,
      taskId,
      null,
      managerActor,
      taskTransactionManager,
    );
    expect(result.assigneeId).toBeNull();
    expect(result.assignee).toBeNull();
  });

  it('sets percent complete to 100 when status is updated to done', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: null,
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.update(
      taskId,
      {
        status: TaskStatus.Done,
      },
      managerActor,
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

  it('sets status to done when percent complete is updated to 100', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: null,
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.update(
      taskId,
      {
        percentComplete: 100,
      },
      managerActor,
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

  it('preserves an existing completion date when a task is completed again', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: '2026-07-29',
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.update(
      taskId,
      {
        status: TaskStatus.Done,
      },
      managerActor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actualEndDate: '2026-07-29',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('rejects completion when the inferred completion date is before actual start', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const task = {
      actualEndDate: null,
      actualStartDate: '2026-08-05',
      id: taskId,
      percentComplete: 40,
      projectId,
      status: TaskStatus.InProgress,
      taskKind: TaskKind.Standard,
      title: 'Original',
    };
    tasksRepository.findOne?.mockResolvedValue(task);

    await expect(
      service.update(
        taskId,
        {
          status: TaskStatus.Done,
        },
        managerActor,
      ),
    ).rejects.toThrow('Task cannot be completed before its actual start date');
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('rejects assigning a task to itself as parent', async () => {
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      projectId,
      taskKind: TaskKind.Standard,
      title: 'Original',
    });

    await expect(
      service.update(
        taskId,
        {
          parentTaskId: taskId,
        },
        managerActor,
      ),
    ).rejects.toThrow('A task cannot be its own parent');
  });

  it('rejects hierarchy cycles when updating a parent task', async () => {
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: taskId,
        projectId,
        taskKind: TaskKind.Standard,
        title: 'Original',
      })
      .mockResolvedValueOnce({
        id: 'child-task-id',
        parentTaskId: taskId,
        projectId,
        taskKind: TaskKind.Summary,
      })
      .mockResolvedValueOnce({
        id: 'child-task-id',
        parentTaskId: taskId,
        projectId,
        taskKind: TaskKind.Summary,
      })
      .mockResolvedValueOnce({
        id: taskId,
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Summary,
      });

    await expect(
      service.update(
        taskId,
        {
          parentTaskId: 'child-task-id',
        },
        managerActor,
      ),
    ).rejects.toThrow('Task hierarchy cannot contain cycles');
  });

  it('allows an assigned team member to update own operational task fields', async () => {
    const actor = {
      email: 'engineer@example.com',
      roleId: 'engineer-role-id',
      userId,
    };
    const task = {
      id: taskId,
      assigneeId: userId,
      projectId,
      status: TaskStatus.Todo,
    };
    tasksRepository.findOne?.mockResolvedValue(task);
    projectMembersRepository.findOne?.mockResolvedValueOnce({
      id: 'assignee-member-id',
    });
    await service.update(
      taskId,
      {
        percentComplete: 50,
        remarks: 'Working through integration testing.',
        status: TaskStatus.InProgress,
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        assigneeId: userId,
        projectId,
        percentComplete: 50,
        remarks: 'Working through integration testing.',
        status: TaskStatus.InProgress,
      }),
    );
  });

  it('does not grant edit authority over contextual child tasks to the parent owner', async () => {
    const actor = {
      email: 'parent-owner@example.com',
      roleId: 'contributor-role-id',
      userId,
    };
    tasksRepository.findOne?.mockResolvedValue({
      id: 'child-task-id',
      assigneeId: 'delegated-user-id',
      parentTaskId: taskId,
      projectId,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Delegated child',
    });
    canonicalCapabilityResolver.resolve.mockResolvedValueOnce({
      allowed: false,
      audience: 'internal',
      reasonCode: 'ASSIGNMENT_REQUIRED',
    });

    await expect(
      service.update('child-task-id', { status: TaskStatus.InProgress }, actor),
    ).rejects.toThrow('ASSIGNMENT_REQUIRED');

    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('rejects assigned team member edits to manager-only task fields', async () => {
    const actor = {
      email: 'engineer@example.com',
      roleId: 'engineer-role-id',
      userId,
    };
    tasksRepository.findOne?.mockResolvedValue({
      id: taskId,
      assigneeId: userId,
      projectId,
      title: 'Original',
    });
    canonicalCapabilityResolver.resolve.mockResolvedValueOnce({
      allowed: false,
      audience: 'internal',
      reasonCode: 'MISSING_PERMISSION',
    });

    await expect(
      service.update(taskId, { title: 'Manager-only edit' }, actor),
    ).rejects.toThrow('MISSING_PERMISSION');
  });

  it('removes an existing task with soft delete', async () => {
    const task = { id: taskId, title: 'Task to remove' };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.remove(taskId, managerActor);

    expect(tasksRepository.softRemove).toHaveBeenCalledWith(
      expect.objectContaining(task),
    );
  });
});
