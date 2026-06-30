import { BadRequestException, Injectable } from '@nestjs/common';
import { TaskKind } from '../enums/task-kind.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskType } from '../enums/task-type.enum';

type TaskTypeInput = {
  milestoneCategory?: string | null;
  summaryCategory?: string | null;
  taskKind?: TaskKind | string | null;
  taskType?: TaskType | string | null;
};

type TaskMutationInput = TaskTypeInput & {
  assigneeId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  percentComplete?: number | null;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  remainingHours?: number | null;
  startDate?: string | null;
  status?: TaskStatus | null;
};

type ScheduleMutationInput = {
  durationDays?: number | null;
  ownerId?: string | null;
  percentComplete?: number | null;
  plannedFinishDate?: string | null;
  plannedStartDate?: string | null;
  status?: TaskStatus | null;
};

@Injectable()
export class SchedulingFoundationService {
  normalizeTaskKind(input: TaskTypeInput, fallback = TaskKind.Standard): TaskKind {
    if (input.taskKind) {
      return this.mapTaskKind(input.taskKind);
    }

    if (input.taskType) {
      return this.mapTaskTypeToKind(input.taskType);
    }

    return fallback;
  }

  toTaskType(taskKind?: TaskKind | string | null): TaskType {
    const normalizedKind = this.mapTaskKind(taskKind ?? TaskKind.Standard);
    if (normalizedKind === TaskKind.Summary) {
      return TaskType.Summary;
    }
    if (normalizedKind === TaskKind.Milestone) {
      return TaskType.Milestone;
    }
    return TaskType.Task;
  }

  normalizeTaskMutation<T extends TaskMutationInput>(
    input: T,
    existingTask?: TaskMutationInput,
  ): Omit<T, 'taskType' | 'summaryCategory' | 'milestoneCategory'> & {
    taskKind?: TaskKind;
  } {
    const taskKind = this.normalizeTaskKind(
      input,
      existingTask?.taskKind
        ? this.mapTaskKind(existingTask.taskKind)
        : TaskKind.Standard,
    );
    const normalizedInput = this.stripCompatibilityFields(input);

    if (input.taskKind !== undefined || input.taskType !== undefined) {
      normalizedInput.taskKind = taskKind;
    }

    this.validateSummaryTaskMutation(taskKind, normalizedInput);
    this.normalizeMilestoneTaskDates(taskKind, normalizedInput, existingTask);

    return normalizedInput;
  }

  validateSummaryTaskMutation(
    taskKind: TaskKind,
    input: Partial<TaskMutationInput>,
  ) {
    if (taskKind !== TaskKind.Summary) {
      return;
    }

    if (input.assigneeId) {
      throw new BadRequestException('Summary tasks cannot be assigned to a user');
    }

    if (typeof input.status !== 'undefined') {
      throw new BadRequestException(
        'Summary task status is calculated from child work',
      );
    }

    if (typeof input.percentComplete !== 'undefined') {
      throw new BadRequestException(
        'Summary task progress is calculated from child work',
      );
    }

    if (
      typeof input.plannedStartDate !== 'undefined' ||
      typeof input.plannedEndDate !== 'undefined' ||
      typeof input.startDate !== 'undefined' ||
      typeof input.dueDate !== 'undefined'
    ) {
      throw new BadRequestException(
        'Summary task dates are calculated from child work',
      );
    }

    if (
      typeof input.estimatedHours !== 'undefined' ||
      typeof input.remainingHours !== 'undefined'
    ) {
      throw new BadRequestException('Summary tasks cannot store effort values');
    }
  }

  normalizeScheduleMutation(
    taskKind: TaskKind | string,
    input: ScheduleMutationInput,
    existingSchedule: {
      durationDays?: number | null;
      plannedEndDate?: string | null;
      plannedStartDate?: string | null;
    },
  ) {
    const normalizedTaskKind = this.mapTaskKind(taskKind);
    this.validateSummaryScheduleMutation(normalizedTaskKind, input);

    if (normalizedTaskKind === TaskKind.Milestone) {
      return this.normalizeMilestoneScheduleMutation(input, existingSchedule);
    }

    const plannedStartDate =
      input.plannedStartDate === undefined
        ? existingSchedule.plannedStartDate
        : input.plannedStartDate;
    const plannedEndDate =
      input.plannedFinishDate === undefined
        ? existingSchedule.plannedEndDate
        : input.plannedFinishDate;
    const durationDays =
      input.durationDays === undefined
        ? input.plannedStartDate !== undefined ||
          input.plannedFinishDate !== undefined
          ? this.calculateDurationDays(plannedStartDate, plannedEndDate)
          : existingSchedule.durationDays
        : input.durationDays;
    const nextPlannedEndDate =
      input.plannedFinishDate === undefined &&
      input.durationDays !== undefined &&
      input.durationDays !== null &&
      plannedStartDate
        ? this.shiftDateString(plannedStartDate, input.durationDays)
        : plannedEndDate;

    this.validateDateOrder(plannedStartDate, nextPlannedEndDate);

    return {
      durationDays,
      plannedEndDate: nextPlannedEndDate,
      plannedStartDate,
    };
  }

  calculateDurationDays(
    plannedStartDate?: string | null,
    plannedEndDate?: string | null,
  ): number | null {
    if (!plannedStartDate || !plannedEndDate) {
      return null;
    }

    const startTime = new Date(`${plannedStartDate}T00:00:00Z`).getTime();
    const endTime = new Date(`${plannedEndDate}T00:00:00Z`).getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return null;
    }

    return Math.max(0, Math.round((endTime - startTime) / 86_400_000));
  }

  shiftDateString(value: string, days: number): string {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private normalizeMilestoneTaskDates(
    taskKind: TaskKind,
    input: Partial<TaskMutationInput>,
    existingTask?: TaskMutationInput,
  ) {
    if (taskKind !== TaskKind.Milestone) {
      return;
    }

    const hasStart = typeof input.plannedStartDate !== 'undefined';
    const hasEnd = typeof input.plannedEndDate !== 'undefined';
    const plannedStartDate = hasStart
      ? input.plannedStartDate
      : existingTask?.plannedStartDate;
    const plannedEndDate = hasEnd
      ? input.plannedEndDate
      : existingTask?.plannedEndDate;

    if (hasStart && hasEnd && plannedStartDate && plannedEndDate) {
      if (plannedStartDate !== plannedEndDate) {
        throw new BadRequestException(
          'Milestones must have matching planned start and end dates',
        );
      }
      return;
    }

    if (hasStart && plannedStartDate) {
      input.plannedEndDate = plannedStartDate;
      input.dueDate = plannedStartDate;
      return;
    }

    if (hasEnd && plannedEndDate) {
      input.plannedStartDate = plannedEndDate;
      input.startDate = plannedEndDate;
    }
  }

  private normalizeMilestoneScheduleMutation(
    input: ScheduleMutationInput,
    existingSchedule: {
      durationDays?: number | null;
      plannedEndDate?: string | null;
      plannedStartDate?: string | null;
    },
  ) {
    if (
      typeof input.durationDays !== 'undefined' &&
      input.durationDays !== null &&
      input.durationDays !== 0
    ) {
      throw new BadRequestException('Milestone duration is always zero');
    }

    const hasStart = typeof input.plannedStartDate !== 'undefined';
    const hasFinish = typeof input.plannedFinishDate !== 'undefined';
    const plannedStartDate = hasStart
      ? input.plannedStartDate
      : existingSchedule.plannedStartDate;
    const plannedEndDate = hasFinish
      ? input.plannedFinishDate
      : existingSchedule.plannedEndDate;

    if (hasStart && hasFinish && plannedStartDate && plannedEndDate) {
      if (plannedStartDate !== plannedEndDate) {
        throw new BadRequestException(
          'Milestones must have matching planned start and end dates',
        );
      }
      return {
        durationDays: 0,
        plannedEndDate,
        plannedStartDate,
      };
    }

    if (hasStart) {
      return {
        durationDays: 0,
        plannedEndDate: plannedStartDate,
        plannedStartDate,
      };
    }

    if (hasFinish) {
      return {
        durationDays: 0,
        plannedEndDate,
        plannedStartDate: plannedEndDate,
      };
    }

    if (plannedStartDate && plannedEndDate && plannedStartDate !== plannedEndDate) {
      throw new BadRequestException(
        'Milestones must have matching planned start and end dates',
      );
    }

    return {
      durationDays: 0,
      plannedEndDate,
      plannedStartDate,
    };
  }

  private validateSummaryScheduleMutation(
    taskKind: TaskKind,
    input: ScheduleMutationInput,
  ) {
    if (taskKind !== TaskKind.Summary) {
      return;
    }

    if (
      typeof input.plannedStartDate !== 'undefined' ||
      typeof input.plannedFinishDate !== 'undefined' ||
      typeof input.durationDays !== 'undefined'
    ) {
      throw new BadRequestException(
        'Summary task schedule is calculated from child work',
      );
    }

    if (typeof input.percentComplete !== 'undefined') {
      throw new BadRequestException(
        'Summary task progress is calculated from child work',
      );
    }

    if (typeof input.ownerId !== 'undefined') {
      throw new BadRequestException('Summary tasks cannot be assigned to a user');
    }

    if (typeof input.status !== 'undefined') {
      throw new BadRequestException(
        'Summary task status is calculated from child work',
      );
    }
  }

  private validateDateOrder(
    plannedStartDate?: string | null,
    plannedEndDate?: string | null,
  ) {
    if (plannedStartDate && plannedEndDate && plannedEndDate < plannedStartDate) {
      throw new BadRequestException(
        'Planned finish date cannot be before planned start date',
      );
    }
  }

  private mapTaskKind(value: TaskKind | string): TaskKind {
    if (value === TaskKind.Standard || value === TaskType.Task) {
      return TaskKind.Standard;
    }
    if (value === TaskKind.Summary) {
      return TaskKind.Summary;
    }
    if (value === TaskKind.Milestone) {
      return TaskKind.Milestone;
    }
    throw new BadRequestException(`Unsupported task type ${value}`);
  }

  private mapTaskTypeToKind(value: TaskType | string): TaskKind {
    if (value === TaskType.Task || value === TaskKind.Standard) {
      return TaskKind.Standard;
    }
    if (value === TaskType.Summary) {
      return TaskKind.Summary;
    }
    if (value === TaskType.Milestone) {
      return TaskKind.Milestone;
    }
    throw new BadRequestException(`Unsupported task type ${value}`);
  }

  private stripCompatibilityFields<T extends TaskTypeInput>(
    input: T,
  ): Omit<T, 'taskType' | 'summaryCategory' | 'milestoneCategory'> & {
    taskKind?: TaskKind;
  } {
    const {
      milestoneCategory: _milestoneCategory,
      summaryCategory: _summaryCategory,
      taskType: _taskType,
      ...normalizedInput
    } = input;
    return normalizedInput as Omit<
      T,
      'taskType' | 'summaryCategory' | 'milestoneCategory'
    > & {
      taskKind?: TaskKind;
    };
  }
}
