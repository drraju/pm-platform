import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { PlanningBackwardPassService } from '../planning-backward-pass.service';
import { PlanningFloatService } from '../planning-float.service';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../planning-graph-builder.service';

describe('PlanningFloatService', () => {
  let backwardPass: PlanningBackwardPassService;
  let floatService: PlanningFloatService;
  let forwardPass: PlanningForwardPassService;
  let graphBuilder: PlanningGraphBuilderService;

  beforeEach(() => {
    backwardPass = new PlanningBackwardPassService();
    floatService = new PlanningFloatService();
    forwardPass = new PlanningForwardPassService();
    graphBuilder = new PlanningGraphBuilderService();
  });

  it('calculates positive float on the shorter branch of a merge', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 5), task('task-3', 3)],
    });

    expectFloat(result, 'task-1', 3, 3);
    expectFloat(result, 'task-2', 0, 0);
    expectFloat(result, 'task-3', 0, 0);
  });

  it('calculates zero float for a linear schedule', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 3), task('task-3', 4)],
    });

    expectFloat(result, 'task-1', 0, 0);
    expectFloat(result, 'task-2', 0, 0);
    expectFloat(result, 'task-3', 0, 0);
  });

  it('uses the earliest successor start for free float with multiple successors', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-1', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 4), task('task-3', 1)],
    });

    expectFloat(result, 'task-1', 0, 0);
    expectFloat(result, 'task-2', 0, 0);
    expectFloat(result, 'task-3', 3, 3);
  });

  it('supports milestones with zero duration', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'task-1', 'milestone-1'),
        dependency('dep-2', 'milestone-1', 'task-2'),
      ],
      tasks: [
        task('task-1', 3),
        task('milestone-1', 10, TaskKind.Milestone),
        task('task-2', 2),
      ],
    });

    expectFloat(result, 'task-1', 0, 0);
    expectFloat(result, 'milestone-1', 0, 0);
    expectFloat(result, 'task-2', 0, 0);
  });

  it('calculates float across parallel paths', () => {
    const result = calculate({
      dependencies: [
        dependency('dep-1', 'start', 'path-a'),
        dependency('dep-2', 'start', 'path-b'),
        dependency('dep-3', 'path-a', 'finish'),
        dependency('dep-4', 'path-b', 'finish'),
      ],
      tasks: [
        task('start', 1),
        task('path-a', 5),
        task('path-b', 2),
        task('finish', 1),
      ],
    });

    expectFloat(result, 'start', 0, 0);
    expectFloat(result, 'path-a', 0, 0);
    expectFloat(result, 'path-b', 3, 3);
    expectFloat(result, 'finish', 0, 0);
  });

  it('calculates disconnected graph float against the project finish', () => {
    const result = calculate({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [task('task-1', 4), task('task-2', 3), task('task-3', 2)],
    });

    expectFloat(result, 'task-1', 0, 0);
    expectFloat(result, 'task-2', 0, 0);
    expectFloat(result, 'task-3', 5, 5);
  });

  it('skips summary nodes while calculating descendant float', () => {
    const result = calculate({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [
        task('summary-1', 0, TaskKind.Summary),
        task('task-1', 2, TaskKind.Standard, 'summary-1'),
        task('task-2', 3, TaskKind.Standard, 'summary-1'),
      ],
    });

    expect(result.tasks.has('summary-1')).toBe(false);
    expectFloat(result, 'task-1', 0, 0);
    expectFloat(result, 'task-2', 0, 0);
  });

  it('calculates mixed dependency graph float', () => {
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
      ],
      tasks: [
        task('task-1', 4),
        task('task-2', 7),
        task('task-3', 2),
        task('task-4', 3),
      ],
    });

    expectFloat(result, 'task-1', 1, 0);
    expectFloat(result, 'task-2', 5, -3);
    expectFloat(result, 'task-3', 1, -3);
    expectFloat(result, 'task-4', 1, 1);
  });

  function calculate(input: {
    dependencies?: ReturnType<typeof dependency>[];
    tasks: ReturnType<typeof task>[];
  }) {
    const graph = graphBuilder.buildGraph(input);
    const forward = forwardPass.calculate(graph);
    const backward = backwardPass.calculate(graph, forward);
    return floatService.calculate(graph, forward, backward);
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

function expectFloat(
  result: ReturnType<PlanningFloatService['calculate']>,
  taskId: string,
  totalFloat: number,
  freeFloat: number,
) {
  expect(result.tasks.get(taskId)).toEqual(
    expect.objectContaining({
      freeFloat,
      taskId,
      totalFloat,
    }),
  );
}
