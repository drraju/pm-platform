import { Injectable } from '@nestjs/common';
import {
  DependencyProjectionPage,
  DependencyQuery,
} from './dependency-application';
import { DependencyProjection } from './dependency-domain';
import { DependencyQueryDto } from './dto/dependency-query.dto';
import {
  DependencyCollectionResponseDto,
  DependencyResponseDto,
} from './dto/dependency-response.dto';

@Injectable()
export class DependencyResponseMapper {
  toQuery(query: DependencyQueryDto): DependencyQuery {
    return {
      blocked: query.blocked,
      dependencyTypes: query.dependencyType,
      health: query.health,
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      sortBy: query.sort,
      sortDirection: query.order,
      taskIds: query.taskId,
      traversalPolicy:
        query.impactDepth || query.impactTaskLimit
          ? {
              maxDepth: query.impactDepth ?? 25,
              maxTasks: query.impactTaskLimit ?? 500,
            }
          : undefined,
    };
  }

  toResponse(projection: DependencyProjection): DependencyResponseDto {
    return {
      blockedState: projection.blockedState,
      dependencyType: projection.dependencyType,
      health: projection.health,
      healthReason: projection.healthReason,
      id: projection.dependencyId,
      impact: {
        ...projection.impact,
        traversal: {
          ...projection.impact.traversal,
          impactedTaskIds: [...projection.impact.traversal.impactedTaskIds],
          nodes: projection.impact.traversal.nodes.map((node) => ({ ...node })),
          traversedDependencyIds: [
            ...projection.impact.traversal.traversedDependencyIds,
          ],
        },
      },
      lagDays: projection.lagDays,
      predecessor: { ...projection.predecessor },
      successor: { ...projection.successor },
    };
  }

  toCollectionResponse(
    page: DependencyProjectionPage,
  ): DependencyCollectionResponseDto {
    return {
      items: page.items.map((item) => this.toResponse(item)),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }
}
