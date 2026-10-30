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

export function todayDate(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function isWorkContainer(
  task: WorkCountTask,
  tasks: readonly WorkCountTask[],
): boolean {
  if (task.taskKind === "summary") {
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
  if (!task.dueDate || task.status === "done") {
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

export function containerProgress(
  containerId: string,
  tasks: readonly WorkCountTask[],
) {
  const leaves = descendantLeaves(containerId, tasks);
  return {
    done: leaves.filter((task) => task.status === "done").length,
    total: leaves.length,
  };
}

function descendantLeaves(
  containerId: string,
  tasks: readonly WorkCountTask[],
): WorkCountTask[] {
  const children = tasks.filter((task) => task.parentTaskId === containerId);
  return children.flatMap((child) =>
    isWorkContainer(child, tasks) ? descendantLeaves(child.id, tasks) : [child],
  );
}

export const workStatusOptions = [
  { label: "Not started", value: "todo" },
  { label: "Doing", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
] as const;

export function workStatusLabel(status?: string | null) {
  if (status === "in_progress") return "Doing";
  if (status === "blocked") return "Blocked";
  if (status === "done") return "Done";
  return "Not started";
}

export function storedWorkStatus(status?: string | null) {
  if (status === "in_progress" || status === "blocked" || status === "done") {
    return status;
  }
  return "todo";
}
