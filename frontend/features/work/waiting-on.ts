import { isOverdueWork, storedWorkStatus, type WorkCountTask } from "@/features/work/work-count";

type WaitingPerson = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type WaitingTask = WorkCountTask & {
  assignee?: WaitingPerson | null;
  assigneeId?: string | null;
  title?: string | null;
};

export type WaitingDependency = {
  id: string;
  predecessorTask?: WaitingTask | null;
  predecessorTaskId: string;
  successorTask?: WaitingTask | null;
  successorTaskId: string;
};

export type HoldingLine = {
  id: string;
  owner: string | null;
  text: string;
  title: string;
};

export type WaitingLine = {
  id: string;
  owner: string | null;
  state: "on_track" | "blocked" | "overdue" | "done";
  text: string;
  title: string;
};

const stateLabel = {
  blocked: "Blocked",
  done: "Done",
  on_track: "On track",
  overdue: "Overdue",
} as const;

export function waitingLines(
  taskId: string,
  dependencies: readonly WaitingDependency[],
  tasks: readonly WaitingTask[],
  today: string,
): WaitingLine[] {
  return dependencies
    .filter((dependency) => dependency.successorTaskId === taskId && dependency.predecessorTaskId)
    .map((dependency) => {
      const predecessor =
        tasks.find((task) => task.id === dependency.predecessorTaskId) ??
        dependency.predecessorTask ??
        null;
      const title = predecessor?.title?.trim() || "Task";
      const state = predecessor ? waitState(predecessor, tasks, today) : "on_track";
      const owner = predecessor ? ownerName(predecessor) : null;
      const text = owner
        ? `Waiting on ${title} · ${stateLabel[state]} · ${owner}`
        : `Waiting on ${title} · ${stateLabel[state]}`;
      return { id: dependency.id, owner, state, text, title };
    });
}

export function holdingLines(
  taskId: string,
  dependencies: readonly WaitingDependency[],
  tasks: readonly WaitingTask[],
): HoldingLine[] {
  return dependencies
    .filter((dependency) => dependency.predecessorTaskId === taskId && dependency.successorTaskId)
    .map((dependency) => {
      const successor =
        tasks.find((task) => task.id === dependency.successorTaskId) ??
        dependency.successorTask ??
        null;
      const title = successor?.title?.trim() || "Task";
      const owner = successor ? ownerName(successor) : null;
      const text = owner ? `Holding up ${title} · ${owner}` : `Holding up ${title}`;
      return { id: dependency.id, owner, text, title };
    });
}

function waitState(
  predecessor: WaitingTask,
  tasks: readonly WaitingTask[],
  today: string,
): WaitingLine["state"] {
  const known = tasks.some((task) => task.id === predecessor.id) ? tasks : [...tasks, predecessor];
  if (storedWorkStatus(predecessor.status) === "done") return "done";
  if (storedWorkStatus(predecessor.status) === "blocked") return "blocked";
  if (isOverdueWork(predecessor, known, today)) return "overdue";
  return "on_track";
}

function ownerName(task: WaitingTask) {
  const name = [task.assignee?.firstName, task.assignee?.lastName].filter(Boolean).join(" ").trim();
  if (name || task.assignee?.email) return name || task.assignee?.email || null;
  if (!task.assigneeId) return "Unassigned";
  return null;
}
