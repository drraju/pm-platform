import type { ApiProjectDetails, ApiTask } from "@/lib/api/client";

export type ApiTaskCounts = {
  milestones: number;
  phases: number;
  tasks: number;
};

export function countPlanningItems(tasks: ApiTask[]): ApiTaskCounts {
  return tasks.reduce<ApiTaskCounts>(
    (summary, task) => {
      if (task.taskKind === "summary") {
        summary.phases += 1;
        return summary;
      }

      if (task.taskKind === "milestone") {
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

export function decoratePlanningTasks(tasks: ApiTask[]): ApiTask[] {
  const childrenByParentId = new Map<string | null, ApiTask[]>();
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId ?? null;
    const currentChildren = childrenByParentId.get(parentTaskId) ?? [];
    currentChildren.push(task);
    childrenByParentId.set(parentTaskId, currentChildren);
  }

  const descendantsCache = new Map<string, ApiTask[]>();

  function getDescendants(taskId: string): ApiTask[] {
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

  const effectiveTasksById = new Map<string, ApiTask>();
  for (const task of tasks) {
    const directSubtasks = (childrenByParentId.get(task.id) ?? []).filter(
      (childTask) => childTask.taskKind === "standard",
    );
    if (task.taskKind !== "standard" || directSubtasks.length === 0) {
      effectiveTasksById.set(task.id, task);
      continue;
    }

    effectiveTasksById.set(task.id, {
      ...task,
      percentComplete: calculateSubtaskProgress(directSubtasks),
      status: deriveTaskStatusFromSubtasks(directSubtasks) ?? task.status,
    });
  }

  return tasks.map((task) => {
    const directChildren = childrenByParentId.get(task.id) ?? [];

    if (task.taskKind !== "summary") {
      const effectiveTask = effectiveTasksById.get(task.id) ?? task;
      return {
        ...effectiveTask,
        childTaskCount: directChildren.length,
        phaseEndDate: null,
        phaseProgress: null,
        phaseStartDate: null,
      };
    }

    const descendants = getDescendants(task.id);
    const descendantWorkTasks = descendants.filter(
      (descendantTask) =>
        descendantTask.taskKind === "standard" &&
        !hasStandardParent(descendantTask, tasksById),
    );
    const descendantDatedTasks = descendants.filter(
      (descendantTask) => descendantTask.taskKind !== "summary",
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
      childTaskCount: directChildren.length,
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

export function decorateProjectPlan(
  project: ApiProjectDetails,
): ApiProjectDetails {
  const tasks = decoratePlanningTasks(project.tasks ?? []);

  return {
    ...project,
    taskCounts: countPlanningItems(tasks),
    tasks,
  };
}

function findEarliestDate(values: Array<string | null | undefined>) {
  const dates = values.filter((value): value is string => Boolean(value));
  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((earliestDate, currentDate) =>
    currentDate < earliestDate ? currentDate : earliestDate,
  );
}

function findLatestDate(values: Array<string | null | undefined>) {
  const dates = values.filter((value): value is string => Boolean(value));
  if (dates.length === 0) {
    return null;
  }

  return dates.reduce((latestDate, currentDate) =>
    currentDate > latestDate ? currentDate : latestDate,
  );
}

function normalizePercentComplete(value?: number | string | null) {
  if (typeof value === "number") {
    return clampPercentComplete(value);
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? clampPercentComplete(numericValue)
      : 0;
  }

  return 0;
}

function clampPercentComplete(value: number) {
  return Math.min(100, Math.max(0, value));
}

function hasStandardParent(task: ApiTask, tasksById: Map<string, ApiTask>) {
  if (!task.parentTaskId) {
    return false;
  }

  return tasksById.get(task.parentTaskId)?.taskKind === "standard";
}

function calculateSubtaskProgress(tasks: ApiTask[]) {
  const effortWeights = tasks.map((task) =>
    normalizePositiveNumber(task.estimatedHours),
  );
  if (effortWeights.every((weight) => weight > 0)) {
    return calculateWeightedAverage(tasks, effortWeights);
  }

  const durationWeights = tasks.map((task) => getPlannedDuration(task));
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

function calculateWeightedAverage(tasks: ApiTask[], weights: number[]) {
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

function calculateSummaryProgress(
  tasks: ApiTask[],
  childrenByParentId: Map<string | null, ApiTask[]>,
  effectiveTasksById: Map<string, ApiTask>,
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

function getSummaryProgressWeight(
  task: ApiTask,
  childrenByParentId: Map<string | null, ApiTask[]>,
) {
  const duration = getPlannedDuration(task);
  if (duration > 0) {
    return duration;
  }

  if (task.taskKind !== "standard") {
    return 0;
  }

  return getDescendantsForWeight(task.id, childrenByParentId)
    .filter((descendantTask) => descendantTask.taskKind !== "summary")
    .reduce(
      (totalDuration, descendantTask) =>
        totalDuration + getPlannedDuration(descendantTask),
      0,
    );
}

function hasStandardChildren(
  task: ApiTask,
  childrenByParentId: Map<string | null, ApiTask[]>,
) {
  return (
    task.taskKind === "standard" &&
    (childrenByParentId.get(task.id) ?? []).some(
      (childTask) => childTask.taskKind === "standard",
    )
  );
}

function getDescendantsForWeight(
  taskId: string,
  childrenByParentId: Map<string | null, ApiTask[]>,
): ApiTask[] {
  return (childrenByParentId.get(taskId) ?? []).flatMap((childTask) => [
    childTask,
    ...getDescendantsForWeight(childTask.id, childrenByParentId),
  ]);
}

function deriveTaskStatusFromSubtasks(tasks: ApiTask[]) {
  const statuses = tasks
    .map((task) => task.status)
    .filter((status): status is NonNullable<ApiTask["status"]> =>
      Boolean(status),
    );

  if (statuses.length === 0) {
    return "todo";
  }

  if (statuses.some((status) => status === "blocked")) {
    return "blocked";
  }

  if (statuses.every((status) => status === "done")) {
    return "done";
  }

  if (statuses.every((status) => status === "backlog" || status === "todo")) {
    return "todo";
  }

  return "in_progress";
}

function normalizePositiveNumber(value?: number | string | null) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

function getPlannedDuration(task: ApiTask) {
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
