import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import {
  DependencyProjectionPage,
  DependencyProjectionSource,
  DependencyQuery,
} from './dependency-application';
import {
  DependencyBlockedState,
  DependencyProjection,
} from './dependency-domain';
import { DependencyProjectionComposer } from './dependency-projection.composer';
import { TaskDependency } from './entities/task-dependency.entity';

@Injectable()
export class DependencyQueryService {
  constructor(
    @InjectRepository(TaskDependency)
    private readonly dependenciesRepository: Repository<TaskDependency>,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly projectionComposer: DependencyProjectionComposer,
  ) {}

  findProjectDependencies(
    projectId: string,
    query: Omit<DependencyQuery, 'projectIds'> = {},
    actor?: ProjectVisibilityActor,
  ): Promise<DependencyProjectionPage> {
    return this.findDependencies({ ...query, projectIds: [projectId] }, actor);
  }

  async findDependency(
    projectId: string,
    dependencyId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<DependencyProjection | null> {
    const result = await this.findProjectDependencies(
      projectId,
      { dependencyIds: [dependencyId], pageSize: 1 },
      actor,
    );
    return result.items[0] ?? null;
  }

  async findDependencies(
    query: DependencyQuery = {},
    actor?: ProjectVisibilityActor,
  ): Promise<DependencyProjectionPage> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    const projectIds = this.intersectProjectIds(
      query.projectIds,
      visibleProjectIds,
    );
    if (projectIds && projectIds.length === 0) {
      return this.toPage([], query);
    }

    const dependencies = await this.dependenciesRepository.find({
      relations: { predecessorTask: true, successorTask: true },
      where: [
        {
          ...(projectIds
            ? { predecessorTask: { projectId: In(projectIds) } }
            : {}),
        },
        {
          ...(projectIds
            ? { successorTask: { projectId: In(projectIds) } }
            : {}),
        },
      ],
    });
    const sources = dependencies
      .filter(
        (dependency) => dependency.predecessorTask && dependency.successorTask,
      )
      .map((dependency) => this.toSource(dependency));
    const projections = this.projectionComposer.compose({
      dependencies: sources,
      traversalPolicy: query.traversalPolicy,
    });

    return this.toPage(this.filterAndSort(projections, query), query);
  }

  private intersectProjectIds(
    requested: readonly string[] | undefined,
    visible: readonly string[] | 'all',
  ): string[] | undefined {
    if (visible === 'all') return requested ? [...requested] : undefined;
    return requested
      ? requested.filter((projectId) => visible.includes(projectId))
      : [...visible];
  }

  private toSource(dependency: TaskDependency): DependencyProjectionSource {
    return {
      dependencyId: dependency.id,
      dependencyType: dependency.dependencyType,
      lagDays: dependency.lagDays,
      predecessor: dependency.predecessorTask,
      successor: dependency.successorTask,
    };
  }

  private filterAndSort(
    projections: readonly DependencyProjection[],
    query: DependencyQuery,
  ): DependencyProjection[] {
    const search = query.search?.trim().toLowerCase();
    const filtered = projections.filter((projection) => {
      const matchesTask =
        !query.taskIds ||
        query.taskIds.includes(projection.predecessor.id) ||
        query.taskIds.includes(projection.successor.id);
      return (
        matchesTask &&
        (!query.dependencyIds ||
          query.dependencyIds.includes(projection.dependencyId)) &&
        (!query.dependencyTypes ||
          query.dependencyTypes.includes(projection.dependencyType)) &&
        (!query.health || query.health.includes(projection.health)) &&
        (query.blocked === undefined ||
          (query.blocked
            ? projection.blockedState === DependencyBlockedState.Blocked
            : projection.blockedState === DependencyBlockedState.NotBlocked)) &&
        (!search ||
          projection.predecessor.title.toLowerCase().includes(search) ||
          projection.successor.title.toLowerCase().includes(search))
      );
    });
    const direction = query.sortDirection === 'desc' ? -1 : 1;
    return filtered.sort((left, right) => {
      const result = this.sortValue(left, query).localeCompare(
        this.sortValue(right, query),
        undefined,
        { numeric: true },
      );
      return (
        (result || left.dependencyId.localeCompare(right.dependencyId)) *
        direction
      );
    });
  }

  private sortValue(projection: DependencyProjection, query: DependencyQuery) {
    switch (query.sortBy) {
      case 'successor':
        return projection.successor.title;
      case 'health':
        return projection.health;
      case 'impact':
        return String(projection.impact.impactedTaskCount).padStart(10, '0');
      case 'dependencyType':
        return projection.dependencyType;
      case 'predecessor':
      default:
        return projection.predecessor.title;
    }
  }

  private toPage(
    items: readonly DependencyProjection[],
    query: DependencyQuery,
  ): DependencyProjectionPage {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / pageSize),
    };
  }
}
