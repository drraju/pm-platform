import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, EntityManager, LessThan, MoreThan, Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { signedUtcCalendarDayDifference } from '../../common/dates/signed-utc-calendar-day-difference';
import { MilestoneCategory } from '../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { PlanningScheduleSnapshot } from '../planning/entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from '../planning/entities/planning-task-schedule.entity';
import { findCurrentCalculatedSnapshot } from '../planning/planning-current-snapshot.repository';
import { User } from '../users/entities/user.entity';
import { ForecastHistoryQueryDto } from './dto/forecast-history-query.dto';
import {
  BaselineSummaryDto,
  ForecastHistoryItemDto,
  ForecastHistoryResponseDto,
  ForecastOverviewDto,
  ForecastSnapshotDetailDto,
  ForecastSnapshotTaskScheduleDto,
  ForecastSummaryDto,
  WorkingOutputState,
} from './dto/forecast-read.dto';
import { ProjectBaselineTask } from './entities/project-baseline-task.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { Project } from './entities/project.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from './project-visibility.service';

const approvedBaselineStatus = 'approved';
const eligibleOriginalBaselineStatuses = ['approved', 'superseded'];
const defaultHistoryLimit = 25;

type BaselineSummaryRow = {
  baseline_captured_at: Date | string;
  baseline_id: string;
  baseline_is_current: boolean;
  baseline_name: string;
  baseline_project_id: string;
  baseline_status: string;
  baseline_version_number: number | string;
  captured_by_first_name: string | null;
  captured_by_id: string | null;
  captured_by_last_name: string | null;
  milestone_count: number | string;
  project_finish_date: Date | string | null;
  project_start_date: Date | string | null;
  task_count: number | string;
  unscheduled_executable_task_count: number | string;
};

type ForecastSummaryRow = {
  calculated_at: Date | string | null;
  calculation_status: PlanningCalculationStatus;
  critical_task_count: number | string;
  generated_by_first_name: string | null;
  generated_by_id: string | null;
  generated_by_last_name: string | null;
  milestone_count: number | string;
  project_finish_date: Date | string | null;
  project_id: string;
  project_start_date: Date | string | null;
  schedule_anchor_date: Date | string | null;
  schedule_version: number | string;
  snapshot_id: string;
  task_count: number | string;
  unscheduled_executable_task_count: number | string;
};

type ForecastSnapshotSummaryRow = ForecastSummaryRow & {
  is_current: boolean | string;
};

type ForecastSnapshotTaskScheduleRow = {
  duration_days: number | string | null;
  is_critical: boolean;
  milestone_category: MilestoneCategory | null;
  parent_task_id: string | null;
  scheduled_end_date: Date | string | null;
  scheduled_start_date: Date | string | null;
  sequence_number: number | string | null;
  task_id: string | null;
  task_kind: TaskKind;
  task_title: string;
};

@Injectable()
export class ForecastQueryService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async getOverview(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ForecastOverviewDto> {
    await this.ensureForecastVisible(projectId, actor);

    return this.projectsRepository.manager.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const baselineRepository = manager.getRepository(ProjectBaseline);
        const snapshotRepository = manager.getRepository(
          PlanningScheduleSnapshot,
        );
        const activeBaseline = await this.resolveActiveBaseline(
          baselineRepository,
          projectId,
        );
        const originalBaseline = await baselineRepository.findOne({
          order: { versionNumber: 'ASC' },
          where: eligibleOriginalBaselineStatuses.map((status) => ({
            projectId,
            status,
          })),
        });
        const currentSnapshot = await findCurrentCalculatedSnapshot(
          snapshotRepository,
          projectId,
        );
        const previousSnapshot = currentSnapshot
          ? await snapshotRepository.findOne({
              order: { scheduleVersion: 'DESC' },
              where: {
                calculationStatus: PlanningCalculationStatus.Calculated,
                projectId,
                scheduleVersion: And(
                  LessThan(currentSnapshot.scheduleVersion),
                  MoreThan(0),
                ),
              },
            })
          : null;

        const baselineSummaries = await this.loadBaselineSummaries(
          manager,
          [activeBaseline, originalBaseline].filter(
            (baseline): baseline is ProjectBaseline => Boolean(baseline),
          ),
        );
        const forecastSummaries = await this.loadForecastSummaries(
          manager,
          [currentSnapshot, previousSnapshot].filter(
            (snapshot): snapshot is PlanningScheduleSnapshot =>
              Boolean(snapshot),
          ),
          currentSnapshot?.id ?? null,
        );
        const activeBaselineSummary = activeBaseline
          ? (baselineSummaries.get(activeBaseline.id) ?? null)
          : null;
        const originalBaselineSummary = originalBaseline
          ? (baselineSummaries.get(originalBaseline.id) ?? null)
          : null;
        const currentForecast = currentSnapshot
          ? (forecastSummaries.get(currentSnapshot.id) ?? null)
          : null;
        const previousForecast = previousSnapshot
          ? (forecastSummaries.get(previousSnapshot.id) ?? null)
          : null;

        return {
          activeBaseline: activeBaselineSummary,
          availability: {
            activeBaseline: Boolean(activeBaselineSummary),
            currentForecast: Boolean(currentForecast),
            originalBaseline: Boolean(originalBaselineSummary),
            previousForecast: Boolean(previousForecast),
          },
          currentForecast,
          finishVarianceFromCurrentActiveBaselineDays:
            signedUtcCalendarDayDifference(
              currentForecast?.projectFinishDate,
              activeBaselineSummary?.projectFinishDate,
            ),
          finishVarianceFromPreviousDays: signedUtcCalendarDayDifference(
            currentForecast?.projectFinishDate,
            previousForecast?.projectFinishDate,
          ),
          originalBaseline: originalBaselineSummary,
          previousForecast,
          projectId,
          warnings: [],
          workingOutputState: WorkingOutputState.NotRequested,
        };
      },
    );
  }

  async getHistory(
    projectId: string,
    query: ForecastHistoryQueryDto = {},
    actor?: ProjectVisibilityActor,
  ): Promise<ForecastHistoryResponseDto> {
    await this.ensureForecastVisible(projectId, actor);
    const limit = query.limit ?? defaultHistoryLimit;

    return this.projectsRepository.manager.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const baselineRepository = manager.getRepository(ProjectBaseline);
        const snapshotRepository = manager.getRepository(
          PlanningScheduleSnapshot,
        );
        const activeBaseline = await this.resolveActiveBaseline(
          baselineRepository,
          projectId,
        );
        const currentSnapshot = await findCurrentCalculatedSnapshot(
          snapshotRepository,
          projectId,
        );
        const activeBaselineSummaries = await this.loadBaselineSummaries(
          manager,
          activeBaseline ? [activeBaseline] : [],
        );
        const activeBaselineFinishDate = activeBaseline
          ? (activeBaselineSummaries.get(activeBaseline.id)
              ?.projectFinishDate ?? null)
          : null;
        const pageSnapshots = await snapshotRepository.find({
          order: { scheduleVersion: 'DESC' },
          take: limit + 1,
          where: {
            calculationStatus: PlanningCalculationStatus.Calculated,
            projectId,
            scheduleVersion:
              query.beforeVersion === undefined
                ? MoreThan(0)
                : And(LessThan(query.beforeVersion), MoreThan(0)),
          },
        });
        const summaries = await this.loadForecastSummaries(
          manager,
          pageSnapshots,
          currentSnapshot?.id ?? null,
        );
        const hasMore = pageSnapshots.length > limit;
        const pageSnapshotRows = pageSnapshots.slice(0, limit);
        const items = pageSnapshotRows.map<ForecastHistoryItemDto>(
          (snapshot, index) => {
            const summary = summaries.get(snapshot.id)!;
            const previousSummary = summaries.get(pageSnapshots[index + 1]?.id);
            return {
              calculatedAt: summary.calculatedAt,
              criticalTaskCount: summary.criticalTaskCount,
              finishVarianceFromCurrentActiveBaselineDays:
                signedUtcCalendarDayDifference(
                  summary.projectFinishDate,
                  activeBaselineFinishDate,
                ),
              finishVarianceFromPreviousDays: signedUtcCalendarDayDifference(
                summary.projectFinishDate,
                previousSummary?.projectFinishDate,
              ),
              generatedBy: summary.generatedBy,
              isCurrent: summary.isCurrent,
              milestoneCount: summary.milestoneCount,
              projectFinishDate: summary.projectFinishDate,
              projectStartDate: summary.projectStartDate,
              scheduleVersion: summary.scheduleVersion,
              snapshotId: summary.snapshotId,
              taskCount: summary.taskCount,
              unscheduledExecutableTaskCount:
                summary.unscheduledExecutableTaskCount,
            };
          },
        );

        return {
          hasMore,
          items,
          nextCursor:
            hasMore && items.length > 0
              ? items[items.length - 1].scheduleVersion
              : null,
        };
      },
    );
  }

  async getSnapshotDetail(
    projectId: string,
    snapshotId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ForecastSnapshotDetailDto> {
    await this.ensureForecastVisible(projectId, actor);

    return this.projectsRepository.manager.transaction(
      'REPEATABLE READ',
      async (manager) => {
        await manager.query('SET TRANSACTION READ ONLY');

        const summaryRow = await this.createForecastSummaryQuery(manager)
          .addSelect(
            `NOT EXISTS (
              SELECT 1
              FROM planning_schedule_snapshots AS newer_snapshot
              WHERE newer_snapshot.project_id = "snapshot"."project_id"
                AND newer_snapshot.calculation_status = :calculatedStatus
                AND newer_snapshot.deleted_at IS NULL
                AND newer_snapshot.schedule_version > "snapshot"."schedule_version"
            )`,
            'is_current',
          )
          .andWhere('snapshot.id = :snapshotId', { snapshotId })
          .andWhere('snapshot.projectId = :projectId', { projectId })
          .andWhere('snapshot.calculationStatus = :calculatedStatus', {
            calculatedStatus: PlanningCalculationStatus.Calculated,
          })
          .andWhere('snapshot.scheduleVersion > 0')
          .getRawOne<ForecastSnapshotSummaryRow>();

        if (!summaryRow) {
          throw new NotFoundException(
            `Forecast snapshot ${snapshotId} not found for project ${projectId}`,
          );
        }

        const taskRows = await manager
          .getRepository(PlanningTaskSchedule)
          .createQueryBuilder('schedule')
          .select('schedule.taskId', 'task_id')
          .addSelect('schedule.taskTitle', 'task_title')
          .addSelect('schedule.parentTaskId', 'parent_task_id')
          .addSelect('schedule.taskKind', 'task_kind')
          .addSelect('schedule.milestoneCategory', 'milestone_category')
          .addSelect('schedule.scheduledStartDate', 'scheduled_start_date')
          .addSelect('schedule.scheduledEndDate', 'scheduled_end_date')
          .addSelect('schedule.durationDays', 'duration_days')
          .addSelect('schedule.isCritical', 'is_critical')
          .addSelect('schedule.sequenceNumber', 'sequence_number')
          .where('schedule.snapshotId = :snapshotId', { snapshotId })
          .andWhere('schedule.deletedAt IS NULL')
          .orderBy('schedule.sequenceNumber', 'ASC', 'NULLS LAST')
          .addOrderBy('schedule.createdAt', 'ASC')
          .addOrderBy('schedule.id', 'ASC')
          .getRawMany<ForecastSnapshotTaskScheduleRow>();

        return {
          snapshot: this.mapForecastSummary(
            summaryRow,
            this.toBoolean(summaryRow.is_current)
              ? summaryRow.snapshot_id
              : null,
          ),
          taskSchedules: taskRows.map((row) =>
            this.mapForecastSnapshotTaskSchedule(row),
          ),
        };
      },
    );
  }

  private async ensureForecastVisible(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<void> {
    const projectExists = await this.projectsRepository.existsBy({
      id: projectId,
    });
    if (!projectExists) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (
      !(await this.projectVisibilityService.canViewProject(projectId, actor))
    ) {
      throw new ForbiddenException('Project access is restricted');
    }
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      throw new NotFoundException(
        `Forecast not found for project ${projectId}`,
      );
    }
  }

  private async resolveActiveBaseline(
    repository: Repository<ProjectBaseline>,
    projectId: string,
  ): Promise<ProjectBaseline | null> {
    const activeBaseline = await repository.findOne({
      where: { isCurrent: true, projectId },
    });
    if (activeBaseline && activeBaseline.status !== approvedBaselineStatus) {
      throw new ConflictException(
        `Active baseline lifecycle invariant violated for project ${projectId}`,
      );
    }
    return activeBaseline;
  }

  private async loadBaselineSummaries(
    manager: EntityManager,
    baselines: ProjectBaseline[],
  ): Promise<Map<string, BaselineSummaryDto>> {
    const baselineIds = [...new Set(baselines.map(({ id }) => id))];
    if (baselineIds.length === 0) {
      return new Map();
    }

    const rows = await manager
      .getRepository(ProjectBaseline)
      .createQueryBuilder('baseline')
      .leftJoin(
        ProjectBaselineTask,
        'task',
        'task.projectBaselineId = baseline.id AND task.deletedAt IS NULL',
      )
      .leftJoin(User, 'capturedBy', 'capturedBy.id = baseline.capturedById')
      .select('baseline.id', 'baseline_id')
      .addSelect('baseline.projectId', 'baseline_project_id')
      .addSelect('baseline.versionNumber', 'baseline_version_number')
      .addSelect('baseline.name', 'baseline_name')
      .addSelect('baseline.status', 'baseline_status')
      .addSelect('baseline.isCurrent', 'baseline_is_current')
      .addSelect('baseline.capturedAt', 'baseline_captured_at')
      .addSelect('capturedBy.id', 'captured_by_id')
      .addSelect('capturedBy.firstName', 'captured_by_first_name')
      .addSelect('capturedBy.lastName', 'captured_by_last_name')
      .addSelect('COUNT(task.id)::int', 'task_count')
      .addSelect(
        `COUNT(task.id) FILTER (WHERE task.taskKind = :milestoneKind)::int`,
        'milestone_count',
      )
      .addSelect(
        `COUNT(task.id) FILTER (
          WHERE task.taskKind <> :summaryKind
            AND (task.plannedStartDate IS NULL OR task.plannedEndDate IS NULL)
        )::int`,
        'unscheduled_executable_task_count',
      )
      .addSelect(
        `MIN(task.plannedStartDate) FILTER (
          WHERE task.taskKind <> :summaryKind
            AND task.plannedStartDate IS NOT NULL
        )`,
        'project_start_date',
      )
      .addSelect(
        `MAX(task.plannedEndDate) FILTER (
          WHERE task.taskKind <> :summaryKind
            AND task.plannedEndDate IS NOT NULL
        )`,
        'project_finish_date',
      )
      .where('baseline.id IN (:...baselineIds)', { baselineIds })
      .setParameters({
        milestoneKind: TaskKind.Milestone,
        summaryKind: TaskKind.Summary,
      })
      .groupBy('baseline.id')
      .addGroupBy('capturedBy.id')
      .getRawMany<BaselineSummaryRow>();

    return new Map(
      rows.map((row) => {
        const summary = this.mapBaselineSummary(row);
        return [summary.id, summary];
      }),
    );
  }

  private async loadForecastSummaries(
    manager: EntityManager,
    snapshots: PlanningScheduleSnapshot[],
    currentSnapshotId: string | null,
  ): Promise<Map<string, ForecastSummaryDto>> {
    const snapshotIds = [...new Set(snapshots.map(({ id }) => id))];
    if (snapshotIds.length === 0) {
      return new Map();
    }
    const rows = await this.createForecastSummaryQuery(manager)
      .andWhere('snapshot.id IN (:...snapshotIds)', { snapshotIds })
      .getRawMany<ForecastSummaryRow>();
    return new Map(
      rows.map((row) => {
        const summary = this.mapForecastSummary(row, currentSnapshotId);
        return [summary.snapshotId, summary];
      }),
    );
  }

  private createForecastSummaryQuery(manager: EntityManager) {
    return manager
      .getRepository(PlanningScheduleSnapshot)
      .createQueryBuilder('snapshot')
      .leftJoin(
        PlanningTaskSchedule,
        'schedule',
        'schedule.snapshotId = snapshot.id AND schedule.deletedAt IS NULL',
      )
      .leftJoin(User, 'generatedBy', 'generatedBy.id = snapshot.createdById')
      .select('snapshot.id', 'snapshot_id')
      .addSelect('snapshot.projectId', 'project_id')
      .addSelect('snapshot.scheduleVersion', 'schedule_version')
      .addSelect('snapshot.calculationStatus', 'calculation_status')
      .addSelect('snapshot.calculatedAt', 'calculated_at')
      .addSelect('snapshot.scheduleAnchorDate', 'schedule_anchor_date')
      .addSelect('snapshot.projectStartDate', 'project_start_date')
      .addSelect('snapshot.projectFinishDate', 'project_finish_date')
      .addSelect('generatedBy.id', 'generated_by_id')
      .addSelect('generatedBy.firstName', 'generated_by_first_name')
      .addSelect('generatedBy.lastName', 'generated_by_last_name')
      .addSelect('COUNT(schedule.id)::int', 'task_count')
      .addSelect(
        `COUNT(schedule.id) FILTER (
          WHERE schedule.taskKind = :milestoneKind
        )::int`,
        'milestone_count',
      )
      .addSelect(
        `COUNT(schedule.id) FILTER (
          WHERE schedule.taskKind <> :summaryKind AND schedule.isCritical = true
        )::int`,
        'critical_task_count',
      )
      .addSelect(
        `COUNT(schedule.id) FILTER (
          WHERE schedule.taskKind <> :summaryKind
            AND (
              schedule.scheduledStartDate IS NULL
              OR schedule.scheduledEndDate IS NULL
            )
        )::int`,
        'unscheduled_executable_task_count',
      )
      .where('snapshot.deletedAt IS NULL')
      .setParameters({
        milestoneKind: TaskKind.Milestone,
        summaryKind: TaskKind.Summary,
      })
      .groupBy('snapshot.id')
      .addGroupBy('generatedBy.id');
  }

  private mapBaselineSummary(row: BaselineSummaryRow): BaselineSummaryDto {
    return {
      capturedAt: this.toIsoString(row.baseline_captured_at)!,
      capturedBy: row.captured_by_id
        ? {
            id: row.captured_by_id,
            name: this.toUserName(
              row.captured_by_first_name,
              row.captured_by_last_name,
            ),
          }
        : null,
      id: row.baseline_id,
      isCurrent: row.baseline_is_current,
      milestoneCount: Number(row.milestone_count),
      name: row.baseline_name,
      projectFinishDate: this.toDateString(row.project_finish_date),
      projectId: row.baseline_project_id,
      projectStartDate: this.toDateString(row.project_start_date),
      status: row.baseline_status,
      taskCount: Number(row.task_count),
      unscheduledExecutableTaskCount: Number(
        row.unscheduled_executable_task_count,
      ),
      versionNumber: Number(row.baseline_version_number),
    };
  }

  private mapForecastSummary(
    row: ForecastSummaryRow,
    currentSnapshotId: string | null,
  ): ForecastSummaryDto {
    return {
      calculatedAt: this.toIsoString(row.calculated_at),
      calculationStatus: row.calculation_status,
      criticalTaskCount: Number(row.critical_task_count),
      generatedBy: row.generated_by_id
        ? {
            id: row.generated_by_id,
            name: this.toUserName(
              row.generated_by_first_name,
              row.generated_by_last_name,
            ),
          }
        : null,
      isCurrent: row.snapshot_id === currentSnapshotId,
      milestoneCount: Number(row.milestone_count),
      projectFinishDate: this.toDateString(row.project_finish_date),
      projectId: row.project_id,
      projectStartDate: this.toDateString(row.project_start_date),
      scheduleAnchorDate: this.toDateString(row.schedule_anchor_date),
      scheduleVersion: Number(row.schedule_version),
      snapshotId: row.snapshot_id,
      taskCount: Number(row.task_count),
      unscheduledExecutableTaskCount: Number(
        row.unscheduled_executable_task_count,
      ),
    };
  }

  private mapForecastSnapshotTaskSchedule(
    row: ForecastSnapshotTaskScheduleRow,
  ): ForecastSnapshotTaskScheduleDto {
    return {
      durationDays:
        row.duration_days === null ? null : Number(row.duration_days),
      isCritical: row.is_critical,
      milestoneCategory: row.milestone_category,
      parentTaskId: row.parent_task_id,
      scheduledEndDate: this.toDateString(row.scheduled_end_date),
      scheduledStartDate: this.toDateString(row.scheduled_start_date),
      sequenceNumber:
        row.sequence_number === null ? null : Number(row.sequence_number),
      taskId: row.task_id,
      taskKind: row.task_kind,
      taskTitle: row.task_title,
    };
  }

  private toBoolean(value: boolean | string): boolean {
    return value === true || value === 'true';
  }

  private toIsoString(value: Date | string | null): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  }

  private toDateString(value: Date | string | null): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toUserName(firstName: string | null, lastName: string | null) {
    return `${firstName ?? ''} ${lastName ?? ''}`.trim();
  }
}
