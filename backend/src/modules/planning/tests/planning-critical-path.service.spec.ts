import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { PlanningBackwardPassService } from '../planning-backward-pass.service';
import { PlanningCriticalPathService } from '../planning-critical-path.service';
import { PlanningFloatService } from '../planning-float.service';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../planning-graph-builder.service';

describe('PlanningCriticalPathService', () => {
  let backwardPass: PlanningBackwardPassService;
  let criticalPath: PlanningCriticalPathService;
  let floatService: PlanningFloatService;
  let forwardPass: PlanningForwardPassService;
  let graphBuilder: PlanningGraphBuilderService;

  beforeEach(() => {
    backwardPass = new PlanningBackwardPassService();
    criticalPath = new PlanningCriticalPathService();
    floatService = new PlanningFloatService();
    forwardPass = new PlanningForwardPassService();
    graphBuilder = new PlanningGraphBuilderService();
  });

  it('identifies a single critical chain', () => {
    const result = identify({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-2'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 3), task('task-3', 4)],
    });

    expectCritical(result, 'task-1', true);
    expectCritical(result, 'task-2', true);
    expectCritical(result, 'task-3', true);
  });

  it('identifies parallel critical chains with equal duration', () => {
    const result = identify({
      dependencies: [
        dependency('dep-1', 'start', 'path-a'),
        dependency('dep-2', 'start', 'path-b'),
        dependency('dep-3', 'path-a', 'finish'),
        dependency('dep-4', 'path-b', 'finish'),
      ],
      tasks: [
        task('start', 1),
        task('path-a', 3),
        task('path-b', 3),
        task('finish', 1),
      ],
    });

    expectCritical(result, 'start', true);
    expectCritical(result, 'path-a', true);
    expectCritical(result, 'path-b', true);
    expectCritical(result, 'finish', true);
  });

  it('marks activities with positive float as non-critical', () => {
    const result = identify({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1', 2), task('task-2', 5), task('task-3', 3)],
    });

    expectCritical(result, 'task-1', false);
    expectCritical(result, 'task-2', true);
    expectCritical(result, 'task-3', true);
  });

  it('supports critical milestones', () => {
    const result = identify({
      dependencies: [
        dependency('dep-1', 'task-1', 'milestone-1'),
        dependency('dep-2', 'milestone-1', 'task-2'),
      ],
      tasks: [
        task('task-1', 3),
        task('milestone-1', 0, TaskKind.Milestone),
        task('task-2', 2),
      ],
    });

    expectCritical(result, 'task-1', true);
    expectCritical(result, 'milestone-1', true);
    expectCritical(result, 'task-2', true);
  });

  it('identifies critical and non-critical disconnected schedules', () => {
    const result = identify({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [task('task-1', 4), task('task-2', 3), task('task-3', 2)],
    });

    expectCritical(result, 'task-1', true);
    expectCritical(result, 'task-2', true);
    expectCritical(result, 'task-3', false);
  });

  it('never marks summary tasks critical directly', () => {
    const result = identify({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [
        task('summary-1', 0, TaskKind.Summary),
        task('task-1', 2, TaskKind.Standard, 'summary-1'),
        task('task-2', 3, TaskKind.Standard, 'summary-1'),
      ],
    });

    expect(result.tasks.has('summary-1')).toBe(false);
    expectCritical(result, 'task-1', true);
    expectCritical(result, 'task-2', true);
  });

  it('bounds start-to-start predecessors by project finish', () => {
    const result = identify({
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

    expectCritical(result, 'task-1', true);
    expectCritical(result, 'task-2', false);
  });

  function identify(input: {
    dependencies?: ReturnType<typeof dependency>[];
    tasks: ReturnType<typeof task>[];
  }) {
    const graph = graphBuilder.buildGraph(input);
    const forward = forwardPass.calculate(graph);
    const backward = backwardPass.calculate(graph, forward);
    const float = floatService.calculate(graph, forward, backward);
    return criticalPath.identify(graph, float);
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

function expectCritical(
  result: ReturnType<PlanningCriticalPathService['identify']>,
  taskId: string,
  isCritical: boolean,
) {
  expect(result.tasks.get(taskId)).toEqual(
    expect.objectContaining({
      isCritical,
      taskId,
    }),
  );
}
