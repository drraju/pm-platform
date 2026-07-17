import { DependencyEndpointSnapshot } from './dependency-domain';

export type OrderableDependency = Readonly<{
  dependencyId: string;
  predecessor: DependencyEndpointSnapshot;
  successor: DependencyEndpointSnapshot;
}>;

export class DependencyOrderingPolicy {
  sort<T extends OrderableDependency>(dependencies: readonly T[]): T[] {
    return [...dependencies].sort(
      (left, right) =>
        this.sequence(left.predecessor) - this.sequence(right.predecessor) ||
        this.sequence(left.successor) - this.sequence(right.successor) ||
        left.predecessor.id.localeCompare(right.predecessor.id) ||
        left.successor.id.localeCompare(right.successor.id) ||
        left.dependencyId.localeCompare(right.dependencyId),
    );
  }

  private sequence(endpoint: DependencyEndpointSnapshot): number {
    return endpoint.sequenceNumber ?? Number.MAX_SAFE_INTEGER;
  }
}
