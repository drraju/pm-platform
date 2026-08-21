/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException } from '@nestjs/common';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import {
  collectWorkPackageTasks,
  PlanningWorkPackageDuplicationService,
} from '../planning-work-package-duplication.service';

describe('PlanningWorkPackageDuplicationService', () => {
  const sourceSummary = task({
    durationDays: 8,
    id: 'summary-1',
    sequenceNumber: 2,
    taskKind: TaskKind.Summary,
    title: 'Dynatrace Integration',
  });
  const connectivity = task({
    assigneeId: 'user-1',
    durationDays: 2,
    estimatedHours: 16,
    id: 'task-1',
    parentTaskId: sourceSummary.id,
    plannedEndDate: '2026-08-04',
    plannedStartDate: '2026-08-03',
    sequenceNumber: 1,
    title: 'Connectivity',
  });
  const uat = task({
    durationDays: 0,
    id: 'task-2',
    milestoneCategory: 'standard',
    parentTaskId: sourceSummary.id,
    sequenceNumber: 2,
    taskKind: TaskKind.Milestone,
    title: 'UAT',
  });
  const followingSummary = task({
    id: 'summary-2',
    sequenceNumber: 3,
    taskKind: TaskKind.Summary,
    title: 'Following package',
  });

  it('duplicates the hierarchy with fresh IDs and only remaps internal dependencies', async () => {
    const savedCopies: Task[] = [];
    const savedDependencies: TaskDependency[] = [];
    const taskRepository = {
      create: jest.fn((value) => value),
      find: jest
        .fn()
        .mockResolvedValue([
          sourceSummary,
          connectivity,
          uat,
          followingSummary,
        ]),
      save: jest.fn(async (value: Task | Task[]) => {
        if (Array.isArray(value)) {
          return value;
        }
        const saved: Task = {
          ...value,
          id: `copy-${savedCopies.length + 1}`,
        };
        savedCopies.push(saved);
        return saved;
      }),
    };
    const dependencyRepository = {
      create: jest.fn((value) => value),
      find: jest
        .fn()
        .mockResolvedValue([
          dependency('dependency-1', connectivity.id, uat.id),
          dependency('dependency-2', 'outside-task', connectivity.id),
        ]),
      save: jest.fn(async (values: TaskDependency[]) => {
        savedDependencies.push(...values);
        return values;
      }),
    };
    const allocationRepository = {
      create: jest.fn((value) => value),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Task) return taskRepository;
        if (entity === TaskDependency) return dependencyRepository;
        if (entity === ResourceAllocation) return allocationRepository;
        throw new Error('Unexpected repository');
      }),
    };
    const tasksRepository = {
      manager: {
        transaction: jest.fn(async (operation) => operation(manager)),
      },
    };
    const service = new PlanningWorkPackageDuplicationService(
      tasksRepository as never,
      {
        calculateDurationDays: jest.fn().mockReturnValue(null),
      } as never,
    );

    const result = await service.duplicate(
      'project-1',
      sourceSummary.id,
      {
        newSummaryName: 'Dynatrace Integration - Wave 2',
      },
      { userId: 'manager-1' },
    );

    expect(result).toEqual({
      copiedTaskIds: ['copy-1', 'copy-2', 'copy-3'],
      newSummaryTaskId: 'copy-1',
    });
    expect(savedCopies[0]).toMatchObject({
      createdById: 'manager-1',
      parentTaskId: null,
      sequenceNumber: 3,
      title: 'Dynatrace Integration - Wave 2',
    });
    expect(savedCopies[1]).toMatchObject({
      assigneeId: null,
      durationDays: 2,
      estimatedHours: 16,
      parentTaskId: 'copy-1',
      plannedEndDate: null,
      plannedStartDate: null,
      status: TaskStatus.Todo,
    });
    expect(savedCopies[2]).toMatchObject({
      parentTaskId: 'copy-1',
      taskKind: TaskKind.Milestone,
    });
    expect(followingSummary.sequenceNumber).toBe(4);
    expect(savedDependencies).toEqual([
      expect.objectContaining({
        predecessorTaskId: 'copy-2',
        successorTaskId: 'copy-3',
      }),
    ]);
  });

  it('rejects a standard task as a work package source', async () => {
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([connectivity]),
      }),
    };
    const service = new PlanningWorkPackageDuplicationService(
      {
        manager: {
          transaction: jest.fn(async (operation) => operation(manager)),
        },
      } as never,
      {} as never,
    );

    await expect(
      service.duplicate('project-1', connectivity.id, {
        newSummaryName: 'Invalid copy',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('collects descendants in stable depth-first WBS order', () => {
    const nested = task({
      id: 'nested',
      parentTaskId: connectivity.id,
      sequenceNumber: 1,
    });

    expect(
      collectWorkPackageTasks(
        [uat, nested, sourceSummary, connectivity],
        sourceSummary.id,
      ).map((item) => item.id),
    ).toEqual([sourceSummary.id, connectivity.id, nested.id, uat.id]);
  });

  it('resets copied task lifecycle state even when actual dates are requested', async () => {
    const completedTask = task({
      actualEndDate: '2026-08-05',
      actualStartDate: '2026-08-03',
      id: 'completed-task',
      parentTaskId: sourceSummary.id,
      percentComplete: 100,
      status: TaskStatus.Done,
    });
    const savedCopies: Task[] = [];
    const taskRepository = {
      create: jest.fn((value) => value),
      find: jest.fn().mockResolvedValue([sourceSummary, completedTask]),
      save: jest.fn(async (value: Task | Task[]) => {
        if (Array.isArray(value)) {
          return value;
        }
        const saved = {
          ...value,
          id: `copy-${savedCopies.length + 1}`,
        } as Task;
        savedCopies.push(saved);
        return saved;
      }),
    };
    const dependencyRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    const allocationRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Task) return taskRepository;
        if (entity === TaskDependency) return dependencyRepository;
        if (entity === ResourceAllocation) return allocationRepository;
        throw new Error('Unexpected repository');
      }),
    };
    const service = new PlanningWorkPackageDuplicationService(
      {
        manager: {
          transaction: jest.fn(async (operation) => operation(manager)),
        },
      } as never,
      {
        calculateDurationDays: jest.fn().mockReturnValue(null),
      } as never,
    );

    await service.duplicate(
      'project-1',
      sourceSummary.id,
      {
        copyActualDates: true,
        newSummaryName: 'Fresh package',
      },
      { userId: 'manager-1' },
    );

    expect(savedCopies[1]).toMatchObject({
      actualEndDate: null,
      actualStartDate: null,
      percentComplete: 0,
      status: TaskStatus.Todo,
    });
  });
});

function task(input: Partial<Task>): Task {
  return {
    description: 'Reusable instructions',
    durationDays: null,
    estimatedHours: null,
    id: 'task',
    parentTaskId: null,
    percentComplete: 50,
    priority: 'medium',
    projectId: 'project-1',
    remarks: 'Implementation note',
    sequenceNumber: 1,
    status: TaskStatus.InProgress,
    taskKind: TaskKind.Standard,
    title: 'Task',
    ...input,
  } as Task;
}

function dependency(
  id: string,
  predecessorTaskId: string,
  successorTaskId: string,
): TaskDependency {
  return {
    dependencyType: TaskDependencyType.FinishToStart,
    id,
    lagDays: 0,
    predecessorTaskId,
    successorTaskId,
  } as TaskDependency;
}
