import { SchedulingContextFactory } from '../../../common/scheduling/scheduling-context.factory';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { Project } from '../../projects/entities/project.entity';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from '../entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from '../entities/planning-task-schedule.entity';
import { PlanningBackwardPassService } from '../planning-backward-pass.service';
import { PlanningCriticalPathService } from '../planning-critical-path.service';
import { PlanningFloatService } from '../planning-float.service';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../planning-graph-builder.service';
import { PlanningScheduleEngineService } from '../planning-schedule-engine.service';
import { PlanningSnapshotService } from '../planning-snapshot.service';

describe('PlanningSnapshotService authoritative persistence', () => {
  const projectId = '00000000-0000-4000-8000-000000000001';
  const actor = { userId: '00000000-0000-4000-8000-000000000002' };
  let liveTasks: Task[];
  let liveDependencies: TaskDependency[];
  let snapshots: PlanningScheduleSnapshot[];
  let schedules: PlanningTaskSchedule[];
  let service: PlanningSnapshotService;
  let projectsRepository: { findOne: jest.Mock };
  let tasksRepository: { find: jest.Mock; save: jest.Mock };
  let snapshotsRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    manager: { getRepository: jest.Mock; transaction: jest.Mock };
    save: jest.Mock;
  };

  beforeEach(() => {
    liveTasks = [
      {
        id: '00000000-0000-4000-8000-000000000010',
        parentTaskId: null,
        percentComplete: 20,
        plannedEndDate: null,
        plannedStartDate: null,
        projectId,
        sequenceNumber: 1,
        taskKind: TaskKind.Summary,
        title: 'Delivery',
      } as Task,
      {
        durationDays: 2,
        id: '00000000-0000-4000-8000-000000000011',
        parentTaskId: '00000000-0000-4000-8000-000000000010',
        percentComplete: 10,
        plannedEndDate: '2026-07-03',
        plannedStartDate: '2026-07-01',
        projectId,
        sequenceNumber: 2,
        taskKind: TaskKind.Standard,
        title: 'Build',
      } as Task,
      {
        durationDays: 1,
        id: '00000000-0000-4000-8000-000000000012',
        parentTaskId: '00000000-0000-4000-8000-000000000010',
        percentComplete: 0,
        plannedEndDate: '2026-07-02',
        plannedStartDate: '2026-07-01',
        projectId,
        sequenceNumber: 3,
        taskKind: TaskKind.Standard,
        title: 'Release',
      } as Task,
    ];
    liveDependencies = [
      {
        dependencyType: TaskDependencyType.FinishToStart,
        id: '00000000-0000-4000-8000-000000000020',
        lagDays: 1,
        predecessorTaskId: liveTasks[1].id,
        successorTaskId: liveTasks[2].id,
      } as TaskDependency,
    ];
    snapshots = [];
    schedules = [];
    projectsRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: projectId,
        startDate: '2026-07-01',
      }),
    };
    tasksRepository = {
      find: jest.fn(() => Promise.resolve(liveTasks)),
      save: jest.fn(),
    };
    const taskSchedulesRepository = {
      create: jest.fn((input) => input),
      save: jest.fn((input: PlanningTaskSchedule[]) => {
        const saved = input.map((row, index) => ({
          ...row,
          id: `schedule-${row.snapshotId}-${index + 1}`,
        }));
        schedules.push(...saved);
        return Promise.resolve(saved);
      }),
    };
    const dependenciesRepository = {
      find: jest.fn(() => Promise.resolve(liveDependencies)),
    };
    snapshotsRepository = {
      create: jest.fn((input) => input),
      findOne: jest.fn(() =>
        Promise.resolve(
          [...snapshots].sort(
            (left, right) => right.scheduleVersion - left.scheduleVersion,
          )[0] ?? null,
        ),
      ),
      manager: { getRepository: jest.fn(), transaction: jest.fn() },
      save: jest.fn((input: PlanningScheduleSnapshot) => {
        const saved = {
          ...input,
          id: `snapshot-${input.scheduleVersion}`,
        } as PlanningScheduleSnapshot;
        snapshots.push(saved);
        return Promise.resolve(saved);
      }),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === PlanningScheduleSnapshot) return snapshotsRepository;
        if (entity === PlanningTaskSchedule) return taskSchedulesRepository;
        if (entity === Project) return projectsRepository;
        if (entity === Task) return tasksRepository;
        if (entity === TaskDependency) return dependenciesRepository;
        throw new Error(`Unexpected repository ${String(entity)}`);
      }),
    };
    snapshotsRepository.manager.getRepository = manager.getRepository;
    snapshotsRepository.manager.transaction.mockImplementation((callback) =>
      callback(manager),
    );
    const engine = new PlanningScheduleEngineService(
      new PlanningGraphBuilderService(),
      new PlanningForwardPassService(),
      new PlanningBackwardPassService(),
      new PlanningFloatService(),
      new PlanningCriticalPathService(),
    );
    service = new PlanningSnapshotService(
      snapshotsRepository as never,
      new SchedulingContextFactory(),
      engine,
    );
  });

  it('appends versions with independent authoritative schedules without mutating Tasks', async () => {
    const originalTasks = structuredClone(liveTasks);
    const first = await service.regenerateOfficialSnapshot(projectId, actor);
    const firstRows = structuredClone(first.taskSchedules);
    expect(liveTasks).toEqual(originalTasks);

    liveTasks[1] = { ...liveTasks[1], durationDays: 4 } as Task;
    const tasksBeforeSecondForecast = structuredClone(liveTasks);
    const second = await service.regenerateOfficialSnapshot(projectId, actor);

    expect(first.scheduleVersion).toBe(1);
    expect(second.scheduleVersion).toBe(2);
    expect(snapshots).toHaveLength(2);
    expect(schedules.filter((row) => row.snapshotId === first.id)).toEqual(
      firstRows,
    );
    expect(first.taskSchedules).toEqual(firstRows);
    expect(first.projectFinishDate).toBe('2026-07-05');
    expect(second.projectFinishDate).toBe('2026-07-07');
    expect(second.scheduleAnchorDate).toBe('2026-07-01');
    expect(second.criticalPathTaskIds).toEqual([
      liveTasks[1].id,
      liveTasks[2].id,
    ]);
    expect(second.taskSchedules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          freeFloatDays: 0,
          isCritical: true,
          scheduledStartDate: '2026-07-06',
          taskId: liveTasks[2].id,
          totalFloatDays: 0,
        }),
      ]),
    );
    expect(originalTasks[0]).toEqual(liveTasks[0]);
    expect(liveTasks).toEqual(tasksBeforeSecondForecast);
    expect(tasksRepository.save).not.toHaveBeenCalled();
  });

  it('rolls back a failed calculation before any new persistence', async () => {
    await service.regenerateOfficialSnapshot(projectId, actor);
    liveDependencies = [
      ...liveDependencies,
      {
        dependencyType: TaskDependencyType.FinishToStart,
        id: '00000000-0000-4000-8000-000000000021',
        lagDays: 0,
        predecessorTaskId: liveTasks[2].id,
        successorTaskId: liveTasks[1].id,
      } as TaskDependency,
    ];

    await expect(
      service.regenerateOfficialSnapshot(projectId, actor),
    ).rejects.toThrow('Planning schedule graph validation failed');
    expect(snapshots).toHaveLength(1);
    expect(schedules.every((row) => row.snapshotId === snapshots[0].id)).toBe(
      true,
    );
  });

  it('acquires the Project lock before allocating the maximum version plus one', async () => {
    snapshots.push({
      id: 'snapshot-7',
      projectId,
      scheduleVersion: 7,
    } as PlanningScheduleSnapshot);

    const result = await service.regenerateOfficialSnapshot(projectId, actor);

    expect(projectsRepository.findOne).toHaveBeenCalledWith({
      lock: { mode: 'pessimistic_write' },
      select: { id: true, startDate: true },
      where: { id: projectId },
    });
    expect(projectsRepository.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      snapshotsRepository.findOne.mock.invocationCallOrder[0],
    );
    expect(result.scheduleVersion).toBe(8);
  });

  it('recalculates dependency changes operationally without writing official history', async () => {
    const official = await service.regenerateOfficialSnapshot(projectId, actor);
    const persistedRows = structuredClone(schedules);

    const withDependency =
      await service.calculateOperationalForecast(projectId);
    liveDependencies = [];
    const afterDeletion = await service.calculateOperationalForecast(projectId);
    liveDependencies = [
      {
        dependencyType: TaskDependencyType.FinishToStart,
        id: '00000000-0000-4000-8000-000000000022',
        lagDays: 2,
        predecessorTaskId: liveTasks[1].id,
        successorTaskId: liveTasks[2].id,
      } as TaskDependency,
    ];
    const afterCreation = await service.calculateOperationalForecast(projectId);

    const releaseDate = (snapshot: PlanningScheduleSnapshot) =>
      snapshot.taskSchedules?.find((row) => row.taskId === liveTasks[2].id)
        ?.scheduledStartDate;
    expect(releaseDate(afterDeletion)).not.toBe(releaseDate(withDependency));
    expect(releaseDate(afterCreation)).not.toBe(releaseDate(afterDeletion));
    expect(withDependency.scheduleVersion).toBe(0);
    expect(afterDeletion.metadata).toEqual(
      expect.objectContaining({ lifecycle: 'operational' }),
    );
    expect(snapshots).toEqual([expect.objectContaining({ id: official.id })]);
    expect(schedules).toEqual(persistedRows);
    expect(snapshotsRepository.save).toHaveBeenCalledTimes(1);
  });
});
