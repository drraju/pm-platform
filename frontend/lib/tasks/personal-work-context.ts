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

  const includedTaskIds = new Set(directTasks.map((task) => task.id));
  for (const task of directTasks) {
    if (task.parentTaskId) {
      const parentTask = tasksById.get(task.parentTaskId);
      if (parentTask) {
        includedTaskIds.add(parentTask.id);
      }
    }

    if (task.assigneeId !== currentUserId) {
      continue;
    }
    for (const childTask of childrenByParentId.get(task.id) ?? []) {
      includedTaskIds.add(childTask.id);
    }
  }

  return allTasks.filter((task) => includedTaskIds.has(task.id));
}
