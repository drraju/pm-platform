import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import {
  PlanningGraphBuilderService,
  PlanningGraphValidationError,
  PlanningGraphValidationIssueCode,
} from '../planning-graph-builder.service';

describe('PlanningGraphBuilderService', () => {
  let service: PlanningGraphBuilderService;

  beforeEach(() => {
    service = new PlanningGraphBuilderService();
  });

  it('builds a graph for a single task', () => {
    const graph = service.buildGraph({
      tasks: [task('task-1')],
    });

    expect(graph.nodes.size).toBe(1);
    expect(graph.edges).toEqual([]);
    expect(graph.nodes.get('task-1')).toEqual({
      children: [],
      durationDays: 1,
      incomingDependencies: [],
      outgoingDependencies: [],
      parentTaskId: null,
      taskId: 'task-1',
      taskType: TaskKind.Standard,
    });
    expect(graph.topologicalTaskIds).toEqual(['task-1']);
  });

  it('builds a simple finish-to-start chain', () => {
    const graph = service.buildGraph({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [task('task-1'), task('task-2')],
    });

    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes.get('task-1')?.outgoingDependencies).toEqual([
      expect.objectContaining({
        predecessorTaskId: 'task-1',
        successorTaskId: 'task-2',
      }),
    ]);
    expect(graph.nodes.get('task-2')?.incomingDependencies).toEqual([
      expect.objectContaining({
        predecessorTaskId: 'task-1',
        successorTaskId: 'task-2',
      }),
    ]);
    expect(graph.topologicalTaskIds.indexOf('task-1')).toBeLessThan(
      graph.topologicalTaskIds.indexOf('task-2'),
    );
  });

  it('builds a branch graph', () => {
    const graph = service.buildGraph({
      dependencies: [
        dependency(
          'dep-1',
          'task-1',
          'task-2',
          TaskDependencyType.StartToStart,
        ),
        dependency(
          'dep-2',
          'task-1',
          'task-3',
          TaskDependencyType.FinishToFinish,
        ),
      ],
      tasks: [task('task-1'), task('task-2'), task('task-3')],
    });

    expect(graph.nodes.get('task-1')?.outgoingDependencies).toHaveLength(2);
    expect(graph.nodes.get('task-2')?.incomingDependencies).toHaveLength(1);
    expect(graph.nodes.get('task-3')?.incomingDependencies).toHaveLength(1);
    expect(graph.edges.map((edge) => edge.dependencyType)).toEqual([
      TaskDependencyType.StartToStart,
      TaskDependencyType.FinishToFinish,
    ]);
  });

  it('builds a merge graph', () => {
    const graph = service.buildGraph({
      dependencies: [
        dependency('dep-1', 'task-1', 'task-3'),
        dependency('dep-2', 'task-2', 'task-3'),
      ],
      tasks: [task('task-1'), task('task-2'), task('task-3')],
    });

    expect(graph.nodes.get('task-3')?.incomingDependencies).toHaveLength(2);
    expect(graph.topologicalTaskIds.indexOf('task-1')).toBeLessThan(
      graph.topologicalTaskIds.indexOf('task-3'),
    );
    expect(graph.topologicalTaskIds.indexOf('task-2')).toBeLessThan(
      graph.topologicalTaskIds.indexOf('task-3'),
    );
  });

  it('links nested summaries as parent-child hierarchy without dependency edges', () => {
    const graph = service.buildGraph({
      dependencies: [dependency('dep-1', 'task-1', 'task-2')],
      tasks: [
        task('summary-1', TaskKind.Summary),
        task('summary-2', TaskKind.Summary, 'summary-1'),
        task('task-1', TaskKind.Standard, 'summary-2'),
        task('task-2', TaskKind.Standard, 'summary-1'),
      ],
    });

    expect(graph.nodes.get('summary-1')?.children).toEqual([
      'summary-2',
      'task-2',
    ]);
    expect(graph.nodes.get('summary-2')?.children).toEqual(['task-1']);
    expect(graph.edges).toHaveLength(1);
  });

  it('keeps dependencies on standard parent tasks as direct task edges', () => {
    const graph = service.buildGraph({
      dependencies: [dependency('dep-1', 'task-a', 'task-b')],
      tasks: [
        task('task-a'),
        task('task-b'),
        task('task-b-1', TaskKind.Standard, 'task-b'),
        task('task-b-2', TaskKind.Standard, 'task-b'),
      ],
    });

    expect(graph.edges).toEqual([
      expect.objectContaining({
        predecessorTaskId: 'task-a',
        successorTaskId: 'task-b',
      }),
    ]);
    expect(graph.nodes.get('task-b')?.children).toEqual([
      'task-b-1',
      'task-b-2',
    ]);
    expect(graph.nodes.get('task-b')?.incomingDependencies).toEqual([
      expect.objectContaining({
        predecessorTaskId: 'task-a',
        successorTaskId: 'task-b',
      }),
    ]);
    expect(graph.nodes.get('task-b-1')?.incomingDependencies).toEqual([]);
    expect(graph.nodes.get('task-b-2')?.incomingDependencies).toEqual([]);
    expect(graph.nodes.get('task-a')?.outgoingDependencies).toEqual([
      expect.objectContaining({
        predecessorTaskId: 'task-a',
        successorTaskId: 'task-b',
      }),
    ]);
  });

  it('includes milestones as valid leaf dependency endpoints', () => {
    const graph = service.buildGraph({
      dependencies: [dependency('dep-1', 'task-1', 'milestone-1')],
      tasks: [task('task-1'), task('milestone-1', TaskKind.Milestone)],
    });

    expect(graph.nodes.get('milestone-1')).toEqual(
      expect.objectContaining({
        incomingDependencies: [
          expect.objectContaining({ predecessorTaskId: 'task-1' }),
        ],
        taskType: TaskKind.Milestone,
      }),
    );
  });

  it('rejects circular dependencies', () => {
    expectValidationIssues(
      () =>
        service.buildGraph({
          dependencies: [
            dependency('dep-1', 'task-1', 'task-2'),
            dependency('dep-2', 'task-2', 'task-3'),
            dependency('dep-3', 'task-3', 'task-1'),
          ],
          tasks: [task('task-1'), task('task-2'), task('task-3')],
        }),
      ['CIRCULAR_DEPENDENCY'],
    );
  });

  it('rejects orphan nodes with missing parents', () => {
    expectValidationIssues(
      () =>
        service.buildGraph({
          tasks: [task('task-1', TaskKind.Standard, 'missing-summary')],
        }),
      ['MISSING_PARENT'],
    );
  });

  it('rejects missing predecessor and successor references', () => {
    expectValidationIssues(
      () =>
        service.buildGraph({
          dependencies: [
            dependency('dep-1', 'missing-task', 'task-1'),
            dependency('dep-2', 'task-1', 'missing-task'),
          ],
          tasks: [task('task-1')],
        }),
      ['MISSING_PREDECESSOR', 'MISSING_SUCCESSOR'],
    );
  });

  it('rejects invalid dependency targets', () => {
    expectValidationIssues(
      () =>
        service.buildGraph({
          dependencies: [dependency('dep-1', 'task-1', 'task-1')],
          tasks: [task('task-1')],
        }),
      ['INVALID_DEPENDENCY_TARGET'],
    );
  });

  it('rejects summary dependency endpoints', () => {
    expectValidationIssues(
      () =>
        service.buildGraph({
          dependencies: [dependency('dep-1', 'summary-1', 'task-1')],
          tasks: [task('summary-1', TaskKind.Summary), task('task-1')],
        }),
      ['SUMMARY_DEPENDENCY_ENDPOINT'],
    );
  });

  it('ignores legacy start-to-finish dependencies for new graphs', () => {
    const graph = service.buildGraph({
      dependencies: [
        dependency(
          'dep-legacy',
          'task-1',
          'task-2',
          TaskDependencyType.StartToFinish,
        ),
      ],
      tasks: [task('task-1'), task('task-2')],
    });

    expect(graph.edges).toEqual([]);
    expect(graph.nodes.get('task-1')?.outgoingDependencies).toEqual([]);
    expect(graph.nodes.get('task-2')?.incomingDependencies).toEqual([]);
  });
});

function task(
  taskId: string,
  taskKind: TaskKind = TaskKind.Standard,
  parentTaskId: string | null = null,
) {
  return { parentTaskId, taskId, taskKind };
}

function dependency(
  id: string,
  predecessorTaskId: string | null,
  successorTaskId: string | null,
  dependencyType: TaskDependencyType = TaskDependencyType.FinishToStart,
) {
  return { dependencyType, id, predecessorTaskId, successorTaskId };
}

function expectValidationIssues(
  action: () => unknown,
  expectedCodes: PlanningGraphValidationIssueCode[],
) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(PlanningGraphValidationError);
    expect(
      (error as PlanningGraphValidationError).issues.map((issue) => issue.code),
    ).toEqual(expect.arrayContaining(expectedCodes));
    return;
  }

  throw new Error('Expected planning graph validation to fail');
}
