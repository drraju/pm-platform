import { TaskKind } from '../../common/enums/task-kind.enum';

export type PlanningTaskCounts = {
  milestones: number;
  phases: number;
  tasks: number;
};

type PlanningTaskLike = {
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  assignee?: unknown | null;
  assigneeId?: string | null;
  childTaskCount?: number;
  dueDate?: string | null;
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

  return tasks.map((task) => {
    const directChildren = childrenByParentId.get(task.id) ?? [];
    const childTaskCount = directChildren.length;

    if (!isPhaseTask(task)) {
      return {
        ...task,
        childTaskCount,
        phaseEndDate: null,
        phaseProgress: null,
        phaseStartDate: null,
      };
    }

    const descendants = getDescendants(task.id);
    const descendantWorkTasks = descendants.filter(
      (descendantTask) => descendantTask.taskKind === TaskKind.Standard,
    );
    const descendantDatedTasks = descendants.filter(
      (descendantTask) => !isPhaseTask(descendantTask),
    );
    const totalPercentComplete = descendantWorkTasks.reduce(
      (sum, descendantTask) =>
        sum + normalizePercentComplete(descendantTask.percentComplete),
      0,
    );
    const phaseProgress =
      descendantWorkTasks.length > 0
        ? Math.round(totalPercentComplete / descendantWorkTasks.length)
        : 0;
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
