import { TaskStatus } from '../../../common/enums/task-status.enum';
import { DependencyEndpointSnapshot } from '../dependency-domain';
import { DependencyOrderingPolicy } from '../dependency-ordering.policy';

describe('DependencyOrderingPolicy', () => {
  const policy = new DependencyOrderingPolicy();
  const endpoint = (
    id: string,
    sequenceNumber?: number | null,
  ): DependencyEndpointSnapshot => ({
    id,
    sequenceNumber,
    status: TaskStatus.Todo,
  });

  it('orders by endpoint sequence and then stable identifiers', () => {
    const dependencies = [
      {
        dependencyId: 'd3',
        predecessor: endpoint('c'),
        successor: endpoint('z'),
      },
      {
        dependencyId: 'd2',
        predecessor: endpoint('a', 1),
        successor: endpoint('c', 3),
      },
      {
        dependencyId: 'd1',
        predecessor: endpoint('a', 1),
        successor: endpoint('b', 2),
      },
    ];

    expect(
      policy.sort(dependencies).map(({ dependencyId }) => dependencyId),
    ).toEqual(['d1', 'd2', 'd3']);
    expect(dependencies.map(({ dependencyId }) => dependencyId)).toEqual([
      'd3',
      'd2',
      'd1',
    ]);
  });
});
