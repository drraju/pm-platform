import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import {
  DependencyBlockedState,
  DependencyHealth,
  DependencyImpactLevel,
} from '../dependency-domain';
import { DependencyHealthEvaluator } from '../dependency-health.evaluator';
import { DependencyImpactAnalyzer } from '../dependency-impact.analyzer';
import { DependencyOrderingPolicy } from '../dependency-ordering.policy';
import { DependencyProjectionComposer } from '../dependency-projection.composer';

describe('DependencyProjectionComposer', () => {
  const healthEvaluator = new DependencyHealthEvaluator();
  const impactAnalyzer = new DependencyImpactAnalyzer();
  const composer = new DependencyProjectionComposer(
    healthEvaluator,
    impactAnalyzer,
    new DependencyOrderingPolicy(),
  );
  const task = (
    id: string,
    sequenceNumber: number,
    status = TaskStatus.Todo,
  ) => ({
    id,
    projectId: 'project-1',
    sequenceNumber,
    status,
    taskKind: TaskKind.Standard,
    title: `Task ${id}`,
  });

  it('composes health, successor blocked state, and transitive impact once', () => {
    const analyze = jest.spyOn(impactAnalyzer, 'analyze');
    const result = composer.compose({
      dependencies: [
        {
          dependencyId: 'd2',
          dependencyType: TaskDependencyType.FinishToStart,
          lagDays: 0,
          predecessor: task('b', 2),
          successor: task('c', 3),
        },
        {
          dependencyId: 'd1',
          dependencyType: TaskDependencyType.FinishToStart,
          lagDays: 0,
          predecessor: task('a', 1, TaskStatus.Done),
          successor: task('b', 2),
        },
        {
          dependencyId: 'd3',
          dependencyType: TaskDependencyType.StartToStart,
          lagDays: 0,
          predecessor: task('a', 1, TaskStatus.Done),
          successor: task('c', 3),
        },
      ],
    });

    expect(result.map(({ dependencyId }) => dependencyId)).toEqual([
      'd1',
      'd3',
      'd2',
    ]);
    expect(result[0]).toMatchObject({
      blockedState: DependencyBlockedState.NotBlocked,
      health: DependencyHealth.Satisfied,
      impact: { impactedTaskCount: 2, level: DependencyImpactLevel.Low },
      predecessor: { id: 'a', title: 'Task a' },
      successor: { id: 'b', title: 'Task b' },
    });
    expect(result[1].blockedState).toBe(DependencyBlockedState.Blocked);
    expect(result[2].blockedState).toBe(DependencyBlockedState.Blocked);
    expect(analyze).toHaveBeenCalledTimes(2);
    analyze.mockRestore();
  });

  it('is deterministic and does not mutate source input', () => {
    const dependencies = [
      {
        dependencyId: 'd1',
        dependencyType: TaskDependencyType.StartToFinish,
        lagDays: 2,
        predecessor: task('a', 1),
        successor: task('b', 2),
      },
    ];

    expect(composer.compose({ dependencies })).toEqual(
      composer.compose({ dependencies }),
    );
    expect(dependencies[0].lagDays).toBe(2);
    expect(composer.compose({ dependencies })[0]).toMatchObject({
      health: DependencyHealth.Unknown,
      healthReason: 'legacy_start_to_finish',
    });
  });
});
