import { Injectable } from '@nestjs/common';
import {
  DependencyProjectionCompositionInput,
  DependencyProjectionSource,
} from './dependency-application';
import {
  DependencyBlockedState,
  DependencyEndpointSnapshot,
  DependencyHealthRecord,
  DependencyImpact,
  DependencyProjection,
  DependencyTraversalEdge,
} from './dependency-domain';
import { DependencyHealthEvaluator } from './dependency-health.evaluator';
import { DependencyImpactAnalyzer } from './dependency-impact.analyzer';
import { DependencyOrderingPolicy } from './dependency-ordering.policy';

@Injectable()
export class DependencyProjectionComposer {
  constructor(
    private readonly healthEvaluator: DependencyHealthEvaluator,
    private readonly impactAnalyzer: DependencyImpactAnalyzer,
    private readonly orderingPolicy: DependencyOrderingPolicy,
  ) {}

  compose(input: DependencyProjectionCompositionInput): DependencyProjection[] {
    const ordered = this.orderingPolicy.sort(input.dependencies);
    const edges: DependencyTraversalEdge[] = ordered.map((dependency) => ({
      dependencyId: dependency.dependencyId,
      predecessorTaskId: dependency.predecessor.id,
      successorTaskId: dependency.successor.id,
    }));
    const healthByDependency = new Map(
      ordered.map((dependency) => [
        dependency.dependencyId,
        this.healthEvaluator.evaluate({
          dependencyType: dependency.dependencyType,
          lagDays: dependency.lagDays,
          predecessor: this.toSnapshot(dependency.predecessor),
          successor: this.toSnapshot(dependency.successor),
        }),
      ]),
    );
    const blockedBySuccessor = this.blockedStates(ordered, healthByDependency);
    const impactByPredecessor = new Map<string, DependencyImpact>();

    return ordered.map((dependency) => {
      let impact = impactByPredecessor.get(dependency.predecessor.id);
      if (!impact) {
        impact = this.impactAnalyzer.analyze(
          dependency.predecessor.id,
          edges,
          input.traversalPolicy,
        );
        impactByPredecessor.set(dependency.predecessor.id, impact);
      }
      const health = healthByDependency.get(dependency.dependencyId)!;

      return {
        blockedState:
          blockedBySuccessor.get(dependency.successor.id) ??
          DependencyBlockedState.NotBlocked,
        dependencyId: dependency.dependencyId,
        dependencyType: dependency.dependencyType,
        health: health.health,
        healthReason: health.reason,
        impact,
        lagDays: dependency.lagDays,
        predecessor: this.toEndpointProjection(dependency.predecessor),
        successor: this.toEndpointProjection(dependency.successor),
      };
    });
  }

  private blockedStates(
    dependencies: readonly DependencyProjectionSource[],
    healthByDependency: ReadonlyMap<
      string,
      ReturnType<DependencyHealthEvaluator['evaluate']>
    >,
  ) {
    const records = new Map<string, DependencyHealthRecord[]>();
    for (const dependency of dependencies) {
      const incoming = records.get(dependency.successor.id) ?? [];
      incoming.push({
        dependencyId: dependency.dependencyId,
        health: healthByDependency.get(dependency.dependencyId)!.health,
      });
      records.set(dependency.successor.id, incoming);
    }
    return new Map(
      [...records].map(([taskId, incoming]) => [
        taskId,
        this.healthEvaluator.evaluateBlockedState(incoming).state,
      ]),
    );
  }

  private toSnapshot(
    source: DependencyProjectionSource['predecessor'],
  ): DependencyEndpointSnapshot {
    return {
      actualEndDate: source.actualEndDate,
      actualStartDate: source.actualStartDate,
      deleted: Boolean(source.deletedAt),
      id: source.id,
      plannedEndDate: source.plannedEndDate,
      plannedStartDate: source.plannedStartDate,
      sequenceNumber: source.sequenceNumber,
      status: source.status,
      taskKind: source.taskKind,
    };
  }

  private toEndpointProjection(
    source: DependencyProjectionSource['predecessor'],
  ) {
    return {
      id: source.id,
      projectId: source.projectId,
      sequenceNumber: source.sequenceNumber ?? null,
      status: source.status,
      taskKind: source.taskKind ?? null,
      title: source.title,
    };
  }
}
