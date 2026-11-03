import { outlineRoleOf } from "@/features/work/outline-role";
import {
  containerProgress,
  containerStatusMix,
  isOverdueWork,
  isWorkContainer,
  statusMix,
  storedWorkStatus,
  workLeaves,
  type StatusMix,
  type WorkCountTask,
} from "@/features/work/work-count";

export const todayFilters = ["open", "todo", "in_progress", "blocked", "overdue", "done", "all"] as const;

export type TodayFilter = (typeof todayFilters)[number];

export const todayFilterLabel: Record<TodayFilter, string> = {
  all: "All",
  blocked: "Blocked",
  done: "Done",
  in_progress: "Doing",
  open: "Open",
  overdue: "Overdue",
  todo: "Not started",
};

type OutlineTask = WorkCountTask & { title?: string | null };

export type TodayWorkRow<T> = {
  depth: number;
  foldable: boolean;
  task: T;
};

export type TodaySection<T> = {
  done: number;
  id: string;
  mix: StatusMix;
  rows: TodayWorkRow<T>[];
  title: string;
  total: number;
};

const emptyMix: StatusMix = { blocked: 0, doing: 0, done: 0, notStarted: 0, total: 0 };

export function todayContainerIds(tasks: readonly WorkCountTask[]): string[] {
  return tasks
    .filter((task) => isWorkContainer(task, tasks) && outlineRoleOf(task) !== "gate")
    .map((task) => task.id)
    .sort();
}

export function matchesTodayFilter(
  task: WorkCountTask,
  tasks: readonly WorkCountTask[],
  today: string,
  filter: TodayFilter,
): boolean {
  if (isWorkContainer(task, tasks)) return false;
  if (filter === "all") return true;
  if (filter === "open") return storedWorkStatus(task.status) !== "done";
  if (filter === "overdue") return isOverdueWork(task, tasks, today);
  return storedWorkStatus(task.status) === filter;
}

export function countTodayFilters(tasks: readonly WorkCountTask[], today: string): Record<TodayFilter, number> {
  const leaves = workLeaves(tasks);
  const counts: Record<TodayFilter, number> = {
    all: leaves.length,
    blocked: 0,
    done: 0,
    in_progress: 0,
    open: 0,
    overdue: 0,
    todo: 0,
  };
  for (const leaf of leaves) {
    const status = storedWorkStatus(leaf.status);
    if (status === "done") counts.done += 1;
    else counts.open += 1;
    if (status === "todo") counts.todo += 1;
    if (status === "in_progress") counts.in_progress += 1;
    if (status === "blocked") counts.blocked += 1;
    if (isOverdueWork(leaf, tasks, today)) counts.overdue += 1;
  }
  return counts;
}

export function doneContainerIds(tasks: readonly WorkCountTask[]): string[] {
  return tasks.flatMap((task) => {
    if (!isWorkContainer(task, tasks) || outlineRoleOf(task) === "gate") return [];
    const progress = containerProgress(task.id, tasks);
    return progress.total > 0 && progress.done === progress.total ? [task.id] : [];
  });
}

function isFolder(task: WorkCountTask) {
  const role = outlineRoleOf(task);
  return role === "phase" || role === "milestone" || role === "summary";
}

function hasMatchingDescendant(
  taskId: string,
  tasks: readonly WorkCountTask[],
  today: string,
  filter: TodayFilter,
): boolean {
  return tasks.some(
    (task) => task.parentTaskId === taskId && (matchesTodayFilter(task, tasks, today, filter) || hasMatchingDescendant(task.id, tasks, today, filter)),
  );
}

export function todaySections<T extends OutlineTask>(
  tasks: readonly T[],
  filter: TodayFilter,
  collapsed: ReadonlySet<string>,
  today: string,
): TodaySection<T>[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const nearestFolder = (task: T): T | null => {
    let parentId = task.parentTaskId ?? null;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) return null;
      if (isFolder(parent)) return parent;
      parentId = parent.parentTaskId ?? null;
    }
    return null;
  };
  const workDepth = (task: T) => {
    let depth = 0;
    let parentId = task.parentTaskId ?? null;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent || isFolder(parent)) break;
      if (outlineRoleOf(parent) === "work") depth += 1;
      parentId = parent.parentTaskId ?? null;
    }
    return depth;
  };

  const sections = new Map<string, TodaySection<T>>();
  const order: string[] = [];
  const ensure = (id: string, title: string) => {
    const existing = sections.get(id);
    if (existing) return existing;
    const progress = id === "work"
      ? null
      : containerProgress(id, tasks);
    const created: TodaySection<T> = {
      done: progress?.done ?? 0,
      id,
      mix: emptyMix,
      rows: [],
      title,
      total: progress?.total ?? 0,
    };
    sections.set(id, created);
    order.push(id);
    return created;
  };

  for (const task of tasksInOutlineOrder(tasks)) {
    if (isFolder(task) || outlineRoleOf(task) === "gate") continue;
    const folder = nearestFolder(task);
    const sectionId = folder?.id ?? "work";
    const parent = task.parentTaskId ? byId.get(task.parentTaskId) : null;
    const foldable = tasks.some((item) => item.parentTaskId === task.id);
    if (foldable) {
      if (!hasMatchingDescendant(task.id, tasks, today, filter)) continue;
      if (parent && outlineRoleOf(parent) === "work" && collapsed.has(parent.id)) continue;
      ensure(sectionId, folder?.title ?? "Work").rows.push({ depth: workDepth(task), foldable: true, task });
      continue;
    }
    if (!matchesTodayFilter(task, tasks, today, filter)) continue;
    if (parent && outlineRoleOf(parent) === "work" && collapsed.has(parent.id)) continue;
    ensure(sectionId, folder?.title ?? "Work").rows.push({ depth: workDepth(task), foldable: false, task });
  }

  return order.flatMap((id) => {
    const section = sections.get(id);
    if (!section || section.rows.length === 0) return [];
    if (id === "work") {
      const loose = tasks.filter((task) => !isWorkContainer(task, tasks) && !nearestFolder(task));
      section.total = loose.length;
      section.done = loose.filter((task) => storedWorkStatus(task.status) === "done").length;
      section.mix = statusMix(loose);
    } else {
      section.mix = containerStatusMix(id, tasks);
    }
    return [section];
  });
}

function tasksInOutlineOrder<T extends OutlineTask>(tasks: readonly T[]): T[] {
  const children = new Map<string | null, T[]>();
  const ids = new Set(tasks.map((task) => task.id));
  for (const task of tasks) {
    const parentId = task.parentTaskId && ids.has(task.parentTaskId) ? task.parentTaskId : null;
    const group = children.get(parentId) ?? [];
    group.push(task);
    children.set(parentId, group);
  }
  const ordered: T[] = [];
  const walk = (parentId: string | null) => {
    for (const task of children.get(parentId) ?? []) {
      ordered.push(task);
      walk(task.id);
    }
  };
  walk(null);
  return ordered;
}
