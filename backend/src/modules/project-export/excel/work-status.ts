import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';

type StatusTask = {
  dueDate?: string | null;
  id: string;
  parentTaskId?: string | null;
  status?: string | null;
  taskKind?: string | null;
};

const projectStatusLabels: Record<string, string> = {
  active: 'Active',
  archived: 'Archived',
  done: 'Done',
  paused: 'Paused',
  planned: 'Planned',
};

export function projectStatusLabel(status?: string | null) {
  if (!status) return '';
  return projectStatusLabels[status] ?? status;
}

export function workStatusLabel(status?: string | null) {
  if (status === TaskStatus.InProgress) return 'Doing';
  if (status === TaskStatus.Blocked) return 'Blocked';
  if (status === TaskStatus.Done) return 'Done';
  return 'Not started';
}

export function localWorkDate(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function isWorkContainer(task: StatusTask, tasks: readonly StatusTask[]) {
  if (task.taskKind === TaskKind.Summary) return true;
  return tasks.some((other) => other.parentTaskId === task.id);
}

export function workLeaves<T extends StatusTask>(tasks: readonly T[]) {
  return tasks.filter((task) => !isWorkContainer(task, tasks));
}

export function isOverdueWork(task: StatusTask, tasks: readonly StatusTask[], today: string) {
  if (isWorkContainer(task, tasks) || !task.dueDate || task.status === TaskStatus.Done) {
    return false;
  }
  return task.dueDate.slice(0, 10) < today;
}

export function workStatusCount(tasks: readonly StatusTask[], today = localWorkDate()) {
  const leaves = workLeaves(tasks);
  const overdue = leaves.filter((task) => isOverdueWork(task, tasks, today)).length;
  const done = leaves.filter((task) => task.status === TaskStatus.Done).length;
  return {
    blocked: leaves.filter((task) => task.status === TaskStatus.Blocked).length,
    doing: leaves.filter((task) => task.status === TaskStatus.InProgress).length,
    done,
    health: `${overdue} of ${leaves.length} overdue`,
    notStarted: leaves.filter((task) => workStatusLabel(task.status) === 'Not started').length,
    operational: leaves.length,
    overdue,
    progress: leaves.length ? Math.round((done / leaves.length) * 100) : 0,
  };
}

export function containerProgress(containerId: string, tasks: readonly StatusTask[]) {
  const leaves = descendantLeaves(containerId, tasks);
  return {
    done: leaves.filter((task) => task.status === TaskStatus.Done).length,
    total: leaves.length,
  };
}

function descendantLeaves(containerId: string, tasks: readonly StatusTask[]): StatusTask[] {
  const children = tasks.filter((task) => task.parentTaskId === containerId);
  return children.flatMap((child) =>
    isWorkContainer(child, tasks) ? descendantLeaves(child.id, tasks) : [child],
  );
}
