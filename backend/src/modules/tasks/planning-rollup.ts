import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';

export type PlanningTaskCounts = {
  milestones: number;
  phases: number;
  tasks: number;
};

type PlanningTaskLike = {
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  assignee?: unknown;
  assigneeId?: string | null;
  childTaskCount?: number;
  dueDate?: string | null;
  durationDays?: number | null;
  estimatedHours?: number | null;
  id: string;
  parentTaskId?: string | null;
  percentComplete?: number | null;
  phaseEndDate?: string | null;
  phaseProgress?: number | null;
  phaseStartDate?: string | null;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  remainingHours?: number | null;
  startDate?: string | null;
  status?: string;
  taskKind?: TaskKind | string | null;
};

export function countPlanningItems(
  tasks: readonly PlanningTaskLike[],
): PlanningTaskCounts {
  return tasks.reduce<PlanningTaskCounts>(
    (summary, task) => {
      if (isPhaseTask(task)) {
        summary.phases += 1;
        return summary;
      }

      if (task.taskKind === TaskKind.Milestone) {
        summary.milestones += 1;
        return summary;
      }

      summary.tasks += 1;
      return summary;
    },
    {
      milestones: 0,
      phases: 0,
      tasks: 0,
    },
  );
}

export function getOperationalTasks<T extends PlanningTaskLike>(
  tasks: readonly T[],
): T[] {
  return tasks.filter((task) => !isPhaseTask(task));
}

export function decoratePlanningTasks<T extends PlanningTaskLike>(
  tasks: readonly T[],
): Array<T & PhaseComputedFields> {
  const childrenByParentId = new Map<string | null, T[]>();
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId ?? null;
    const currentChildren = childrenByParentId.get(parentTaskId) ?? [];
    currentChildren.push(task);
    childrenByParentId.set(parentTaskId, currentChildren);
  }

  const descendantsCache = new Map<string, T[]>();

  function getDescendants(taskId: string): T[] {
    const cachedDescendants = descendantsCache.get(taskId);
    if (cachedDescendants) {
      return cachedDescendants;
    }

    const directChildren = childrenByParentId.get(taskId) ?? [];
    const nextDescendants = directChildren.flatMap((childTask) => [
      childTask,
      ...getDescendants(childTask.id),
    ]);
    descendantsCache.set(taskId, nextDescendants);
    return nextDescendants;
  }

  const effectiveTasksById = new Map<string, T>();
  for (const task of tasks) {
    const directSubtasks = (childrenByParentId.get(task.id) ?? []).filter(
      (childTask) => childTask.taskKind === TaskKind.Standard,
    );
    if (task.taskKind !== TaskKind.Standard || directSubtasks.length === 0) {
      effectiveTasksById.set(task.id, task);
      continue;
    }

    effectiveTasksById.set(task.id, {
      ...task,
      percentComplete: calculateSubtaskProgress(directSubtasks),
      status: deriveTaskStatusFromSubtasks(directSubtasks) ?? task.status,
    } as T);
  }

  return tasks.map((task) => {
    const directChildren = childrenByParentId.get(task.id) ?? [];
    const childTaskCount = directChildren.length;

    if (!isPhaseTask(task)) {
      const effectiveTask = effectiveTasksById.get(task.id) ?? task;
      return {
        ...effectiveTask,
        childTaskCount,
        phaseEndDate: null,
        phaseProgress: null,
        phaseStartDate: null,
      };
    }

    const descendants = getDescendants(task.id);
    const descendantWorkTasks = descendants.filter(
      (descendantTask) =>
        descendantTask.taskKind === TaskKind.Standard &&
        !hasStandardParent(descendantTask, tasksById),
    );
    const descendantDatedTasks = descendants.filter(
      (descendantTask) => !isPhaseTask(descendantTask),
    );
    const phaseProgress = calculateSummaryProgress(
      descendantWorkTasks,
      childrenByParentId,
      effectiveTasksById,
    );
    const phaseStartDate =
      findEarliestDate(
        descendantDatedTasks.map(
          (descendantTask) =>
            descendantTask.plannedStartDate ?? descendantTask.startDate ?? null,
        ),
      ) ??
      task.plannedStartDate ??
      task.startDate ??
      null;
    const phaseEndDate =
      findLatestDate(
        descendantDatedTasks.map(
          (descendantTask) =>
            descendantTask.plannedEndDate ?? descendantTask.dueDate ?? null,
        ),
      ) ??
      task.plannedEndDate ??
      task.dueDate ??
      null;

    return {
      ...task,
      assignee: null,
      assigneeId: null,
      childTaskCount,
      estimatedHours: null,
      phaseEndDate,
      phaseProgress,
      phaseStartDate,
      percentComplete: phaseProgress,
      plannedEndDate: phaseEndDate,
      plannedStartDate: phaseStartDate,
      remainingHours: null,
    };
  });
}

export function isPhaseTask(task: Pick<PlanningTaskLike, 'taskKind'>): boolean {
  return task.taskKind === TaskKind.Summary;
}

export type PhaseComputedFields = {
  childTaskCount: number;
  phaseEndDate: string | null;
  phaseProgress: number | null;
  phaseStartDate: string | null;
};

function findEarliestDate(
  values: Array<string | null | undefined>,
): string | null {
  const dates = values.filter((value): value is string => Boolean(value));
  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((earliestDate, currentDate) =>
    currentDate < earliestDate ? currentDate : earliestDate,
  );
}

function findLatestDate(
  values: Array<string | null | undefined>,
): string | null {
  const dates = values.filter((value): value is string => Boolean(value));
  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((latestDate, currentDate) =>
    currentDate > latestDate ? currentDate : latestDate,
  );
}

function normalizePercentComplete(value?: number | string | null): number {
  if (typeof value === 'number') {
    return clampPercentComplete(value);
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? clampPercentComplete(numericValue)
      : 0;
  }

  return 0;
}

function clampPercentComplete(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function hasStandardParent(
  task: PlanningTaskLike,
  tasksById: Map<string, PlanningTaskLike>,
) {
  if (!task.parentTaskId) {
    return false;
  }

  return tasksById.get(task.parentTaskId)?.taskKind === TaskKind.Standard;
}

function calculateSubtaskProgress(tasks: readonly PlanningTaskLike[]): number {
  const effortWeights = tasks.map((task) =>
    normalizePositiveNumber(task.estimatedHours),
  );
  if (effortWeights.every((weight) => weight > 0)) {
    return calculateWeightedAverage(tasks, effortWeights);
  }

  const durationWeights = tasks.map((task) =>
    normalizePositiveNumber(task.durationDays),
  );
  if (durationWeights.every((weight) => weight > 0)) {
    return calculateWeightedAverage(tasks, durationWeights);
  }

  if (tasks.length === 0) {
    return 0;
  }

  return Math.round(
    tasks.reduce(
      (total, task) => total + normalizePercentComplete(task.percentComplete),
      0,
    ) / tasks.length,
  );
}

function calculateWeightedAverage(
  tasks: readonly PlanningTaskLike[],
  weights: readonly number[],
) {
  const weighted = tasks.reduce(
    (accumulator, task, index) => {
      const weight = weights[index] ?? 0;
      return {
        totalWeight: accumulator.totalWeight + weight,
        weightedProgress:
          accumulator.weightedProgress +
          weight * normalizePercentComplete(task.percentComplete),
      };
    },
    { totalWeight: 0, weightedProgress: 0 },
  );

  if (weighted.totalWeight === 0) {
    return 0;
  }

  return Math.round(weighted.weightedProgress / weighted.totalWeight);
}

function calculateSummaryProgress<T extends PlanningTaskLike>(
  tasks: readonly T[],
  childrenByParentId: Map<string | null, T[]>,
  effectiveTasksById: Map<string, T>,
) {
  if (tasks.length === 0) {
    return 0;
  }

  const includesTaskParentsWithSubtasks = tasks.some((task) =>
    hasStandardChildren(task, childrenByParentId),
  );
  if (includesTaskParentsWithSubtasks) {
    const weights = tasks.map((task) =>
      getSummaryProgressWeight(task, childrenByParentId),
    );
    if (weights.some((weight) => weight > 0)) {
      return calculateWeightedAverage(
        tasks.map((task) => effectiveTasksById.get(task.id) ?? task),
        weights,
      );
    }
  }

  return Math.round(
    tasks.reduce((total, task) => {
      const effectiveTask = effectiveTasksById.get(task.id) ?? task;
      return total + normalizePercentComplete(effectiveTask.percentComplete);
    }, 0) / tasks.length,
  );
}

function getSummaryProgressWeight<T extends PlanningTaskLike>(
  task: T,
  childrenByParentId: Map<string | null, T[]>,
) {
  const duration = getPlannedDuration(task);
  if (duration > 0) {
    return duration;
  }

  if (task.taskKind !== TaskKind.Standard) {
    return 0;
  }

  return getDescendantsForWeight(task.id, childrenByParentId)
    .filter((descendantTask) => !isPhaseTask(descendantTask))
    .reduce(
      (totalDuration, descendantTask) =>
        totalDuration + getPlannedDuration(descendantTask),
      0,
    );
}

function hasStandardChildren<T extends PlanningTaskLike>(
  task: T,
  childrenByParentId: Map<string | null, T[]>,
) {
  return (
    task.taskKind === TaskKind.Standard &&
    (childrenByParentId.get(task.id) ?? []).some(
      (childTask) => childTask.taskKind === TaskKind.Standard,
    )
  );
}

function getDescendantsForWeight<T extends PlanningTaskLike>(
  taskId: string,
  childrenByParentId: Map<string | null, T[]>,
): T[] {
  return (childrenByParentId.get(taskId) ?? []).flatMap((childTask) => [
    childTask,
    ...getDescendantsForWeight(childTask.id, childrenByParentId),
  ]);
}

function getPlannedDuration(task: PlanningTaskLike) {
  const explicitDuration = normalizePositiveNumber(task.durationDays);
  if (explicitDuration > 0) {
    return explicitDuration;
  }

  const plannedStartDate = task.plannedStartDate ?? task.startDate ?? null;
  const plannedEndDate = task.plannedEndDate ?? task.dueDate ?? null;
  if (!plannedStartDate || !plannedEndDate) {
    return 0;
  }

  const startTime = new Date(`${plannedStartDate}T00:00:00Z`).getTime();
  const endTime = new Date(`${plannedEndDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  return Math.max(0, Math.round((endTime - startTime) / 86_400_000));
}

function deriveTaskStatusFromSubtasks(
  tasks: readonly PlanningTaskLike[],
): string | null {
  const statuses = tasks
    .map((task) => task.status)
    .filter((status): status is TaskStatus =>
      Object.values(TaskStatus).includes(status as TaskStatus),
    );

  if (statuses.length === 0) {
    return TaskStatus.Todo;
  }

  if (statuses.some((status) => status === TaskStatus.Blocked)) {
    return TaskStatus.Blocked;
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

function normalizePositiveNumber(value?: number | string | null): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 0;
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}
