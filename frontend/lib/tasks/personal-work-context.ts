import type { ApiTask } from "@/lib/api/client";

export function includePersonalWorkContext(
  allTasks: ApiTask[],
  directTasks: ApiTask[],
  currentUserId: string | null,
): ApiTask[] {
  if (!currentUserId || directTasks.length === 0) {
    return directTasks;
  }

  const tasksById = new Map(allTasks.map((task) => [task.id, task]));
  const childrenByParentId = new Map<string, ApiTask[]>();
  for (const task of allTasks) {
    if (!task.parentTaskId) {
      continue;
    }
    const children = childrenByParentId.get(task.parentTaskId) ?? [];
    children.push(task);
    childrenByParentId.set(task.parentTaskId, children);
  }

  const orderedTasks: ApiTask[] = [];
  const includedTaskIds = new Set<string>();
  const include = (task?: ApiTask | null) => {
    if (!task || includedTaskIds.has(task.id)) {
      return;
    }
    includedTaskIds.add(task.id);
    orderedTasks.push(task);
  };

  for (const task of directTasks) {
    if (task.parentTaskId) {
      include(tasksById.get(task.parentTaskId));
    }

    include(task);

    if (task.assigneeId !== currentUserId) {
      continue;
    }
    for (const childTask of childrenByParentId.get(task.id) ?? []) {
      include(childTask);
    }
  }

  return orderedTasks;
}
