import type { ApiTask } from "@/lib/api/client";

/**
 * Re-includes ancestor tasks (typically summary packages) so hierarchical
 * list builders can walk from root parents to matched descendants.
 */
export function includeTaskAncestors(
  allTasks: ApiTask[],
  tasks: ApiTask[],
  options: { preserveTaskOrder?: boolean } = {},
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

  if (options.preserveTaskOrder) {
    const orderedTasks: ApiTask[] = [];
    const orderedTaskIds = new Set<string>();
    const include = (task: ApiTask) => {
      if (orderedTaskIds.has(task.id)) {
        return;
      }
      orderedTaskIds.add(task.id);
      orderedTasks.push(task);
    };

    for (const task of tasks) {
      const ancestors: ApiTask[] = [];
      let current = task;
      while (current.parentTaskId && includedTaskIds.has(current.parentTaskId)) {
        const parentTask = tasksById.get(current.parentTaskId);
        if (!parentTask) {
          break;
        }
        ancestors.push(parentTask);
        current = parentTask;
      }
      ancestors.reverse().forEach(include);
      include(task);
    }

    for (const task of allTasks) {
      if (includedTaskIds.has(task.id)) {
        include(task);
      }
    }

    return orderedTasks;
  }

  return allTasks.filter((task) => includedTaskIds.has(task.id));
}
