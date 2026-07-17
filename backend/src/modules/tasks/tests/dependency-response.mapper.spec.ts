import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import {
  DependencyBlockedState,
  DependencyHealth,
  DependencyImpactLevel,
  DependencyProjection,
} from '../dependency-domain';
import { DependencyApiSort } from '../dto/dependency-query.dto';
import { DependencyResponseMapper } from '../dependency-response.mapper';

describe('DependencyResponseMapper', () => {
  const mapper = new DependencyResponseMapper();

  it('maps validated transport filters to application query contracts', () => {
    expect(
      mapper.toQuery({
        blocked: true,
        dependencyType: [TaskDependencyType.FinishToStart],
        health: [DependencyHealth.Blocking],
        impactDepth: 4,
        impactTaskLimit: 20,
        page: 2,
        pageSize: 10,
        search: 'release',
        sort: DependencyApiSort.Impact,
        taskId: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).toEqual(
      expect.objectContaining({
        blocked: true,
        dependencyTypes: [TaskDependencyType.FinishToStart],
        health: [DependencyHealth.Blocking],
        page: 2,
        pageSize: 10,
        search: 'release',
        sortBy: DependencyApiSort.Impact,
        taskIds: ['11111111-1111-4111-8111-111111111111'],
        traversalPolicy: { maxDepth: 4, maxTasks: 20 },
      }),
    );
  });

  it('maps projections without exposing internal dependency identifiers', () => {
    const response = mapper.toResponse(projection());

    expect(response).toMatchObject({
      blockedState: DependencyBlockedState.Blocked,
      health: DependencyHealth.Blocking,
      id: 'dependency-id',
      predecessor: { id: 'task-a', title: 'Design' },
      successor: { id: 'task-b', title: 'Build' },
    });
    expect(response).not.toHaveProperty('dependencyId');
    expect(response).not.toHaveProperty('predecessorTaskId');
    expect(response).not.toHaveProperty('successorTaskId');
  });

  it('maps pagination metadata and creates independent response arrays', () => {
    const source = projection();
    const response = mapper.toCollectionResponse({
      items: [source],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });

    expect(response).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
    expect(response.items).not.toBe([source]);
    expect(response.items[0].impact.traversal.impactedTaskIds).not.toBe(
      source.impact.traversal.impactedTaskIds,
    );
  });
});

export function projection(): DependencyProjection {
  return {
    blockedState: DependencyBlockedState.Blocked,
    dependencyId: 'dependency-id',
    dependencyType: TaskDependencyType.FinishToStart,
    health: DependencyHealth.Blocking,
    healthReason: 'constraint_unmet',
    impact: {
      directTaskCount: 1,
      impactedTaskCount: 1,
      level: DependencyImpactLevel.Low,
      maxDepthReached: 1,
      traversal: {
        impactedTaskIds: ['task-b'],
        nodes: [{ depth: 1, taskId: 'task-b' }],
        rootTaskId: 'task-a',
        traversedDependencyIds: ['dependency-id'],
        truncated: false,
      },
    },
    lagDays: 0,
    predecessor: {
      id: 'task-a',
      projectId: 'project-id',
      sequenceNumber: 1,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Design',
    },
    successor: {
      id: 'task-b',
      projectId: 'project-id',
      sequenceNumber: 2,
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Build',
    },
  };
}
