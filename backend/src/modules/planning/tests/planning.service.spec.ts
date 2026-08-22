import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { ResourceAllocationUnit } from '../../../common/enums/resource-allocation-unit.enum';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskType } from '../../../common/enums/task-type.enum';
import { SchedulingContextFactory } from '../../../common/scheduling/scheduling-context.factory';
import { SchedulingFoundationService } from '../../../common/scheduling/scheduling-foundation.service';
import { Project } from '../../projects/entities/project.entity';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { ProjectsService } from '../../projects/projects.service';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { PlanningScheduleSnapshot } from '../entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from '../entities/planning-task-schedule.entity';
import { PortfolioDependency } from '../entities/portfolio-dependency.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ResourceCapacity } from '../entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from '../entities/resource-workload-snapshot.entity';
import { PlanningBackwardPassService } from '../planning-backward-pass.service';
import { PlanningCriticalPathService } from '../planning-critical-path.service';
import { PlanningFloatService } from '../planning-float.service';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../planning-graph-builder.service';
import { PlanningScheduleEngineService } from '../planning-schedule-engine.service';
import { PlanningSnapshotService } from '../planning-snapshot.service';
import { PlanningWorkPackageDuplicationService } from '../planning-work-package-duplication.service';
import { PlanningService } from '../planning.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const actor = {
  email: 'pm@example.com',
  roleId: 'project-manager-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};
const projectId = '0f1b74f2-5715-4d1a-91ad-d569d3ecfb60';
const taskId = 'e9f527f1-f645-4aef-b6a2-a88905b8fe8e';
const userId = '9fce3bfb-a20c-4748-ad1c-60a138e66cce';

describe('PlanningService', () => {
  let service: PlanningService;
  let planningSnapshotService: PlanningSnapshotService;
  let scheduleSnapshotsRepository: MockRepository<PlanningScheduleSnapshot>;
  let planningTaskSchedulesRepository: MockRepository<PlanningTaskSchedule>;
  let resourceAllocationsRepository: MockRepository<ResourceAllocation>;
  let resourceCapacitiesRepository: MockRepository<ResourceCapacity>;
  let workloadSnapshotsRepository: MockRepository<ResourceWorkloadSnapshot>;
  let portfolioDependenciesRepository: MockRepository<PortfolioDependency>;
  let projectsRepository: MockRepository<Project>;
  let tasksRepository: MockRepository<Task>;
  let taskDependenciesRepository: MockRepository<TaskDependency>;
  let usersRepository: MockRepository<User>;
  let transactionManager: { getRepository: jest.Mock };
  let authorizationPolicyService: { canManageProject: jest.Mock };
  let projectVisibilityService: {
    canViewProject: jest.Mock;
    getVisibleProjectIds: jest.Mock;
  };
  let projectsService: {
    captureProjectBaseline: jest.Mock;
    createProjectTaskDependency: jest.Mock;
    findProjectBaselines: jest.Mock;
    findProjectTaskDependencies: jest.Mock;
    removeProjectTaskDependency: jest.Mock;
    updateProjectTaskDependency: jest.Mock;
  };

  beforeEach(async () => {
    scheduleSnapshotsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'snapshot-id', ...input }),
      ),
    };
    planningTaskSchedulesRepository = {
      create: jest.fn((input) => input),
      delete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve(
          Array.isArray(input)
            ? input.map((row, index) => ({
                id: `schedule-row-${index + 1}`,
                ...row,
              }))
            : { id: 'schedule-row-1', ...input },
        ),
      ),
    };
    resourceAllocationsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'allocation-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    resourceCapacitiesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'capacity-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    workloadSnapshotsRepository = {
      find: jest.fn(),
    };
    portfolioDependenciesRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'portfolio-dep-id', ...input }),
      ),
      softRemove: jest.fn(),
    };
    projectsRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: projectId, startDate: '2026-07-01' }),
    };
    tasksRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(async () => {
        const persistedSchedule =
          await planningTaskSchedulesRepository.findOne?.();
        return persistedSchedule?.task ? [persistedSchedule.task] : [];
      }),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: taskId, ...input })),
    };
    taskDependenciesRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    transactionManager = {
      getRepository: jest.fn((entity) => {
        if (entity === PlanningScheduleSnapshot) {
          return scheduleSnapshotsRepository;
        }
        if (entity === PlanningTaskSchedule) {
          return planningTaskSchedulesRepository;
        }
        if (entity === Project) {
          return projectsRepository;
        }
        if (entity === Task) {
          return tasksRepository;
        }
        if (entity === TaskDependency) {
          return taskDependenciesRepository;
        }
        throw new Error(`Unexpected repository ${String(entity)}`);
      }),
    };
    (
      scheduleSnapshotsRepository as Repository<PlanningScheduleSnapshot>
    ).manager = {
      getRepository: transactionManager.getRepository,
      transaction: jest.fn((callback) => callback(transactionManager)),
    } as Repository<PlanningScheduleSnapshot>['manager'];
    authorizationPolicyService = {
      canManageProject: jest.fn().mockResolvedValue(true),
    };
    projectVisibilityService = {
      canViewProject: jest.fn().mockResolvedValue(true),
      getVisibleProjectIds: jest.fn().mockResolvedValue('all'),
    };
    projectsService = {
      captureProjectBaseline: jest.fn(),
      createProjectTaskDependency: jest.fn(),
      findProjectBaselines: jest.fn(),
      findProjectTaskDependencies: jest.fn(),
      removeProjectTaskDependency: jest.fn(),
      updateProjectTaskDependency: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanningService,
        SchedulingFoundationService,
        PlanningBackwardPassService,
        PlanningCriticalPathService,
        PlanningFloatService,
        PlanningForwardPassService,
        PlanningGraphBuilderService,
        PlanningScheduleEngineService,
        PlanningSnapshotService,
        SchedulingContextFactory,
        {
          provide: PlanningWorkPackageDuplicationService,
          useValue: {
            duplicate: jest.fn(),
            removeDuplicatedWorkPackage: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PlanningScheduleSnapshot),
          useValue: scheduleSnapshotsRepository,
        },
        {
          provide: getRepositoryToken(PlanningTaskSchedule),
          useValue: planningTaskSchedulesRepository,
        },
        {
          provide: getRepositoryToken(ResourceAllocation),
          useValue: resourceAllocationsRepository,
        },
        {
          provide: getRepositoryToken(ResourceCapacity),
          useValue: resourceCapacitiesRepository,
        },
        {
          provide: getRepositoryToken(ResourceWorkloadSnapshot),
          useValue: workloadSnapshotsRepository,
        },
        {
          provide: getRepositoryToken(PortfolioDependency),
          useValue: portfolioDependenciesRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
        {
          provide: ProjectVisibilityService,
          useValue: projectVisibilityService,
        },
        {
          provide: ProjectsService,
          useValue: projectsService,
        },
      ],
    }).compile();

    service = moduleRef.get(PlanningService);
    planningSnapshotService = moduleRef.get(PlanningSnapshotService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aggregates the planning workspace from thin API contracts', async () => {
    const project = {
      id: projectId,
      name: 'ERP Modernization',
      startDate: '2026-07-01',
    } as Project;
    const task = {
      assigneeId: userId,
      id: taskId,
      parentTaskId: null,
      projectId,
      sequenceNumber: 1,
      title: 'Design schedule',
    } as Task;
    const allocation = { id: 'allocation-id' } as ResourceAllocation;
    const schedule = {
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: [taskId],
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectFinishDate: '2026-07-10',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleAnchorDate: '2026-07-01',
      scheduleVersion: 2,
      taskSchedules: [
        {
          durationDays: 4,
          earlyFinish: 4,
          earlyStart: 0,
          freeFloatDays: 0,
          id: 'schedule-row-id',
          isCritical: true,
          lateFinish: 4,
          lateStart: 0,
          percentComplete: 50,
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          snapshotId: 'snapshot-id',
          scheduledEndDate: '2026-07-05',
          scheduledStartDate: '2026-07-01',
          status: null,
          task,
          taskId,
          taskKind: 'standard',
          taskTitle: 'Design schedule',
          totalFloatDays: 0,
        },
      ],
    } as PlanningScheduleSnapshot;

    projectsRepository.findOne?.mockResolvedValue(project);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([allocation]);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue(schedule);
    jest
      .spyOn(planningSnapshotService, 'calculateOperationalForecast')
      .mockResolvedValue({
        ...schedule,
        metadata: { lifecycle: 'operational' },
        scheduleVersion: 0,
      });

    await expect(service.getWorkspace(projectId, actor)).resolves.toEqual({
      criticalPathTaskIds: [taskId],
      dependencies: [],
      project,
      resourceAllocations: [allocation],
      schedules: [
        {
          durationDays: 4,
          earlyFinish: 4,
          earlyStart: 0,
          freeFloatDays: 0,
          id: 'schedule-row-id',
          isCritical: true,
          lateFinish: 4,
          lateStart: 0,
          milestoneCategory: null,
          ownerId: userId,
          parentTaskId: null,
          percentComplete: 50,
          plannedFinishDate: '2026-07-05',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          snapshotId: 'snapshot-id',
          scheduledFinishDate: '2026-07-05',
          scheduledStartDate: '2026-07-01',
          status: null,
          task,
          taskId,
          taskKind: 'standard',
          taskType: 'task',
          taskTitle: 'Design schedule',
          totalFloatDays: 0,
        },
      ],
      snapshot: {
        calculatedAt: null,
        calculationStatus: PlanningCalculationStatus.Calculated,
        criticalPathTaskIds: [taskId],
        id: 'snapshot-id',
        isOfficial: false,
        projectCompletionPercent: 25,
        projectFinishDate: '2026-07-10',
        projectId,
        projectStartDate: '2026-07-01',
        scheduleAnchorDate: '2026-07-01',
        versionNumber: 0,
      },
    });
  });

  it('regenerates the planning workspace snapshot and returns the workspace', async () => {
    const project = { id: projectId, name: 'ERP Modernization' } as Project;
    const task = {
      id: taskId,
      parentTaskId: null,
      projectId,
      sequenceNumber: 1,
      title: 'Design schedule',
    } as Task;
    const schedule = {
      criticalPathTaskIds: [],
      id: 'snapshot-id',
      projectCompletionPercent: 0,
      projectFinishDate: '2026-07-05',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleVersion: 1,
      taskSchedules: [
        {
          durationDays: 4,
          id: 'schedule-row-id',
          isCritical: false,
          percentComplete: 0,
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          snapshotId: 'snapshot-id',
          task,
          taskId,
          taskKind: 'standard',
          taskTitle: 'Design schedule',
          totalFloatDays: null,
        },
      ],
    } as PlanningScheduleSnapshot;
    const rebuildSpy = jest
      .spyOn(planningSnapshotService, 'regenerateOfficialSnapshot')
      .mockResolvedValue(schedule);

    projectsRepository.findOne?.mockResolvedValue(project);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue(schedule);

    const workspace = await service.regenerateWorkspace(projectId, actor);

    expect(authorizationPolicyService.canManageProject).toHaveBeenCalledWith(
      projectId,
      actor,
    );
    expect(rebuildSpy).toHaveBeenCalledWith(projectId, actor);
    expect(workspace).toEqual(
      expect.objectContaining({
        project,
        schedules: [
          expect.objectContaining({
            snapshotId: 'snapshot-id',
            taskId,
            taskTitle: 'Design schedule',
          }),
        ],
        snapshot: expect.objectContaining({
          id: 'snapshot-id',
          projectId,
          versionNumber: 1,
        }),
      }),
    );
  });

  it('rejects workspace regeneration without project manager access', async () => {
    const rebuildSpy = jest.spyOn(
      planningSnapshotService,
      'regenerateOfficialSnapshot',
    );
    authorizationPolicyService.canManageProject.mockResolvedValue(false);

    await expect(service.regenerateWorkspace(projectId, actor)).rejects.toThrow(
      ForbiddenException,
    );
    expect(rebuildSpy).not.toHaveBeenCalled();
  });

  it('returns calculated operational forecast fields in the planning workspace', async () => {
    const project = {
      id: projectId,
      name: 'ERP Modernization',
      startDate: '2026-07-01',
    } as Project;
    const summaryTask = {
      id: 'summary-task-id',
      parentTaskId: null,
      projectId,
      sequenceNumber: 1,
      taskKind: TaskKind.Summary,
      title: 'Implementation',
    } as Task;
    const shortTask = {
      id: 'short-task-id',
      parentTaskId: 'summary-task-id',
      projectId,
      sequenceNumber: 2,
      taskKind: TaskKind.Standard,
      title: 'Short path',
    } as Task;
    const longTask = {
      id: 'long-task-id',
      parentTaskId: 'summary-task-id',
      projectId,
      sequenceNumber: 3,
      taskKind: TaskKind.Standard,
      title: 'Long path',
    } as Task;
    const milestoneTask = {
      id: 'milestone-task-id',
      parentTaskId: 'summary-task-id',
      projectId,
      sequenceNumber: 4,
      taskKind: TaskKind.Milestone,
      title: 'Go Live',
    } as Task;
    const schedule = {
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: ['long-task-id', 'milestone-task-id'],
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectId,
      scheduleVersion: 2,
      taskSchedules: [
        {
          durationDays: 5,
          id: 'summary-schedule-id',
          isCritical: false,
          parentTaskId: null,
          percentComplete: 50,
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          snapshotId: 'snapshot-id',
          task: summaryTask,
          taskId: 'summary-task-id',
          taskKind: TaskKind.Summary,
          totalFloatDays: null,
        },
        {
          durationDays: 2,
          earlyFinish: 2,
          earlyStart: 0,
          freeFloatDays: 3,
          id: 'short-schedule-id',
          isCritical: false,
          lateFinish: 5,
          lateStart: 3,
          parentTaskId: 'summary-task-id',
          percentComplete: 0,
          plannedEndDate: '2026-07-02',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 2,
          snapshotId: 'snapshot-id',
          task: shortTask,
          taskId: 'short-task-id',
          taskKind: TaskKind.Standard,
          totalFloatDays: 3,
        },
        {
          durationDays: 5,
          earlyFinish: 5,
          earlyStart: 0,
          freeFloatDays: 0,
          id: 'long-schedule-id',
          isCritical: true,
          lateFinish: 5,
          lateStart: 0,
          parentTaskId: 'summary-task-id',
          percentComplete: 0,
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 3,
          snapshotId: 'snapshot-id',
          task: longTask,
          taskId: 'long-task-id',
          taskKind: TaskKind.Standard,
          totalFloatDays: 0,
        },
        {
          durationDays: 0,
          earlyFinish: 5,
          earlyStart: 5,
          freeFloatDays: 0,
          id: 'milestone-schedule-id',
          isCritical: true,
          lateFinish: 5,
          lateStart: 5,
          parentTaskId: 'summary-task-id',
          percentComplete: 0,
          plannedEndDate: '2026-07-05',
          plannedStartDate: '2026-07-05',
          projectId,
          sequenceNumber: 4,
          snapshotId: 'snapshot-id',
          task: milestoneTask,
          taskId: 'milestone-task-id',
          taskKind: TaskKind.Milestone,
          totalFloatDays: 0,
        },
      ],
    } as PlanningScheduleSnapshot;
    projectsRepository.findOne?.mockResolvedValue(project);
    projectsService.findProjectTaskDependencies.mockResolvedValue([
      {
        dependencyType: 'FS',
        id: 'short-to-milestone',
        predecessorTaskId: 'short-task-id',
        successorTaskId: 'milestone-task-id',
      },
      {
        dependencyType: 'FS',
        id: 'long-to-milestone',
        predecessorTaskId: 'long-task-id',
        successorTaskId: 'milestone-task-id',
      },
    ] as TaskDependency[]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue(schedule);
    jest
      .spyOn(planningSnapshotService, 'calculateOperationalForecast')
      .mockResolvedValue({
        ...schedule,
        metadata: { lifecycle: 'operational' },
        scheduleVersion: 0,
      });

    const workspace = await service.getWorkspace(projectId, actor);

    expect(workspace.criticalPathTaskIds).toEqual([
      'long-task-id',
      'milestone-task-id',
    ]);
    expect(workspace.schedules).toEqual([
      expect.objectContaining({
        earlyFinish: null,
        earlyStart: null,
        freeFloatDays: null,
        isCritical: false,
        lateFinish: null,
        lateStart: null,
        plannedFinishDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        taskId: 'summary-task-id',
        taskType: 'summary',
        totalFloatDays: null,
      }),
      expect.objectContaining({
        earlyFinish: 2,
        earlyStart: 0,
        freeFloatDays: 3,
        isCritical: false,
        lateFinish: 5,
        lateStart: 3,
        taskId: 'short-task-id',
        taskType: 'task',
        totalFloatDays: 3,
      }),
      expect.objectContaining({
        earlyFinish: 5,
        earlyStart: 0,
        freeFloatDays: 0,
        isCritical: true,
        lateFinish: 5,
        lateStart: 0,
        taskId: 'long-task-id',
        taskType: 'task',
        totalFloatDays: 0,
      }),
      expect.objectContaining({
        earlyFinish: 5,
        earlyStart: 5,
        freeFloatDays: 0,
        isCritical: true,
        lateFinish: 5,
        lateStart: 5,
        taskId: 'milestone-task-id',
        taskType: 'milestone',
        totalFloatDays: 0,
      }),
    ]);
  });

  it('calculates the initial working schedule without creating official history', async () => {
    const project = { id: projectId, name: 'ERP Modernization' } as Project;
    const task = {
      assigneeId: userId,
      dueDate: '2026-07-05',
      id: taskId,
      parentTaskId: null,
      percentComplete: 25,
      plannedStartDate: '2026-07-01',
      priority: 'medium',
      projectId,
      sequenceNumber: 1,
      startDate: '2026-07-01',
      taskKind: 'standard',
      title: 'Design schedule',
    } as Task;

    projectsRepository.findOne?.mockResolvedValue(project);
    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tasksRepository.find?.mockResolvedValue([task]);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);

    const workspace = await service.getWorkspace(projectId, actor);

    expect(
      scheduleSnapshotsRepository.manager.transaction,
    ).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(workspace.snapshot).toEqual(
      expect.objectContaining({ isOfficial: false, versionNumber: 0 }),
    );
    expect(workspace.schedules).toEqual([
      expect.objectContaining({
        plannedFinishDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        taskTitle: 'Design schedule',
      }),
    ]);
  });

  it('allocates the next version while holding the project lock', async () => {
    const task = {
      assigneeId: userId,
      dueDate: '2026-07-05',
      id: taskId,
      parentTaskId: null,
      percentComplete: 25,
      plannedStartDate: '2026-07-01',
      projectId,
      sequenceNumber: 1,
      startDate: '2026-07-01',
      taskKind: TaskKind.Standard,
      title: 'Design schedule',
    } as Task;

    tasksRepository.find?.mockResolvedValue([task]);

    await expect(
      planningSnapshotService.regenerateOfficialSnapshot(projectId, actor),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'snapshot-id',
        projectId,
        taskSchedules: [
          expect.objectContaining({
            snapshotId: 'snapshot-id',
            taskId,
          }),
        ],
      }),
    );

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      lock: { mode: 'pessimistic_write' },
      select: { id: true, startDate: true },
      where: { id: projectId },
    });
    expect(scheduleSnapshotsRepository.findOne).toHaveBeenCalledWith({
      order: { scheduleVersion: 'DESC' },
      select: { id: true, scheduleVersion: true },
      withDeleted: true,
      where: { projectId },
    });
  });

  it('does not reuse a stale official snapshot on Planning open', async () => {
    const existingSchedule = {
      criticalPathTaskIds: [],
      id: 'existing-snapshot-id',
      projectCompletionPercent: 10,
      projectId,
      scheduleVersion: 1,
      taskSchedules: [],
    } as PlanningScheduleSnapshot;

    scheduleSnapshotsRepository.findOne?.mockResolvedValue(existingSchedule);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);

    const workspace = await service.getWorkspace(projectId, actor);

    expect(
      scheduleSnapshotsRepository.manager.transaction,
    ).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(workspace.snapshot.id).not.toBe('existing-snapshot-id');
    expect(workspace.snapshot).toEqual(
      expect.objectContaining({ isOfficial: false, versionNumber: 0 }),
    );
  });

  it('ignores orphaned historical rows and calculates from live tasks without writes', async () => {
    const project = {
      id: projectId,
      name: 'ERP Modernization',
      startDate: '2026-07-01',
    } as Project;
    const orphanedSchedule = {
      id: 'orphaned-schedule-row',
      parentTaskId: null,
      projectId,
      snapshotId: 'existing-snapshot-id',
      task: null,
      taskId,
      taskKind: TaskKind.Summary,
    } as PlanningTaskSchedule;
    const liveTask = {
      dueDate: '2026-07-05',
      id: taskId,
      parentTaskId: null,
      percentComplete: 0,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      sequenceNumber: 1,
      startDate: '2026-07-01',
      taskKind: TaskKind.Summary,
      title: 'Planning',
    } as Task;

    projectsRepository.findOne?.mockResolvedValue(project);
    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce({
        criticalPathTaskIds: [],
        id: 'existing-snapshot-id',
        projectCompletionPercent: 0,
        projectId,
        scheduleVersion: 1,
        taskSchedules: [orphanedSchedule],
      })
      .mockResolvedValueOnce({
        criticalPathTaskIds: [],
        id: 'existing-snapshot-id',
        projectCompletionPercent: 0,
        projectId,
        scheduleVersion: 1,
        taskSchedules: [orphanedSchedule],
      });
    tasksRepository.find?.mockResolvedValue([liveTask]);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);

    const workspace = await service.getWorkspace(projectId, actor);

    expect(planningTaskSchedulesRepository.delete).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(workspace.schedules).toEqual([
      expect.objectContaining({
        plannedFinishDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        taskId,
        taskTitle: 'Planning',
      }),
    ]);
  });

  it('returns an empty working schedule for projects without tasks', async () => {
    const project = {
      id: projectId,
      name: 'Empty Project',
      startDate: '2026-07-01',
    } as Project;

    projectsRepository.findOne?.mockResolvedValue(project);
    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tasksRepository.find?.mockResolvedValue([]);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);

    const workspace = await service.getWorkspace(projectId, actor);

    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(workspace.schedules).toEqual([]);
    expect(workspace.snapshot).toEqual(
      expect.objectContaining({
        isOfficial: false,
        projectCompletionPercent: 0,
        versionNumber: 0,
      }),
    );
  });

  it('populates working schedules from current project tasks without persistence', async () => {
    const project = { id: projectId, name: 'ERP Modernization' } as Project;
    const summaryTask = {
      dueDate: '2026-07-10',
      id: 'summary-task-id',
      parentTaskId: null,
      percentComplete: 50,
      plannedStartDate: '2026-07-01',
      projectId,
      sequenceNumber: 1,
      taskKind: 'summary',
      title: 'Planning',
    } as Task;
    const childTask = {
      dueDate: '2026-07-05',
      id: taskId,
      parentTaskId: 'summary-task-id',
      percentComplete: 100,
      plannedStartDate: '2026-07-02',
      projectId,
      sequenceNumber: 2,
      taskKind: 'milestone',
      title: 'Gate approved',
    } as Task;

    projectsRepository.findOne?.mockResolvedValue(project);
    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tasksRepository.find?.mockResolvedValue([summaryTask, childTask]);
    projectsService.findProjectTaskDependencies.mockResolvedValue([]);
    resourceAllocationsRepository.find?.mockResolvedValue([]);

    const workspace = await service.getWorkspace(projectId, actor);

    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(workspace.snapshot.projectStartDate).toBe('2026-07-02');
    expect(workspace.snapshot.projectFinishDate).toBe('2026-07-02');
    expect(workspace.snapshot.projectCompletionPercent).toBe(75);
    expect(workspace.schedules).toHaveLength(2);
    expect(workspace.schedules[0]).toEqual(
      expect.objectContaining({
        percentComplete: 50,
        plannedFinishDate: '2026-07-10',
        plannedStartDate: '2026-07-01',
      }),
    );
  });

  it('does not invoke persistence during ordinary workspace GET', async () => {
    const project = {
      id: projectId,
      name: 'ERP Modernization',
      startDate: '2026-07-01',
    } as Project;
    const task = {
      id: taskId,
      percentComplete: 0,
      projectId,
      taskKind: 'standard',
      title: 'Design schedule',
    } as Task;
    projectsRepository.findOne?.mockResolvedValue(project);
    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    tasksRepository.find?.mockResolvedValue([task]);
    await expect(service.getWorkspace(projectId, actor)).resolves.toEqual(
      expect.objectContaining({
        schedules: [expect.objectContaining({ taskId })],
      }),
    );
    expect(
      scheduleSnapshotsRepository.manager.transaction,
    ).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('updates a planning task schedule using the task id expected by the frontend', async () => {
    const schedule = {
      durationDays: 4,
      id: 'schedule-row-id',
      percentComplete: 25,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      snapshotId: 'snapshot-id',
      task: {
        id: taskId,
        assigneeId: userId,
        projectId,
        taskKind: TaskKind.Standard,
      } as Task,
      taskId,
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne
      ?.mockResolvedValueOnce(null)
      .mockResolvedValueOnce(schedule);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'snapshot-id',
      projectId,
      scheduleVersion: 1,
    });
    tasksRepository.find?.mockResolvedValue([schedule.task]);

    await expect(
      service.updatePlanningTaskSchedule(
        projectId,
        taskId,
        {
          plannedFinishDate: '2026-07-12',
          plannedStartDate: '2026-07-08',
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        plannedFinishDate: '2026-07-12',
        plannedStartDate: '2026-07-08',
      }),
    );

    expect(planningTaskSchedulesRepository.findOne).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
  });

  it('updates schedule fields and task owner when supplied', async () => {
    const schedule = {
      durationDays: 4,
      id: 'schedule-row-id',
      parentTaskId: null,
      percentComplete: 25,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      sequenceNumber: 1,
      task: {
        id: taskId,
        assigneeId: userId,
        projectId,
        taskKind: TaskKind.Standard,
      } as Task,
      taskId,
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne?.mockResolvedValue(schedule);
    tasksRepository.findOne?.mockResolvedValue({
      id: 'parent-task-id',
      projectId,
      taskKind: TaskKind.Summary,
    });
    usersRepository.findOne?.mockResolvedValue({ id: 'new-owner-id' });
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'snapshot-id',
      projectId,
      scheduleVersion: 1,
    });
    tasksRepository.find?.mockResolvedValue([
      {
        id: 'parent-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Summary,
        title: 'Parent',
      },
      schedule.task,
    ]);

    await service.updatePlanningTaskSchedule(
      projectId,
      'schedule-row-id',
      {
        durationDays: 7,
        ownerId: 'new-owner-id',
        parentTaskId: 'parent-task-id',
        percentComplete: 80,
        sequenceNumber: 3,
      },
      actor,
    );

    expect(tasksRepository.findOne).toHaveBeenCalledWith({
      select: { id: true, parentTaskId: true, projectId: true, taskKind: true },
      where: { id: 'parent-task-id', projectId },
    });
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: 'new-owner-id' },
    });
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: 'new-owner-id',
        parentTaskId: 'parent-task-id',
        sequenceNumber: 3,
        updatedById: actor.userId,
      }),
    );
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
  });

  it('updates inline-editable task fields through the planning schedule endpoint', async () => {
    const schedule = {
      durationDays: 4,
      id: 'schedule-row-id',
      parentTaskId: null,
      percentComplete: 25,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      sequenceNumber: 1,
      task: {
        id: taskId,
        assigneeId: userId,
        percentComplete: 25,
        plannedEndDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        projectId,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Design schedule',
      } as Task,
      taskId,
      taskKind: 'standard',
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne?.mockResolvedValue(schedule);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'snapshot-id',
      projectId,
      scheduleVersion: 1,
    });
    tasksRepository.find?.mockResolvedValue([schedule.task]);

    const result = await service.updatePlanningTaskSchedule(
      projectId,
      'schedule-row-id',
      {
        durationDays: 5,
        percentComplete: 80,
        status: TaskStatus.InProgress,
        taskTitle: 'Build delivery plan',
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedEndDate: '2026-07-06',
        plannedStartDate: '2026-07-01',
        status: TaskStatus.InProgress,
        title: 'Build delivery plan',
      }),
    );
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        durationDays: 5,
        percentComplete: 80,
        plannedFinishDate: '2026-07-06',
        status: TaskStatus.InProgress,
        taskTitle: 'Build delivery plan',
      }),
    );
  });

  it('applies completion defaults when a planning schedule update completes a standard task', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const schedule = {
      durationDays: 4,
      id: 'schedule-row-id',
      parentTaskId: null,
      percentComplete: 25,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      sequenceNumber: 1,
      task: {
        actualEndDate: null,
        id: taskId,
        percentComplete: 25,
        projectId,
        status: TaskStatus.InProgress,
        taskKind: TaskKind.Standard,
        title: 'Design schedule',
      } as Task,
      taskId,
      taskKind: TaskKind.Standard,
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne?.mockResolvedValue(schedule);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'snapshot-id',
      projectId,
      scheduleVersion: 1,
    });
    tasksRepository.find?.mockResolvedValue([schedule.task]);

    await service.updatePlanningTaskSchedule(
      projectId,
      'schedule-row-id',
      {
        status: TaskStatus.Done,
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actualEndDate: '2026-08-03',
        percentComplete: 100,
        status: TaskStatus.Done,
      }),
    );
  });

  it('normalizes milestone schedule edits before persistence', async () => {
    const schedule = {
      durationDays: 0,
      id: 'milestone-schedule-row-id',
      milestoneCategory: MilestoneCategory.Standard,
      percentComplete: 0,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-05',
      projectId,
      task: {
        id: taskId,
        milestoneCategory: MilestoneCategory.Standard,
        plannedEndDate: '2026-07-05',
        plannedStartDate: '2026-07-05',
        projectId,
        taskKind: TaskKind.Milestone,
      } as Task,
      taskId,
      taskKind: TaskKind.Milestone,
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne?.mockResolvedValue(schedule);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'snapshot-id',
      projectId,
      scheduleVersion: 1,
    });
    tasksRepository.find?.mockResolvedValue([schedule.task]);

    await service.updatePlanningTaskSchedule(
      projectId,
      'milestone-schedule-row-id',
      {
        milestoneCategory: MilestoneCategory.GoLive,
        plannedStartDate: '2026-07-12',
      },
      actor,
    );

    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        milestoneCategory: MilestoneCategory.GoLive,
        plannedEndDate: '2026-07-12',
        plannedStartDate: '2026-07-12',
      }),
    );
  });

  it('rejects reparenting a planning row under a milestone', async () => {
    const schedule = {
      durationDays: 4,
      id: 'schedule-row-id',
      parentTaskId: null,
      percentComplete: 25,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      task: { id: taskId, projectId, taskKind: TaskKind.Standard } as Task,
      taskId,
      taskKind: TaskKind.Standard,
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne?.mockResolvedValue(schedule);
    tasksRepository.findOne?.mockResolvedValue({
      id: 'milestone-parent-id',
      projectId,
      taskKind: TaskKind.Milestone,
    });

    await expect(
      service.updatePlanningTaskSchedule(
        projectId,
        'schedule-row-id',
        { parentTaskId: 'milestone-parent-id' },
        actor,
      ),
    ).rejects.toThrow('Milestones cannot contain child tasks');
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects moving a planning row beneath its own descendant', async () => {
    const schedule = {
      durationDays: 4,
      id: 'summary-schedule-row-id',
      parentTaskId: null,
      percentComplete: 25,
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      task: {
        id: 'summary-task-id',
        projectId,
        taskKind: TaskKind.Summary,
      } as Task,
      taskId: 'summary-task-id',
      taskKind: TaskKind.Summary,
    } as PlanningTaskSchedule;

    planningTaskSchedulesRepository.findOne?.mockResolvedValue(schedule);
    tasksRepository.findOne
      ?.mockResolvedValueOnce({
        id: 'child-summary-id',
        parentTaskId: 'summary-task-id',
        projectId,
        taskKind: TaskKind.Summary,
      })
      .mockResolvedValueOnce({
        id: 'child-summary-id',
        parentTaskId: 'summary-task-id',
        projectId,
        taskKind: TaskKind.Summary,
      })
      .mockResolvedValueOnce({
        id: 'summary-task-id',
        parentTaskId: null,
        projectId,
        taskKind: TaskKind.Summary,
      });

    await expect(
      service.updatePlanningTaskSchedule(
        projectId,
        'summary-schedule-row-id',
        { parentTaskId: 'child-summary-id' },
        actor,
      ),
    ).rejects.toThrow('Task hierarchy cannot contain cycles');
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects manual summary schedule edits', async () => {
    planningTaskSchedulesRepository.findOne?.mockResolvedValue({
      durationDays: 4,
      id: 'summary-schedule-row-id',
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      task: { id: taskId, projectId, taskKind: TaskKind.Summary } as Task,
      taskId,
      taskKind: TaskKind.Summary,
    });

    await expect(
      service.updatePlanningTaskSchedule(
        projectId,
        'summary-schedule-row-id',
        { durationDays: 7 },
        actor,
      ),
    ).rejects.toThrow('Summary task schedule is calculated from child work');
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects inline edits with a finish date before the start date', async () => {
    planningTaskSchedulesRepository.findOne?.mockResolvedValue({
      durationDays: 4,
      id: 'schedule-row-id',
      plannedEndDate: '2026-07-05',
      plannedStartDate: '2026-07-01',
      projectId,
      task: {
        id: taskId,
        plannedEndDate: '2026-07-05',
        plannedStartDate: '2026-07-01',
        projectId,
        taskKind: TaskKind.Standard,
      } as Task,
      taskId,
    });

    await expect(
      service.updatePlanningTaskSchedule(
        projectId,
        'schedule-row-id',
        { plannedFinishDate: '2026-06-30' },
        actor,
      ),
    ).rejects.toThrow(
      'Planned finish date cannot be before planned start date',
    );
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('creates a planning task and matching schedule row in one transaction', async () => {
    const snapshot = {
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectFinishDate: '2026-07-10',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleVersion: 1,
    } as PlanningScheduleSnapshot;

    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce(snapshot);
    tasksRepository.findOne?.mockResolvedValue({
      id: 'parent-task-id',
      projectId,
      taskKind: TaskKind.Summary,
    });
    tasksRepository.find
      ?.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sequenceNumber: 1 }, { sequenceNumber: 2 }])
      .mockResolvedValueOnce([
        {
          dueDate: '2026-07-10',
          id: 'parent-task-id',
          parentTaskId: null,
          percentComplete: 25,
          plannedEndDate: '2026-07-10',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          startDate: '2026-07-01',
          taskKind: TaskKind.Summary,
          title: 'Planning',
        },
        {
          dueDate: '2026-07-02',
          id: taskId,
          parentTaskId: 'parent-task-id',
          percentComplete: 0,
          plannedEndDate: '2026-07-02',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 3,
          startDate: '2026-07-01',
          status: TaskStatus.Todo,
          taskKind: TaskKind.Standard,
          title: 'New Task',
        },
      ]);

    const schedule = await service.createPlanningTask(
      projectId,
      { parentTaskId: 'parent-task-id' },
      actor,
    );

    expect(scheduleSnapshotsRepository.manager.transaction).toHaveBeenCalled();
    expect(tasksRepository.findOne).toHaveBeenCalledWith({
      select: { id: true, parentTaskId: true, projectId: true, taskKind: true },
      where: { id: 'parent-task-id', projectId },
    });
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: '2026-07-02',
        parentTaskId: 'parent-task-id',
        percentComplete: 0,
        plannedEndDate: '2026-07-02',
        plannedStartDate: '2026-07-01',
        projectId,
        sequenceNumber: 3,
        status: 'todo',
        taskKind: 'standard',
        title: 'New Task',
      }),
    );
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(scheduleSnapshotsRepository.save).not.toHaveBeenCalled();
    expect(schedule).toEqual(
      expect.objectContaining({
        durationDays: 1,
        parentTaskId: 'parent-task-id',
        plannedFinishDate: '2026-07-02',
        plannedStartDate: '2026-07-01',
        taskTitle: 'New Task',
      }),
    );
  });

  it('creates a planning task with an optional owner assignment', async () => {
    const snapshot = {
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectFinishDate: '2026-07-10',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleVersion: 1,
    } as PlanningScheduleSnapshot;

    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce(snapshot);
    usersRepository.findOne?.mockResolvedValue({ id: userId });
    tasksRepository.find
      ?.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          assigneeId: userId,
          dueDate: '2026-07-02',
          id: taskId,
          parentTaskId: null,
          percentComplete: 0,
          plannedEndDate: '2026-07-02',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          startDate: '2026-07-01',
          status: TaskStatus.Todo,
          taskKind: TaskKind.Standard,
          title: 'Owner assigned task',
        },
      ]);

    const schedule = await service.createPlanningTask(
      projectId,
      { ownerId: userId, title: 'Owner assigned task' },
      actor,
    );

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: userId },
    });
    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: userId,
        parentTaskId: null,
        taskKind: TaskKind.Standard,
        title: 'Owner assigned task',
      }),
    );
    expect(schedule).toEqual(
      expect.objectContaining({
        ownerId: userId,
        taskTitle: 'Owner assigned task',
      }),
    );
  });

  it('creates a planning subtask under a standard task parent', async () => {
    const snapshot = {
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectFinishDate: '2026-07-10',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleVersion: 1,
    } as PlanningScheduleSnapshot;

    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce(snapshot);
    tasksRepository.findOne?.mockResolvedValue({
      id: 'parent-task-id',
      parentTaskId: null,
      projectId,
      taskKind: TaskKind.Standard,
    });
    tasksRepository.find
      ?.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sequenceNumber: 1 }])
      .mockResolvedValueOnce([
        {
          dueDate: '2026-07-10',
          id: 'parent-task-id',
          parentTaskId: null,
          percentComplete: 25,
          plannedEndDate: '2026-07-10',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          startDate: '2026-07-01',
          taskKind: TaskKind.Standard,
          title: 'Parent task',
        },
        {
          dueDate: '2026-07-02',
          id: taskId,
          parentTaskId: 'parent-task-id',
          percentComplete: 0,
          plannedEndDate: '2026-07-02',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 2,
          startDate: '2026-07-01',
          status: TaskStatus.Todo,
          taskKind: TaskKind.Standard,
          title: 'New Task',
        },
      ]);

    await service.createPlanningTask(
      projectId,
      { parentTaskId: 'parent-task-id' },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        parentTaskId: 'parent-task-id',
        sequenceNumber: 2,
        taskKind: TaskKind.Standard,
      }),
    );
  });

  it('creates a planning milestone through taskType while preserving taskKind compatibility', async () => {
    const snapshot = {
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectFinishDate: '2026-07-10',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleVersion: 1,
    } as PlanningScheduleSnapshot;

    scheduleSnapshotsRepository.findOne
      ?.mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce(snapshot);
    tasksRepository.find
      ?.mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          dueDate: '2026-07-01',
          id: taskId,
          milestoneCategory: MilestoneCategory.Release,
          parentTaskId: null,
          percentComplete: 0,
          plannedEndDate: '2026-07-01',
          plannedStartDate: '2026-07-01',
          projectId,
          sequenceNumber: 1,
          startDate: '2026-07-01',
          status: TaskStatus.Todo,
          taskKind: TaskKind.Milestone,
          title: 'Release drop',
        },
      ]);

    const schedule = await service.createPlanningTask(
      projectId,
      {
        milestoneCategory: MilestoneCategory.Release,
        taskType: TaskType.Milestone,
        title: 'Release drop',
      },
      actor,
    );

    expect(tasksRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedEndDate: '2026-07-01',
        plannedStartDate: '2026-07-01',
        milestoneCategory: MilestoneCategory.Release,
        taskKind: TaskKind.Milestone,
      }),
    );
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
    expect(schedule).toEqual(
      expect.objectContaining({
        durationDays: 0,
        milestoneCategory: MilestoneCategory.Release,
        taskKind: TaskKind.Milestone,
        taskType: TaskType.Milestone,
      }),
    );
  });

  it('rejects creating a planning task under a milestone', async () => {
    const snapshot = {
      id: 'snapshot-id',
      projectCompletionPercent: 25,
      projectFinishDate: '2026-07-10',
      projectId,
      projectStartDate: '2026-07-01',
      scheduleVersion: 1,
    } as PlanningScheduleSnapshot;

    scheduleSnapshotsRepository.findOne?.mockResolvedValue(snapshot);
    tasksRepository.findOne?.mockResolvedValue({
      id: 'milestone-parent-id',
      projectId,
      taskKind: TaskKind.Milestone,
    });

    await expect(
      service.createPlanningTask(
        projectId,
        { parentTaskId: 'milestone-parent-id' },
        actor,
      ),
    ).rejects.toThrow('Milestones cannot contain child tasks');
    expect(tasksRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects planning task creation without project manager access', async () => {
    authorizationPolicyService.canManageProject.mockResolvedValue(false);

    await expect(
      service.createPlanningTask(projectId, {}, actor),
    ).rejects.toThrow(ForbiddenException);
    expect(tasksRepository.save).not.toHaveBeenCalled();
    expect(planningTaskSchedulesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects planning task schedule updates when the schedule is missing', async () => {
    planningTaskSchedulesRepository.findOne?.mockResolvedValue(null);
    scheduleSnapshotsRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updatePlanningTaskSchedule(
        projectId,
        'missing-schedule-id',
        { plannedFinishDate: '2026-07-12' },
        actor,
      ),
    ).rejects.toThrow('Planning schedule missing-schedule-id not found');
  });

  it('creates an authoritative calculated snapshot with the next version', async () => {
    scheduleSnapshotsRepository.findOne?.mockResolvedValue({
      id: 'previous-snapshot-id',
      scheduleVersion: 4,
    });

    await expect(
      service.requestScheduleRecalculation(projectId, actor),
    ).resolves.toEqual(
      expect.objectContaining({
        calculationStatus: PlanningCalculationStatus.Calculated,
        criticalPathTaskIds: [],
        projectId,
        scheduleVersion: 5,
      }),
    );

    expect(scheduleSnapshotsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: actor.userId,
        projectId,
        scheduleVersion: 5,
        updatedById: actor.userId,
      }),
    );
  });

  it('rejects schedule recalculation without project manager access', async () => {
    authorizationPolicyService.canManageProject.mockResolvedValue(false);

    await expect(
      service.requestScheduleRecalculation(projectId, actor),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates user resource capacity records', async () => {
    usersRepository.findOne?.mockResolvedValue({ id: userId });

    await service.createResourceCapacity(
      projectId,
      {
        capacityDate: '2026-07-01',
        capacityMinutes: 420,
        resourceUnit: ResourceAllocationUnit.User,
        userId,
      },
      actor,
    );

    expect(resourceCapacitiesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        capacityDate: '2026-07-01',
        capacityMinutes: 420,
        projectId,
        resourceUnit: ResourceAllocationUnit.User,
        timezone: 'UTC',
        userId,
      }),
    );
  });

  it('rejects ambiguous resource targets', async () => {
    await expect(
      service.createResourceCapacity(
        projectId,
        {
          capacityDate: '2026-07-01',
          capacityMinutes: 420,
          resourceUnit: ResourceAllocationUnit.User,
          teamName: 'Architecture',
          userId,
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects resource allocations with inverted dates', async () => {
    usersRepository.findOne?.mockResolvedValue({ id: userId });

    await expect(
      service.createResourceAllocation(
        projectId,
        {
          allocationPercent: 50,
          endDate: '2026-07-01',
          resourceUnit: ResourceAllocationUnit.User,
          startDate: '2026-07-05',
          userId,
        },
        actor,
      ),
    ).rejects.toThrow('Allocation end date cannot be before start date');
  });
});
