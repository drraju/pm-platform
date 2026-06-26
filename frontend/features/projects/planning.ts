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

  return tasks.map((task) => {
    const directChildren = childrenByParentId.get(task.id) ?? [];

    if (task.taskKind !== "summary") {
      return {
        ...task,
        childTaskCount: directChildren.length,
        phaseEndDate: null,
        phaseProgress: null,
        phaseStartDate: null,
      };
    }

    const descendants = getDescendants(task.id);
    const descendantWorkTasks = descendants.filter(
      (descendantTask) => descendantTask.taskKind === "standard",
    );
    const descendantDatedTasks = descendants.filter(
      (descendantTask) => descendantTask.taskKind !== "summary",
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

export function decorateProjectPlan(project: ApiProjectDetails): ApiProjectDetails {
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
    return Number.isFinite(numericValue) ? clampPercentComplete(numericValue) : 0;
  }

  return 0;
}

function clampPercentComplete(value: number) {
  return Math.min(100, Math.max(0, value));
}
