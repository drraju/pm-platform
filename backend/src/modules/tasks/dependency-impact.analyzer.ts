import {
  DependencyImpact,
  DependencyImpactLevel,
  DependencyTraversalEdge,
  DependencyTraversalNode,
  DependencyTraversalPolicy,
  DependencyTraversalResult,
} from './dependency-domain';

export const DEFAULT_DEPENDENCY_TRAVERSAL_POLICY: DependencyTraversalPolicy =
  Object.freeze({ maxDepth: 25, maxTasks: 500 });

export class DependencyImpactAnalyzer {
  analyze(
    rootTaskId: string,
    edges: readonly DependencyTraversalEdge[],
    policy: DependencyTraversalPolicy = DEFAULT_DEPENDENCY_TRAVERSAL_POLICY,
  ): DependencyImpact {
    this.validatePolicy(policy);

    const outgoing = this.indexEdges(edges);
    const visited = new Set([rootTaskId]);
    const nodes: DependencyTraversalNode[] = [];
    const traversedDependencyIds: string[] = [];
    const queue: DependencyTraversalNode[] = [{ taskId: rootTaskId, depth: 0 }];
    let queueIndex = 0;
    let truncated = false;

    while (queueIndex < queue.length) {
      const current = queue[queueIndex++];
      const nextDepth = current.depth + 1;
      const outgoingEdges = outgoing.get(current.taskId) ?? [];

      if (outgoingEdges.length && nextDepth > policy.maxDepth) {
        truncated = true;
        continue;
      }

      for (const edge of outgoingEdges) {
        if (visited.has(edge.successorTaskId)) {
          continue;
        }
        if (nodes.length >= policy.maxTasks) {
          truncated = true;
          break;
        }

        visited.add(edge.successorTaskId);
        traversedDependencyIds.push(edge.dependencyId);
        const node = { depth: nextDepth, taskId: edge.successorTaskId };
        nodes.push(node);
        queue.push(node);
      }
    }

    const directTaskCount = nodes.filter(({ depth }) => depth === 1).length;
    const traversal: DependencyTraversalResult = {
      impactedTaskIds: nodes.map(({ taskId }) => taskId),
      nodes,
      rootTaskId,
      traversedDependencyIds,
      truncated,
    };

    return {
      directTaskCount,
      impactedTaskCount: nodes.length,
      level: this.calculateLevel(nodes.length),
      maxDepthReached: nodes.reduce(
        (maximum, node) => Math.max(maximum, node.depth),
        0,
      ),
      traversal,
    };
  }

  private indexEdges(edges: readonly DependencyTraversalEdge[]) {
    const index = new Map<string, DependencyTraversalEdge[]>();
    const ordered = [...edges].sort(
      (left, right) =>
        left.successorTaskId.localeCompare(right.successorTaskId) ||
        left.dependencyId.localeCompare(right.dependencyId),
    );

    for (const edge of ordered) {
      const outgoing = index.get(edge.predecessorTaskId) ?? [];
      outgoing.push(edge);
      index.set(edge.predecessorTaskId, outgoing);
    }
    return index;
  }

  private validatePolicy(policy: DependencyTraversalPolicy) {
    if (!Number.isInteger(policy.maxDepth) || policy.maxDepth < 1) {
      throw new RangeError(
        'Dependency traversal maxDepth must be a positive integer',
      );
    }
    if (!Number.isInteger(policy.maxTasks) || policy.maxTasks < 1) {
      throw new RangeError(
        'Dependency traversal maxTasks must be a positive integer',
      );
    }
  }

  private calculateLevel(impactedTaskCount: number): DependencyImpactLevel {
    if (impactedTaskCount === 0) return DependencyImpactLevel.None;
    if (impactedTaskCount <= 2) return DependencyImpactLevel.Low;
    if (impactedTaskCount <= 5) return DependencyImpactLevel.Medium;
    return DependencyImpactLevel.High;
  }
}
