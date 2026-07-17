import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import {
  DependencyBlockedState,
  DependencyHealth,
  DependencyEndpointSnapshot,
} from '../dependency-domain';
import { DependencyHealthEvaluator } from '../dependency-health.evaluator';

describe('DependencyHealthEvaluator', () => {
  const evaluator = new DependencyHealthEvaluator();
  const endpoint = (
    id: string,
    overrides: Partial<DependencyEndpointSnapshot> = {},
  ): DependencyEndpointSnapshot => ({
    id,
    status: TaskStatus.Todo,
    taskKind: TaskKind.Standard,
    ...overrides,
  });

  it.each([
    [TaskDependencyType.FinishToStart, { status: TaskStatus.Done }],
    [TaskDependencyType.FinishToFinish, { actualEndDate: '2026-07-10' }],
    [TaskDependencyType.StartToStart, { actualStartDate: '2026-07-10' }],
    [TaskDependencyType.StartToStart, { status: TaskStatus.InProgress }],
  ])('marks a met %s constraint as satisfied', (dependencyType, state) => {
    expect(
      evaluator.evaluate({
        dependencyType,
        predecessor: endpoint('a', state),
        successor: endpoint('b'),
      }),
    ).toEqual({ health: DependencyHealth.Satisfied, reason: 'constraint_met' });
  });

  it('treats a completed successor as satisfied', () => {
    expect(
      evaluator.evaluate({
        dependencyType: TaskDependencyType.FinishToStart,
        predecessor: endpoint('a'),
        successor: endpoint('b', { status: TaskStatus.Done }),
      }),
    ).toEqual({
      health: DependencyHealth.Satisfied,
      reason: 'completed_successor',
    });
  });

  it('marks an unmet constraint as blocking', () => {
    expect(
      evaluator.evaluate({
        dependencyType: TaskDependencyType.FinishToStart,
        predecessor: endpoint('a'),
        successor: endpoint('b'),
      }),
    ).toEqual({
      health: DependencyHealth.Blocking,
      reason: 'constraint_unmet',
    });
  });

  it.each([
    TaskDependencyType.FinishToStart,
    TaskDependencyType.FinishToFinish,
    TaskDependencyType.StartToStart,
  ])('marks a missed planned %s constraint as at risk', (dependencyType) => {
    expect(
      evaluator.evaluate({
        dependencyType,
        predecessor: endpoint('a', {
          plannedEndDate: '2026-07-20',
          plannedStartDate: '2026-07-20',
        }),
        successor: endpoint('b', {
          plannedEndDate: '2026-07-15',
          plannedStartDate: '2026-07-15',
        }),
      }).health,
    ).toBe(DependencyHealth.AtRisk);
  });

  it('keeps legacy Start-to-Finish health unknown', () => {
    expect(
      evaluator.evaluate({
        dependencyType: TaskDependencyType.StartToFinish,
        predecessor: endpoint('a', { status: TaskStatus.Done }),
        successor: endpoint('b'),
      }),
    ).toEqual({
      health: DependencyHealth.Unknown,
      reason: 'legacy_start_to_finish',
    });
  });

  it.each([-2, 3])(
    'keeps a dependency with an unevaluated %d-day offset unknown',
    (lagDays) => {
      expect(
        evaluator.evaluate({
          dependencyType: TaskDependencyType.FinishToStart,
          lagDays,
          predecessor: endpoint('a', { status: TaskStatus.Done }),
          successor: endpoint('b'),
        }),
      ).toEqual({
        health: DependencyHealth.Unknown,
        reason: 'offset_not_evaluated',
      });
    },
  );

  it.each([
    [null, endpoint('b'), 'missing_endpoint'],
    [endpoint('a'), null, 'missing_endpoint'],
    [endpoint('a'), endpoint('a'), 'self_dependency'],
    [endpoint('a', { deleted: true }), endpoint('b'), 'deleted_endpoint'],
    [
      endpoint('a', { taskKind: TaskKind.Summary }),
      endpoint('b'),
      'summary_endpoint',
    ],
  ])('marks invalid endpoints as invalid', (predecessor, successor, reason) => {
    expect(
      evaluator.evaluate({
        dependencyType: TaskDependencyType.FinishToStart,
        predecessor,
        successor,
      }),
    ).toEqual({ health: DependencyHealth.Invalid, reason });
  });

  it('derives blocked state with stable dependency ordering', () => {
    expect(
      evaluator.evaluateBlockedState([
        { dependencyId: 'z', health: DependencyHealth.Satisfied },
        { dependencyId: 'b', health: DependencyHealth.AtRisk },
        { dependencyId: 'a', health: DependencyHealth.Blocking },
        { dependencyId: 'c', health: DependencyHealth.Unknown },
      ]),
    ).toEqual({
      blockingDependencyIds: ['a', 'b'],
      state: DependencyBlockedState.Blocked,
      unresolvedDependencyIds: ['c'],
    });
  });

  it('returns unknown only when unresolved health exists without a blocker', () => {
    expect(
      evaluator.evaluateBlockedState([
        { dependencyId: 'a', health: DependencyHealth.Satisfied },
        { dependencyId: 'b', health: DependencyHealth.Invalid },
      ]).state,
    ).toBe(DependencyBlockedState.Unknown);
    expect(evaluator.evaluateBlockedState([]).state).toBe(
      DependencyBlockedState.NotBlocked,
    );
  });
});
