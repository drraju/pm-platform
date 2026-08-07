import { BadRequestException } from '@nestjs/common';
import { TaskStatus } from '../enums/task-status.enum';

export type TaskCompletionTransitionInput = {
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  percentComplete?: number | null;
  plannedEndDate?: string | null;
  status?: TaskStatus | null;
};

export type TaskCompletionTransitionOptions = {
  completionDateRequiredMessage?: string;
  resolveCompletionDate?: (
    input: TaskCompletionTransitionInput,
    existingTask: TaskCompletionTransitionInput | undefined,
    getDefaultCompletionDate: () => string,
  ) => string | null | undefined;
  syncActualStartDateToCompletionDate?: boolean;
};

export function applyTaskCompletionTransition<
  T extends TaskCompletionTransitionInput,
>(
  input: T,
  existingTask?: TaskCompletionTransitionInput,
  options: TaskCompletionTransitionOptions = {},
): T {
  const normalizedInput = { ...input };

  if (normalizedInput.percentComplete === 100) {
    normalizedInput.status = TaskStatus.Done;
  }

  if (normalizedInput.status === TaskStatus.Done) {
    normalizedInput.percentComplete = 100;
    const completionDate = (
      options.resolveCompletionDate ?? resolveCompletionDate
    )(normalizedInput, existingTask, getLocalDate);
    if (!completionDate) {
      throw new BadRequestException(
        options.completionDateRequiredMessage ??
          'Task completion requires a completion date',
      );
    }
    normalizedInput.actualEndDate = completionDate;
    if (options.syncActualStartDateToCompletionDate) {
      normalizedInput.actualStartDate = completionDate;
    }
    validateCompletionDate(normalizedInput, existingTask);
  }

  return normalizedInput;
}

function resolveCompletionDate(
  input: TaskCompletionTransitionInput,
  existingTask: TaskCompletionTransitionInput | undefined,
  getDefaultCompletionDate: () => string,
) {
  if (input.actualEndDate) {
    return input.actualEndDate;
  }

  if (existingTask?.actualEndDate) {
    return existingTask.actualEndDate;
  }

  return getDefaultCompletionDate();
}

function validateCompletionDate(
  input: TaskCompletionTransitionInput,
  existingTask?: TaskCompletionTransitionInput,
) {
  const actualStartDate =
    input.actualStartDate === undefined
      ? existingTask?.actualStartDate
      : input.actualStartDate;

  if (
    actualStartDate &&
    input.actualEndDate &&
    input.actualEndDate < actualStartDate
  ) {
    throw new BadRequestException(
      'Task cannot be completed before its actual start date',
    );
  }
}

function getLocalDate() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}
