import { Injectable } from '@nestjs/common';
import { MilestoneCategory } from '../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { PlanningScheduleSnapshot } from '../planning/entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from '../planning/entities/planning-task-schedule.entity';
import { ProjectBaselineTask } from '../projects/entities/project-baseline-task.entity';
import { Task } from './entities/task.entity';
import { MilestoneProjection, MilestoneState } from './milestone-projection';

export type MilestoneProjectionInput = {
  baselineTask?: ProjectBaselineTask | null;
  schedule?: PlanningTaskSchedule | null;
  snapshot?: PlanningScheduleSnapshot | null;
  task: Task;
};

@Injectable()
export class MilestoneProjectionComposer {
  compose(
    input: MilestoneProjectionInput,
    today = new Date().toISOString().slice(0, 10),
  ): MilestoneProjection {
    const { baselineTask, schedule, snapshot, task } = input;
    const plannedDate = task.plannedEndDate ?? task.dueDate ?? null;
    const forecastDate =
      schedule?.scheduledEndDate ?? schedule?.plannedEndDate ?? plannedDate;
    const actualDate = task.actualEndDate ?? task.actualStartDate ?? null;
    const baselineDate = baselineTask?.plannedEndDate ?? null;
    const state = this.calculateState(task, forecastDate, today);

    return {
      actualDate,
      baselineDate,
      calculatedAt: snapshot?.calculatedAt ?? null,
      calculationStatus:
        snapshot?.calculationStatus ?? PlanningCalculationStatus.Pending,
      category:
        task.milestoneCategory ??
        schedule?.milestoneCategory ??
        MilestoneCategory.Standard,
      critical: Boolean(
        schedule?.isCritical ||
        snapshot?.criticalPathTaskIds?.includes(task.id),
      ),
      daysRemaining: this.daysBetween(today, forecastDate),
      forecastDate,
      id: task.id,
      overdue: state === 'overdue',
      owner: task.assignee
        ? {
            id: task.assignee.id,
            name: `${task.assignee.firstName} ${task.assignee.lastName}`.trim(),
          }
        : null,
      plannedDate,
      projectId: task.projectId,
      state,
      taskId: task.id,
      taskStatus: task.status,
      title: task.title,
      varianceDays: this.daysBetween(baselineDate, forecastDate),
    };
  }

  private calculateState(
    task: Task,
    forecastDate: string | null,
    today: string,
  ): MilestoneState {
    if (task.deletedAt) {
      return 'cancelled';
    }
    if (task.status === TaskStatus.Done) {
      return 'completed';
    }
    if (!forecastDate) {
      return 'unscheduled';
    }
    return forecastDate < today ? 'overdue' : 'upcoming';
  }

  private daysBetween(
    startDate?: string | null,
    endDate?: string | null,
  ): number | null {
    if (!startDate || !endDate) {
      return null;
    }
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }
    return Math.round((end - start) / 86_400_000);
  }
}
