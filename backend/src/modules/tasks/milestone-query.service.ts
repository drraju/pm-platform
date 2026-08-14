import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MilestoneCategory } from '../../common/enums/milestone-category.enum';
import { AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { PlanningScheduleSnapshot } from '../planning/entities/planning-schedule-snapshot.entity';
import { ProjectBaselineTask } from '../projects/entities/project-baseline-task.entity';
import { ProjectBaseline } from '../projects/entities/project-baseline.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { Task } from './entities/task.entity';
import { MilestoneProjectionComposer } from './milestone-projection.composer';
import {
  MilestoneProjection,
  MilestoneProjectionPage,
  MilestoneState,
} from './milestone-projection';

export type MilestoneSortField =
  | 'title'
  | 'plannedDate'
  | 'forecastDate'
  | 'actualDate'
  | 'varianceDays';

export type MilestoneQuery = {
  category?: MilestoneCategory;
  critical?: boolean;
  dateFrom?: string;
  dateTo?: string;
  ownerId?: string;
  overdue?: boolean;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
  projectIds?: string[];
  search?: string;
  sortBy?: MilestoneSortField;
  sortDirection?: 'asc' | 'desc';
  states?: MilestoneState[];
  taskIds?: string[];
};

@Injectable()
export class MilestoneQueryService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(PlanningScheduleSnapshot)
    private readonly snapshotsRepository: Repository<PlanningScheduleSnapshot>,
    @InjectRepository(ProjectBaseline)
    private readonly baselinesRepository: Repository<ProjectBaseline>,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly projectionComposer: MilestoneProjectionComposer,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async findProjectMilestones(
    projectId: string,
    query: Omit<MilestoneQuery, 'projectIds'> = {},
    actor?: ProjectVisibilityActor,
  ): Promise<MilestoneProjectionPage> {
    return this.findMilestones({ ...query, projectIds: [projectId] }, actor);
  }

  async findPortfolioMilestones(
    query: MilestoneQuery = {},
    actor?: ProjectVisibilityActor,
  ): Promise<MilestoneProjectionPage> {
    return this.findMilestones(query, actor);
  }

  async findProjectMilestone(
    projectId: string,
    taskId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<MilestoneProjection> {
    const result = await this.findMilestones(
      {
        includeCancelled: true,
        pageSize: 1,
        projectIds: [projectId],
        taskIds: [taskId],
      },
      actor,
    );
    const milestone = result.items[0];
    if (!milestone) {
      throw new NotFoundException(
        `Milestone ${taskId} not found for project ${projectId}`,
      );
    }
    return milestone;
  }

  private async findMilestones(
    query: MilestoneQuery,
    actor?: ProjectVisibilityActor,
  ): Promise<MilestoneProjectionPage> {
    const isExternal =
      await this.authorizationPolicyService.isExternalActor(actor);
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    const requestedIds = query.projectIds;
    const projectIds =
      visibleProjectIds === 'all'
        ? requestedIds
        : requestedIds
          ? requestedIds.filter((id) => visibleProjectIds.includes(id))
          : visibleProjectIds;
    if (projectIds && projectIds.length === 0) {
      return this.toPage([], query);
    }

    const tasks = await this.tasksRepository.find({
      relations: { assignee: true, project: true },
      withDeleted: query.includeCancelled === true,
      where: {
        ...(query.taskIds ? { id: In(query.taskIds) } : {}),
        ...(projectIds ? { projectId: In(projectIds) } : {}),
        ...(isExternal ? { assigneeId: actor!.userId } : {}),
        taskKind: TaskKind.Milestone,
      },
    });
    const milestoneProjectIds = [
      ...new Set(tasks.map((task) => task.projectId)),
    ];
    if (tasks.length === 0) {
      return this.toPage([], query);
    }

    const [snapshots, baselines] = await Promise.all([
      this.snapshotsRepository.find({
        order: { scheduleVersion: 'DESC' },
        relations: { taskSchedules: true },
        where: { projectId: In(milestoneProjectIds) },
      }),
      this.baselinesRepository.find({
        relations: { tasks: true },
        where: { isCurrent: true, projectId: In(milestoneProjectIds) },
      }),
    ]);
    const snapshotByProject = new Map<string, PlanningScheduleSnapshot>();
    for (const snapshot of snapshots) {
      if (!snapshotByProject.has(snapshot.projectId)) {
        snapshotByProject.set(snapshot.projectId, snapshot);
      }
    }
    const baselineTaskByTaskId = new Map<string, ProjectBaselineTask>();
    baselines
      .flatMap((baseline) => baseline.tasks ?? [])
      .forEach((task) => {
        if (task.taskId) baselineTaskByTaskId.set(task.taskId, task);
      });

    const projections = tasks.map((task) => {
      const snapshot = snapshotByProject.get(task.projectId);
      return this.projectionComposer.compose({
        baselineTask: baselineTaskByTaskId.get(task.id),
        schedule: snapshot?.taskSchedules?.find(
          (schedule) => schedule.taskId === task.id,
        ),
        snapshot,
        task,
      });
    });

    return this.toPage(this.filterAndSort(projections, query), query);
  }

  private filterAndSort(
    projections: MilestoneProjection[],
    query: MilestoneQuery,
  ): MilestoneProjection[] {
    const search = query.search?.trim().toLowerCase();
    const filtered = projections.filter((projection) => {
      const filterDate = projection.forecastDate ?? projection.plannedDate;
      return (
        (!query.category || projection.category === query.category) &&
        (query.critical === undefined ||
          projection.critical === query.critical) &&
        (query.overdue === undefined || projection.overdue === query.overdue) &&
        (query.includeCancelled || projection.state !== 'cancelled') &&
        (!query.ownerId || projection.owner?.id === query.ownerId) &&
        (!query.states || query.states.includes(projection.state)) &&
        (!search || projection.title.toLowerCase().includes(search)) &&
        (!query.dateFrom ||
          Boolean(filterDate && filterDate >= query.dateFrom)) &&
        (!query.dateTo || Boolean(filterDate && filterDate <= query.dateTo))
      );
    });
    const sortBy = query.sortBy ?? 'forecastDate';
    const direction = query.sortDirection === 'desc' ? -1 : 1;
    return filtered.sort((left, right) => {
      const result = String(left[sortBy] ?? '').localeCompare(
        String(right[sortBy] ?? ''),
        undefined,
        { numeric: true },
      );
      return (result || left.title.localeCompare(right.title)) * direction;
    });
  }

  private toPage(
    items: MilestoneProjection[],
    query: MilestoneQuery,
  ): MilestoneProjectionPage {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: items.length,
    };
  }
}
