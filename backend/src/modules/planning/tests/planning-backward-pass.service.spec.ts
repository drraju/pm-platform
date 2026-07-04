import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { PlanningBackwardPassService } from '../planning-backward-pass.service';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../planning-graph-builder.service';

describe('PlanningBackwardPassService', () => {
  let backwardPass: PlanningBackwardPassService;
  let forwardPass: PlanningForwardPassService;
  let graphBuilder: PlanningGraphBuilderService;

  beforeEach(() => {
    backwardPass = new PlanningBackwardPassService();
    forwardPass = new PlanningForwardPassService();
    graphBuilder = new PlanningGraphBuilderService();
  });

  it('calculates late dates for a linear finish-to-start schedule', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 3), task('task-3', 4)],
    });

    expect(result.projectFinish).toBe(9);
    expectWindow(result, 'task-1', 0, 2);
    expectWindow(result, 'task-2', 2, 5);
    expectWindow(result, 'task-3', 5, 9);
  });

  it('calculates late dates for a fork using the earliest successor constraint', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-1', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 4), task('task-3', 1)],
    });

    expect(result.projectFinish).toBe(6);
    expectWindow(result, 'task-1', 0, 2);
    expectWindow(result, 'task-2', 2, 6);
    expectWindow(result, 'task-3', 5, 6);
  });

  it('calculates late dates for a merge', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 5), task('task-3', 3)],
    });

    expect(result.projectFinish).toBe(8);
    expectWindow(result, 'task-1', 3, 5);
    expectWindow(result, 'task-2', 0, 5);
    expectWindow(result, 'task-3', 5, 8);
  });

  it('keeps milestone late start equal to late finish', () => {
    const result = calculate({
      dependencies: [dependency('dep-1', 'task-1', 'milestone-1')],
      tasks: [
        task('task-1', 3),
        task('milestone-1', 10, TaskKind.Milestone),
      ],
    });

    expect(result.projectFinish).toBe(3);
    expect(result.tasks.get('milestone-1')).toEqual({
      durationDays: 0,
      lateFinish: 3,
      lateStart: 3,
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

    expect(result.projectFinish).toBe(5);
    expectWindow(result, 'task-1', 3, 8);
    expectWindow(result, 'task-2', 3, 5);
  });

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

    expect(result.projectFinish).toBe(5);
    expectWindow(result, 'task-1', 0, 5);
    expectWindow(result, 'task-2', 3, 5);
  });

  it('calculates a mixed dependency graph with disconnected chains', () => {
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

    expect(result.projectFinish).toBe(7);
    expectWindow(result, 'task-1', 1, 5);
    expectWindow(result, 'task-2', 5, 12);
    expectWindow(result, 'task-3', 5, 7);
    expectWindow(result, 'task-4', 4, 7);
    expectWindow(result, 'task-5', 4, 5);
    expectWindow(result, 'task-6', 5, 7);
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
    const graph = graphBuilder.buildGraph(input);
    return backwardPass.calculate(graph, forwardPass.calculate(graph));
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
  result: ReturnType<PlanningBackwardPassService['calculate']>,
  taskId: string,
  lateStart: number,
  lateFinish: number,
) {
  expect(result.tasks.get(taskId)).toEqual(
    expect.objectContaining({
      lateFinish,
      lateStart,
      taskId,
    }),
  );
}
