import type { ApiTask } from "@/lib/api/client";

/**
 * Re-includes ancestor tasks (typically summary packages) so hierarchical
 * list builders can walk from root parents to matched descendants.
 */
export function includeTaskAncestors(
  allTasks: ApiTask[],
  tasks: ApiTask[],
): ApiTask[] {
  const tasksById = new Map(allTasks.map((task) => [task.id, task]));
  const queue = [...tasks];
  const includedTaskIds = new Set(tasks.map((task) => task.id));

  while (queue.length > 0) {
    const task = queue.pop();
    if (!task?.parentTaskId || includedTaskIds.has(task.parentTaskId)) {
      continue;
    }

    const parentTask = tasksById.get(task.parentTaskId);
    if (!parentTask) {
      continue;
    }

    includedTaskIds.add(parentTask.id);
    queue.push(parentTask);
  }

  return allTasks.filter((task) => includedTaskIds.has(task.id));
}
