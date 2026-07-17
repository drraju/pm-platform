import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import {
  DependencyBlockedEvaluation,
  DependencyBlockedState,
  DependencyHealth,
  DependencyHealthEvaluation,
  DependencyHealthInput,
  DependencyHealthRecord,
  DependencyEndpointSnapshot,
} from './dependency-domain';

export class DependencyHealthEvaluator {
  evaluate(input: DependencyHealthInput): DependencyHealthEvaluation {
    const { predecessor, successor } = input;

    if (!predecessor || !successor) {
      return { health: DependencyHealth.Invalid, reason: 'missing_endpoint' };
    }
    if (predecessor.id === successor.id) {
      return { health: DependencyHealth.Invalid, reason: 'self_dependency' };
    }
    if (predecessor.deleted || successor.deleted) {
      return { health: DependencyHealth.Invalid, reason: 'deleted_endpoint' };
    }
    if (
      predecessor.taskKind === TaskKind.Summary ||
      successor.taskKind === TaskKind.Summary
    ) {
      return { health: DependencyHealth.Invalid, reason: 'summary_endpoint' };
    }
    if (input.dependencyType === TaskDependencyType.StartToFinish) {
      return {
        health: DependencyHealth.Unknown,
        reason: 'legacy_start_to_finish',
      };
    }
    if (input.lagDays) {
      return {
        health: DependencyHealth.Unknown,
        reason: 'offset_not_evaluated',
      };
    }
    if (successor.status === TaskStatus.Done || successor.actualEndDate) {
      return {
        health: DependencyHealth.Satisfied,
        reason: 'completed_successor',
      };
    }
    if (this.isConstraintMet(input.dependencyType, predecessor)) {
      return { health: DependencyHealth.Satisfied, reason: 'constraint_met' };
    }
    if (this.isPlannedConstraintMissed(input)) {
      return {
        health: DependencyHealth.AtRisk,
        reason: 'planned_constraint_missed',
      };
    }
    return { health: DependencyHealth.Blocking, reason: 'constraint_unmet' };
  }

  evaluateBlockedState(
    incomingDependencies: readonly DependencyHealthRecord[],
  ): DependencyBlockedEvaluation {
    const ordered = [...incomingDependencies].sort((left, right) =>
      left.dependencyId.localeCompare(right.dependencyId),
    );
    const blockingDependencyIds = ordered
      .filter(
        ({ health }) =>
          health === DependencyHealth.Blocking ||
          health === DependencyHealth.AtRisk,
      )
      .map(({ dependencyId }) => dependencyId);
    const unresolvedDependencyIds = ordered
      .filter(
        ({ health }) =>
          health === DependencyHealth.Invalid ||
          health === DependencyHealth.Unknown,
      )
      .map(({ dependencyId }) => dependencyId);

    return {
      blockingDependencyIds,
      state: blockingDependencyIds.length
        ? DependencyBlockedState.Blocked
        : unresolvedDependencyIds.length
          ? DependencyBlockedState.Unknown
          : DependencyBlockedState.NotBlocked,
      unresolvedDependencyIds,
    };
  }

  private isConstraintMet(
    dependencyType: TaskDependencyType,
    predecessor: DependencyEndpointSnapshot,
  ): boolean {
    if (dependencyType === TaskDependencyType.StartToStart) {
      return Boolean(
        predecessor.actualStartDate ||
        predecessor.actualEndDate ||
        predecessor.status === TaskStatus.InProgress ||
        predecessor.status === TaskStatus.Done,
      );
    }
    return Boolean(
      predecessor.actualEndDate || predecessor.status === TaskStatus.Done,
    );
  }

  private isPlannedConstraintMissed(input: DependencyHealthInput): boolean {
    const predecessorDate =
      input.dependencyType === TaskDependencyType.StartToStart
        ? input.predecessor?.plannedStartDate
        : input.predecessor?.plannedEndDate;
    const successorDate =
      input.dependencyType === TaskDependencyType.FinishToFinish
        ? input.successor?.plannedEndDate
        : input.successor?.plannedStartDate;

    return Boolean(
      predecessorDate && successorDate && predecessorDate > successorDate,
    );
  }
}
