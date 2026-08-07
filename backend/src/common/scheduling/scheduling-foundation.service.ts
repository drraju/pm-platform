import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskDependencyType } from '../enums/task-dependency-type.enum';
import { MilestoneCategory } from '../enums/milestone-category.enum';
import { TaskKind } from '../enums/task-kind.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskType } from '../enums/task-type.enum';
import { applyTaskCompletionTransition } from './task-completion-transition';

type TaskTypeInput = {
  milestoneCategory?: MilestoneCategory | string | null;
  summaryCategory?: string | null;
  taskKind?: TaskKind | string | null;
  taskType?: TaskType | string | null;
};

type TaskMutationInput = TaskTypeInput & {
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  durationDays?: number | null;
  estimatedHours?: number | null;
  milestoneCategory?: MilestoneCategory | string | null;
  percentComplete?: number | null;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  remainingHours?: number | null;
  startDate?: string | null;
  status?: TaskStatus | null;
};

type ScheduleMutationInput = {
  durationDays?: number | null;
  milestoneCategory?: MilestoneCategory | string | null;
  ownerId?: string | null;
  percentComplete?: number | null;
  plannedFinishDate?: string | null;
  plannedStartDate?: string | null;
  status?: TaskStatus | null;
};

type RollupSchedule = {
  durationDays?: number | null;
  parentTaskId?: string | null;
  percentComplete?: number | string | null;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  task?: {
    percentComplete?: number | string | null;
    plannedEndDate?: string | null;
    plannedStartDate?: string | null;
    status?: TaskStatus | string | null;
  } | null;
  taskId: string;
  taskKind?: TaskKind | string | null;
};

type DependencyEndpoint = {
  deletedAt?: Date | string | null;
  id: string;
  taskKind?: TaskKind | string | null;
};

type DependencyEdge = {
  id?: string | null;
  predecessorTaskId: string;
  successorTaskId: string;
};

type DependencyValidationInput = {
  dependencyType: TaskDependencyType | string;
  predecessorTaskId: string;
  successorTaskId: string;
};

type DependencyValidationContext = {
  dependencies: DependencyEdge[];
  existingDependencyId?: string | null;
  predecessorTask?: DependencyEndpoint | null;
  projectId: string;
  successorTask?: DependencyEndpoint | null;
};

export type SummaryRollupResult<T extends RollupSchedule> = {
  changedSummaries: T[];
  schedules: T[];
};

@Injectable()
export class SchedulingFoundationService {
  private readonly supportedDependencyMutationTypes = new Set<string>([
    TaskDependencyType.FinishToStart,
    TaskDependencyType.StartToStart,
    TaskDependencyType.FinishToFinish,
  ]);

  normalizeTaskKind(
    input: TaskTypeInput,
    fallback = TaskKind.Standard,
  ): TaskKind {
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
  ): Omit<T, 'taskType' | 'summaryCategory'> & {
    milestoneCategory?: MilestoneCategory | null;
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

    const milestoneCategory = this.normalizeMilestoneCategoryForKind(
      taskKind,
      input.milestoneCategory,
      existingTask?.milestoneCategory,
    );
    if (typeof milestoneCategory !== 'undefined') {
      normalizedInput.milestoneCategory = milestoneCategory;
    }
    this.validateTaskTypeTransition(taskKind, existingTask);
    this.validateSummaryTaskMutation(taskKind, normalizedInput);
    this.normalizeMilestoneTaskDates(taskKind, normalizedInput, existingTask);
    this.normalizeMilestoneLifecycle(taskKind, normalizedInput, existingTask);
    this.validateTaskDateConsistency(taskKind, normalizedInput, existingTask);

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
      throw new BadRequestException(
        'Summary tasks cannot be assigned to a user',
      );
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
      milestoneCategory?: MilestoneCategory | string | null;
      plannedEndDate?: string | null;
      plannedStartDate?: string | null;
    },
  ) {
    const normalizedTaskKind = this.mapTaskKind(taskKind);
    this.validateSummaryScheduleMutation(normalizedTaskKind, input);
    this.validateMilestoneScheduleMutation(normalizedTaskKind, input);
    const milestoneCategory = this.normalizeMilestoneCategoryForKind(
      normalizedTaskKind,
      input.milestoneCategory,
      existingSchedule.milestoneCategory,
    );

    if (normalizedTaskKind === TaskKind.Milestone) {
      return {
        ...this.normalizeMilestoneScheduleMutation(input, existingSchedule),
        milestoneCategory,
      };
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
      milestoneCategory,
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

  rollupSummarySchedules<T extends RollupSchedule>(
    schedules: T[],
  ): SummaryRollupResult<T> {
    const byTaskId = new Map(
      schedules.map((schedule) => [schedule.taskId, schedule]),
    );
    const childrenByParentId = new Map<string, T[]>();
    schedules.forEach((schedule) => {
      if (!schedule.parentTaskId) {
        return;
      }
      childrenByParentId.set(schedule.parentTaskId, [
        ...(childrenByParentId.get(schedule.parentTaskId) ?? []),
        schedule,
      ]);
    });

    const summaryIds = schedules
      .filter(
        (schedule) =>
          this.mapTaskKind(schedule.taskKind ?? TaskKind.Standard) ===
          TaskKind.Summary,
      )
      .map((schedule) => schedule.taskId);
    const changedSummaries: T[] = [];
    const visited = new Set<string>();

    const rollupSummary = (taskId: string): void => {
      if (visited.has(taskId)) {
        return;
      }
      visited.add(taskId);

      const schedule = byTaskId.get(taskId);
      if (!schedule) {
        return;
      }

      const children = childrenByParentId.get(taskId) ?? [];
      children
        .filter(
          (child) =>
            this.mapTaskKind(child.taskKind ?? TaskKind.Standard) ===
            TaskKind.Summary,
        )
        .forEach((child) => rollupSummary(child.taskId));

      if (children.length === 0) {
        return;
      }

      const descendants = this.getDescendants(taskId, childrenByParentId);
      const executableDescendants = descendants.filter(
        (descendant) =>
          this.mapTaskKind(descendant.taskKind ?? TaskKind.Standard) !==
          TaskKind.Summary,
      );
      const plannedStartDate = this.findEarliestDate(
        executableDescendants.map((descendant) => descendant.plannedStartDate),
      );
      const plannedEndDate = this.findLatestDate(
        executableDescendants.map((descendant) => descendant.plannedEndDate),
      );
      const durationDays = this.calculateDurationDays(
        plannedStartDate,
        plannedEndDate,
      );
      const percentComplete = this.calculateWeightedProgress(
        executableDescendants,
      );
      const status = this.deriveSummaryStatus(children);
      const changed =
        schedule.plannedStartDate !== plannedStartDate ||
        schedule.plannedEndDate !== plannedEndDate ||
        schedule.durationDays !== durationDays ||
        Number(schedule.percentComplete ?? 0) !== percentComplete ||
        schedule.task?.plannedStartDate !== plannedStartDate ||
        schedule.task?.plannedEndDate !== plannedEndDate ||
        Number(
          schedule.task?.percentComplete ?? schedule.percentComplete ?? 0,
        ) !== percentComplete ||
        (status !== null && schedule.task?.status !== status);

      schedule.plannedStartDate = plannedStartDate;
      schedule.plannedEndDate = plannedEndDate;
      schedule.durationDays = durationDays;
      schedule.percentComplete = percentComplete;
      if (schedule.task) {
        schedule.task.plannedStartDate = plannedStartDate;
        schedule.task.plannedEndDate = plannedEndDate;
        schedule.task.percentComplete = percentComplete;
        if (status !== null) {
          schedule.task.status = status;
        }
      }

      if (changed) {
        changedSummaries.push(schedule);
      }
    };

    summaryIds.forEach(rollupSummary);

    return {
      changedSummaries,
      schedules,
    };
  }

  validateTaskDependency(
    input: DependencyValidationInput,
    context: DependencyValidationContext,
  ) {
    this.validateDependencyType(input.dependencyType);

    if (input.predecessorTaskId === input.successorTaskId) {
      throw new BadRequestException(
        'A task dependency cannot reference the same task twice',
      );
    }

    this.validateDependencyEndpoint(
      input.predecessorTaskId,
      context.predecessorTask,
      context.projectId,
      'predecessor',
    );
    this.validateDependencyEndpoint(
      input.successorTaskId,
      context.successorTask,
      context.projectId,
      'successor',
    );

    const activeDependencies = context.dependencies.filter(
      (dependency) => dependency.id !== context.existingDependencyId,
    );
    const duplicateDependency = activeDependencies.find(
      (dependency) =>
        dependency.predecessorTaskId === input.predecessorTaskId &&
        dependency.successorTaskId === input.successorTaskId,
    );
    if (duplicateDependency) {
      throw new ConflictException(
        'An active dependency already exists between these tasks',
      );
    }

    if (
      this.createsDependencyCycle(
        activeDependencies,
        input.predecessorTaskId,
        input.successorTaskId,
      )
    ) {
      throw new BadRequestException(
        'Task dependencies cannot contain circular relationships',
      );
    }
  }

  private normalizeMilestoneTaskDates(
    taskKind: TaskKind,
    input: Partial<TaskMutationInput>,
    existingTask?: TaskMutationInput,
  ) {
    if (taskKind !== TaskKind.Milestone) {
      return;
    }

    if (
      typeof input.durationDays !== 'undefined' &&
      input.durationDays !== null &&
      input.durationDays !== 0
    ) {
      throw new BadRequestException('Milestone duration is always zero');
    }
    input.durationDays = 0;

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
      input.durationDays !== null
    ) {
      if (input.durationDays < 0) {
        throw new BadRequestException('Milestone duration cannot be negative');
      }
      if (input.durationDays !== 0) {
        throw new BadRequestException('Milestone duration is always zero');
      }
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

    if (
      plannedStartDate &&
      plannedEndDate &&
      plannedStartDate !== plannedEndDate
    ) {
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
      throw new BadRequestException(
        'Summary tasks cannot be assigned to a user',
      );
    }

    if (typeof input.status !== 'undefined') {
      throw new BadRequestException(
        'Summary task status is calculated from child work',
      );
    }
  }

  private normalizeMilestoneLifecycle(
    taskKind: TaskKind,
    input: Partial<TaskMutationInput>,
    existingTask?: TaskMutationInput,
  ) {
    if (taskKind !== TaskKind.Milestone) {
      return;
    }

    const nextStatus =
      input.status ?? existingTask?.status ?? TaskStatus.Backlog;
    const wasComplete = existingTask?.status === TaskStatus.Done;

    if (nextStatus === TaskStatus.Done) {
      Object.assign(
        input,
        applyTaskCompletionTransition(input, existingTask, {
          completionDateRequiredMessage:
            'Milestone completion requires an actual or planned date',
          resolveCompletionDate: (nextInput, currentTask) =>
            nextInput.actualEndDate ??
            nextInput.actualStartDate ??
            currentTask?.actualEndDate ??
            currentTask?.actualStartDate ??
            nextInput.plannedEndDate ??
            currentTask?.plannedEndDate,
          syncActualStartDateToCompletionDate: true,
        }),
      );
      return;
    }

    if (input.percentComplete !== undefined && input.percentComplete !== 0) {
      throw new BadRequestException(
        'Incomplete milestones must have zero percent complete',
      );
    }

    input.percentComplete = 0;
    if (wasComplete) {
      input.actualStartDate = null;
      input.actualEndDate = null;
    }
  }

  private validateTaskDateConsistency(
    taskKind: TaskKind,
    input: Partial<TaskMutationInput>,
    existingTask?: TaskMutationInput,
  ) {
    const plannedStartDate =
      input.plannedStartDate === undefined
        ? existingTask?.plannedStartDate
        : input.plannedStartDate;
    const plannedEndDate =
      input.plannedEndDate === undefined
        ? existingTask?.plannedEndDate
        : input.plannedEndDate;
    const actualStartDate =
      input.actualStartDate === undefined
        ? existingTask?.actualStartDate
        : input.actualStartDate;
    const actualEndDate =
      input.actualEndDate === undefined
        ? existingTask?.actualEndDate
        : input.actualEndDate;

    this.validateDateOrder(plannedStartDate, plannedEndDate);
    this.validateDateOrder(actualStartDate, actualEndDate, 'actual');

    if (
      taskKind === TaskKind.Milestone &&
      actualStartDate &&
      actualEndDate &&
      actualStartDate !== actualEndDate
    ) {
      throw new BadRequestException(
        'Milestones must have matching actual start and end dates',
      );
    }
  }

  private validateMilestoneScheduleMutation(
    taskKind: TaskKind,
    input: ScheduleMutationInput,
  ) {
    if (taskKind !== TaskKind.Milestone) {
      return;
    }

    if (typeof input.percentComplete !== 'undefined') {
      throw new BadRequestException(
        'Milestone progress is determined by scheduling state',
      );
    }

    if (typeof input.status !== 'undefined') {
      throw new BadRequestException(
        'Milestone status is determined by scheduling state',
      );
    }
  }

  private normalizeMilestoneCategoryForKind(
    taskKind: TaskKind,
    inputCategory?: MilestoneCategory | string | null,
    existingCategory?: MilestoneCategory | string | null,
  ): MilestoneCategory | null | undefined {
    if (taskKind !== TaskKind.Milestone) {
      if (typeof inputCategory !== 'undefined' && inputCategory !== null) {
        throw new BadRequestException(
          'Milestone category can only be set on milestone tasks',
        );
      }
      return typeof existingCategory === 'undefined' ? undefined : null;
    }

    return this.normalizeMilestoneCategory(
      inputCategory ?? existingCategory ?? MilestoneCategory.Standard,
    );
  }

  private validateTaskTypeTransition(
    taskKind: TaskKind,
    existingTask?: TaskMutationInput,
  ) {
    if (!existingTask?.taskKind) {
      return;
    }

    const existingTaskKind = this.mapTaskKind(existingTask.taskKind);
    if (
      existingTaskKind === TaskKind.Milestone &&
      taskKind === TaskKind.Summary
    ) {
      throw new BadRequestException(
        'Milestone-to-summary conversion requires a validated summary conversion workflow',
      );
    }
  }

  private normalizeMilestoneCategory(
    value: MilestoneCategory | string,
  ): MilestoneCategory {
    const normalizedValue = String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    switch (normalizedValue) {
      case MilestoneCategory.Standard:
        return MilestoneCategory.Standard;
      case MilestoneCategory.Release:
        return MilestoneCategory.Release;
      case MilestoneCategory.Drop:
        return MilestoneCategory.Drop;
      case MilestoneCategory.GoLive:
      case 'golive':
      case 'go-live':
        return MilestoneCategory.GoLive;
      case MilestoneCategory.Decision:
        return MilestoneCategory.Decision;
      default:
        throw new BadRequestException(
          `Unsupported milestone category ${value}`,
        );
    }
  }

  private getDescendants<T extends RollupSchedule>(
    taskId: string,
    childrenByParentId: Map<string, T[]>,
  ): T[] {
    return (childrenByParentId.get(taskId) ?? []).flatMap((child) => [
      child,
      ...this.getDescendants(child.taskId, childrenByParentId),
    ]);
  }

  private calculateWeightedProgress(schedules: RollupSchedule[]): number {
    const weighted = schedules.reduce(
      (accumulator, schedule) => {
        const durationDays = this.getPlannedDuration(schedule);
        if (durationDays <= 0) {
          return accumulator;
        }
        return {
          totalWeight: accumulator.totalWeight + durationDays,
          weightedProgress:
            accumulator.weightedProgress +
            durationDays * this.normalizePercent(schedule.percentComplete),
        };
      },
      { totalWeight: 0, weightedProgress: 0 },
    );

    if (weighted.totalWeight === 0) {
      return 0;
    }

    return Math.round(weighted.weightedProgress / weighted.totalWeight);
  }

  private getPlannedDuration(schedule: RollupSchedule): number {
    if (typeof schedule.durationDays === 'number') {
      return Math.max(0, schedule.durationDays);
    }
    return Math.max(
      0,
      this.calculateDurationDays(
        schedule.plannedStartDate,
        schedule.plannedEndDate,
      ) ?? 0,
    );
  }

  private deriveSummaryStatus(children: RollupSchedule[]): TaskStatus | null {
    if (children.length === 0) {
      return null;
    }

    const statuses = children
      .map((child) => child.task?.status)
      .filter((status): status is TaskStatus =>
        Object.values(TaskStatus).includes(status as TaskStatus),
      );

    if (statuses.length === 0) {
      return TaskStatus.Todo;
    }

    if (statuses.every((status) => status === TaskStatus.Done)) {
      return TaskStatus.Done;
    }

    if (
      statuses.every(
        (status) => status === TaskStatus.Backlog || status === TaskStatus.Todo,
      )
    ) {
      return TaskStatus.Todo;
    }

    return TaskStatus.InProgress;
  }

  private findEarliestDate(values: Array<string | null | undefined>) {
    const dates = values.filter((value): value is string => Boolean(value));
    if (dates.length === 0) {
      return null;
    }

    return dates.reduce((earliestDate, currentDate) =>
      currentDate < earliestDate ? currentDate : earliestDate,
    );
  }

  private findLatestDate(values: Array<string | null | undefined>) {
    const dates = values.filter((value): value is string => Boolean(value));
    if (dates.length === 0) {
      return null;
    }

    return dates.reduce((latestDate, currentDate) =>
      currentDate > latestDate ? currentDate : latestDate,
    );
  }

  private normalizePercent(value?: number | string | null): number {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : 0;
    return Number.isFinite(numericValue)
      ? Math.min(100, Math.max(0, numericValue))
      : 0;
  }

  private validateDateOrder(
    startDate?: string | null,
    endDate?: string | null,
    dateType: 'planned' | 'actual' = 'planned',
  ) {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException(
        `${dateType === 'actual' ? 'Actual' : 'Planned'} finish date cannot be before ${dateType} start date`,
      );
    }
  }

  private validateDependencyType(dependencyType: TaskDependencyType | string) {
    if (this.supportedDependencyMutationTypes.has(dependencyType)) {
      return;
    }

    throw new BadRequestException(
      `Unsupported dependency type ${dependencyType}`,
    );
  }

  private validateDependencyEndpoint(
    taskId: string,
    task: DependencyEndpoint | null | undefined,
    projectId: string,
    role: 'predecessor' | 'successor',
  ) {
    if (!task || task.deletedAt) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }

    if (
      this.mapTaskKind(task.taskKind ?? TaskKind.Standard) === TaskKind.Summary
    ) {
      throw new BadRequestException(
        `Summary tasks cannot be dependency ${role} endpoints`,
      );
    }
  }

  private createsDependencyCycle(
    dependencies: DependencyEdge[],
    predecessorTaskId: string,
    successorTaskId: string,
  ) {
    const successorsByTaskId = new Map<string, string[]>();

    for (const dependency of dependencies) {
      successorsByTaskId.set(dependency.predecessorTaskId, [
        ...(successorsByTaskId.get(dependency.predecessorTaskId) ?? []),
        dependency.successorTaskId,
      ]);
    }

    successorsByTaskId.set(predecessorTaskId, [
      ...(successorsByTaskId.get(predecessorTaskId) ?? []),
      successorTaskId,
    ]);

    const visited = new Set<string>();
    const stack = [successorTaskId];

    while (stack.length > 0) {
      const currentTaskId = stack.pop();
      if (!currentTaskId || visited.has(currentTaskId)) {
        continue;
      }

      if (currentTaskId === predecessorTaskId) {
        return true;
      }

      visited.add(currentTaskId);
      stack.push(...(successorsByTaskId.get(currentTaskId) ?? []));
    }

    return false;
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
  ): Omit<T, 'taskType' | 'summaryCategory'> & {
    milestoneCategory?: MilestoneCategory | null;
    taskKind?: TaskKind;
  } {
    const {
      summaryCategory: _summaryCategory,
      taskType: _taskType,
      ...normalizedInput
    } = input;
    return normalizedInput as Omit<T, 'taskType' | 'summaryCategory'> & {
      milestoneCategory?: MilestoneCategory | null;
      taskKind?: TaskKind;
    };
  }
}
