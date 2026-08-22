import { Injectable } from '@nestjs/common';
import { signedUtcCalendarDayDifference } from '../../common/dates/signed-utc-calendar-day-difference';
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
    const forecastDate = schedule?.scheduledEndDate ?? null;
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
      daysRemaining: signedUtcCalendarDayDifference(forecastDate, today),
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
      varianceDays: signedUtcCalendarDayDifference(forecastDate, baselineDate),
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
}
