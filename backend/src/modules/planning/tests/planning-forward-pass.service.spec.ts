import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../planning-graph-builder.service';

describe('PlanningForwardPassService', () => {
  let graphBuilder: PlanningGraphBuilderService;
  let service: PlanningForwardPassService;

  beforeEach(() => {
    graphBuilder = new PlanningGraphBuilderService();
    service = new PlanningForwardPassService();
  });

  it('calculates early dates for a linear finish-to-start chain', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 3), task('task-3', 4)],
    });

    expectWindow(result, 'task-1', 0, 2);
    expectWindow(result, 'task-2', 2, 5);
    expectWindow(result, 'task-3', 5, 9);
  });

  it('respects a task minimum-start constraint', () => {
    const result = calculate({
      tasks: [
        {
          ...task('task-1', 2),
          minimumStartOffset: 4,
        },
      ],
    });

    expectWindow(result, 'task-1', 4, 6);
  });

  it.each([
    { expectedFinish: 7, expectedStart: 5, lagDays: 2 },
    { expectedFinish: 4, expectedStart: 2, lagDays: -1 },
  ])(
    'applies signed finish-to-start lag $lagDays',
    ({ expectedFinish, expectedStart, lagDays }) => {
      const result = calculate({
        dependencies: [{ ...dependency('dep-1', 'task-1', 'task-2'), lagDays }],
        tasks: [task('task-1', 3), task('task-2', 2)],
      });

      expectWindow(result, 'task-2', expectedStart, expectedFinish);
    },
  );

  it('calculates early dates for a fork', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-1', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 4), task('task-3', 1)],
    });

    expectWindow(result, 'task-1', 0, 2);
    expectWindow(result, 'task-2', 2, 6);
    expectWindow(result, 'task-3', 2, 3);
  });

  it('calculates early dates for a merge using the maximum predecessor constraint', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 5), task('task-3', 3)],
    });

    expectWindow(result, 'task-1', 0, 2);
    expectWindow(result, 'task-2', 0, 5);
    expectWindow(result, 'task-3', 5, 8);
  });

  it('sets milestone duration to zero and finish equal to start', () => {
    const result = calculate({
      dependencies: [dependency('dep-1', 'task-1', 'milestone-1')],
      tasks: [task('task-1', 3), task('milestone-1', 10, TaskKind.Milestone)],
    });

    expect(result.tasks.get('milestone-1')).toEqual({
      durationDays: 0,
      earlyFinish: 3,
      earlyStart: 3,
      taskId: 'milestone-1',
      taskType: TaskKind.Milestone,
    });
  });

  it('supports start-to-start dependencies', () => {
    const result = calculate({
      dependencies: [
        dependency(
          'dep-1',
          'task-1',
          'task-2',
          TaskDependencyType.StartToStart,
        ),
      ],
      tasks: [task('task-1', 5), task('task-2', 2)],
    });

    expectWindow(result, 'task-1', 0, 5);
    expectWindow(result, 'task-2', 0, 2);
  });

  it.each([
    { expectedStart: 2, lagDays: 2 },
    { expectedStart: 0, lagDays: -1 },
  ])(
    'applies signed start-to-start lag $lagDays',
    ({ expectedStart, lagDays }) => {
      const result = calculate({
        dependencies: [
          {
            ...dependency(
              'dep-1',
              'task-1',
              'task-2',
              TaskDependencyType.StartToStart,
            ),
            lagDays,
          },
        ],
        tasks: [task('task-1', 5), task('task-2', 2)],
      });

      expectWindow(result, 'task-2', expectedStart, expectedStart + 2);
    },
  );

  it('supports finish-to-finish dependencies', () => {
    const result = calculate({
      dependencies: [
        dependency(
          'dep-1',
          'task-1',
          'task-2',
          TaskDependencyType.FinishToFinish,
        ),
      ],
      tasks: [task('task-1', 5), task('task-2', 2)],
    });

    expectWindow(result, 'task-1', 0, 5);
    expectWindow(result, 'task-2', 3, 5);
  });

  it.each([
    { expectedStart: 5, lagDays: 2 },
    { expectedStart: 2, lagDays: -1 },
  ])(
    'applies signed finish-to-finish lag $lagDays',
    ({ expectedStart, lagDays }) => {
      const result = calculate({
        dependencies: [
          {
            ...dependency(
              'dep-1',
              'task-1',
              'task-2',
              TaskDependencyType.FinishToFinish,
            ),
            lagDays,
          },
        ],
        tasks: [task('task-1', 5), task('task-2', 2)],
      });

      expectWindow(result, 'task-2', expectedStart, expectedStart + 2);
    },
  );

  it('uses the maximum of planned-start and multiple dependency constraints', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [
        task('task-1', 2),
        task('task-2', 5),
        { ...task('task-3', 2), minimumStartOffset: 4 },
      ],
    });

    expectWindow(result, 'task-3', 5, 7);
  });

  it('calculates a mixed dependency graph with disconnected task chains', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency(
          'dep-2',
          'task-2',
          'task-3',
          TaskDependencyType.StartToStart,
        ),
        dependency(
          'dep-3',
          'task-3',
          'task-4',
          TaskDependencyType.FinishToFinish,
        ),
        dependency('dep-4', 'task-5', 'task-6'),
      ],
      tasks: [
        task('task-1', 4),
        task('task-2', 7),
        task('task-3', 2),
        task('task-4', 3),
        task('task-5', 1),
        task('task-6', 2),
      ],
    });

    expectWindow(result, 'task-1', 0, 4);
    expectWindow(result, 'task-2', 0, 7);
    expectWindow(result, 'task-3', 4, 6);
    expectWindow(result, 'task-4', 3, 6);
    expectWindow(result, 'task-5', 0, 1);
    expectWindow(result, 'task-6', 1, 3);
  });

  it('skips nested summaries and schedules only executable descendants', () => {
    const result = calculate({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [
        task('summary-1', 0, TaskKind.Summary),
        task('summary-2', 0, TaskKind.Summary, 'summary-1'),
        task('task-1', 2, TaskKind.Standard, 'summary-2'),
        task('task-2', 3, TaskKind.Standard, 'summary-1'),
      ],
    });

    expect(result.tasks.has('summary-1')).toBe(false);
    expect(result.tasks.has('summary-2')).toBe(false);
    expectWindow(result, 'task-1', 0, 2);
    expectWindow(result, 'task-2', 2, 5);
  });

  function calculate(input: {
    dependencies?: ReturnType<typeof dependency>[];
    tasks: ReturnType<typeof task>[];
  }) {
    return service.calculate(graphBuilder.buildGraph(input));
  }
});

function task(
  taskId: string,
  durationDays: number,
  taskKind: TaskKind = TaskKind.Standard,
  parentTaskId: string | null = null,
) {
  return { durationDays, parentTaskId, taskId, taskKind };
}

function dependency(
  id: string,
  predecessorTaskId: string,
  successorTaskId: string,
  dependencyType: TaskDependencyType = TaskDependencyType.FinishToStart,
) {
  return { dependencyType, id, predecessorTaskId, successorTaskId };
}

function expectWindow(
  result: ReturnType<PlanningForwardPassService['calculate']>,
  taskId: string,
  earlyStart: number,
  earlyFinish: number,
) {
  expect(result.tasks.get(taskId)).toEqual(
    expect.objectContaining({
      earlyFinish,
      earlyStart,
      taskId,
    }),
  );
}
