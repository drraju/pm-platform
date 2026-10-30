import { TaskStatus } from '../../common/enums/task-status.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';

export type WorkCountTask = {
  dueDate?: string | null;
  id: string;
  parentTaskId?: string | null;
  status?: string | null;
  taskKind?: string | null;
};

export type WorkCount = {
  line: string;
  operational: number;
  overdue: number;
};

export function isWorkContainer(
  task: WorkCountTask,
  tasks: readonly WorkCountTask[],
): boolean {
  if (task.taskKind === TaskKind.Summary) {
    return true;
  }

  return tasks.some((other) => other.parentTaskId === task.id);
}

export function workLeaves<T extends WorkCountTask>(tasks: readonly T[]): T[] {
  return tasks.filter((task) => !isWorkContainer(task, tasks));
}

export function isOverdueWork(
  task: WorkCountTask,
  tasks: readonly WorkCountTask[],
  today: string,
): boolean {
  if (isWorkContainer(task, tasks)) {
    return false;
  }
  if (!task.dueDate || task.status === TaskStatus.Done) {
    return false;
  }

  return task.dueDate.slice(0, 10) < today;
}

export function countWork(
  tasks: readonly WorkCountTask[],
  today: string,
): WorkCount {
  const leaves = workLeaves(tasks);
  const overdue = leaves.filter((task) => isOverdueWork(task, tasks, today)).length;

  return {
    line: `${overdue} of ${leaves.length} overdue`,
    operational: leaves.length,
    overdue,
  };
}
