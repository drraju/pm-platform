import type { ApiTask } from "@/lib/api/client";

export type TaskHierarchyRow = {
  depth: number;
  hasChildren: boolean;
  task: ApiTask;
  wbs: string;
};

export function buildTaskHierarchy(
  tasks: ApiTask[],
  expandedTaskIds: readonly string[],
  options: { preserveInputOrder?: boolean } = {},
) {
  const tasksByParentId = new Map<string | null, ApiTask[]>();
  const expanded = new Set(expandedTaskIds);
  const rows: TaskHierarchyRow[] = [];

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId ?? null;
    const siblings = tasksByParentId.get(parentTaskId) ?? [];
    siblings.push(task);
    tasksByParentId.set(parentTaskId, siblings);
  }

  for (const [parentTaskId, siblings] of tasksByParentId.entries()) {
    tasksByParentId.set(
      parentTaskId,
      options.preserveInputOrder ? siblings : sortTasks(siblings),
    );
  }

  function visit(parentTaskId: string | null, prefix: string, depth: number) {
    const siblings = tasksByParentId.get(parentTaskId) ?? [];
    siblings.forEach((task, index) => {
      const wbs = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      const hasChildren = (tasksByParentId.get(task.id) ?? []).length > 0;
      rows.push({ depth, hasChildren, task, wbs });
      if (hasChildren && expanded.has(task.id)) {
        visit(task.id, wbs, depth + 1);
      }
    });
  }

  visit(null, "", 0);
  return { rows };
}

export function getHierarchyParentTaskIds(tasks: ApiTask[]) {
  const parentIds = new Set<string>();
  for (const task of tasks) {
    if (task.parentTaskId) {
      parentIds.add(task.parentTaskId);
    }
  }
  return tasks
    .filter((task) => task.taskKind === "summary" || parentIds.has(task.id))
    .map((task) => task.id);
}

function sortTasks(tasks: ApiTask[]) {
  return [...tasks].sort((left, right) => {
    const leftSequence =
      typeof left.sequenceNumber === "number"
        ? left.sequenceNumber
        : Number.MAX_SAFE_INTEGER;
    const rightSequence =
      typeof right.sequenceNumber === "number"
        ? right.sequenceNumber
        : Number.MAX_SAFE_INTEGER;
    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }
    return left.title.localeCompare(right.title);
  });
}
