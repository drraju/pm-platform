export type PlanTask = {
  id: string;
  parentTaskId?: string | null;
  sequenceNumber?: number | null;
  title: string;
};

export type PlanRow<T extends PlanTask> = {
  depth: number;
  task: T;
};

export function planParentId<T extends PlanTask>(
  task: T,
  tasks: readonly T[],
): string | null {
  const parentId = task.parentTaskId ?? null;
  if (!parentId || !tasks.some((item) => item.id === parentId)) {
    return null;
  }
  return parentId;
}

function comparePlanTasks<T extends PlanTask>(left: T, right: T) {
  const leftSequence = left.sequenceNumber ?? Number.MAX_SAFE_INTEGER;
  const rightSequence = right.sequenceNumber ?? Number.MAX_SAFE_INTEGER;
  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }
  return left.title.localeCompare(right.title);
}

export function outlinePlan<T extends PlanTask>(tasks: readonly T[]): PlanRow<T>[] {
  const children = new Map<string | null, T[]>();
  for (const task of tasks) {
    const parentId = planParentId(task, tasks);
    const group = children.get(parentId) ?? [];
    group.push(task);
    children.set(parentId, group);
  }

  const rows: PlanRow<T>[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    const group = (children.get(parentId) ?? []).slice().sort(comparePlanTasks);
    for (const task of group) {
      if (seen.has(task.id)) {
        continue;
      }
      seen.add(task.id);
      rows.push({ depth, task });
      walk(task.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export function reorderPlanSiblings<T extends PlanTask>(
  tasks: readonly T[],
  draggedId: string,
  targetId: string,
): Array<{ id: string; sequenceNumber: number }> {
  const dragged = tasks.find((task) => task.id === draggedId);
  const target = tasks.find((task) => task.id === targetId);
  if (!dragged || !target || dragged.id === target.id) {
    return [];
  }
  if (planParentId(dragged, tasks) !== planParentId(target, tasks)) {
    return [];
  }

  const parentId = planParentId(dragged, tasks);
  const siblings = tasks
    .filter((task) => planParentId(task, tasks) === parentId)
    .slice()
    .sort(comparePlanTasks);
  const from = siblings.findIndex((task) => task.id === draggedId);
  const to = siblings.findIndex((task) => task.id === targetId);
  if (from < 0 || to < 0) {
    return [];
  }

  const next = siblings.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.flatMap((task, index) => {
    const sequenceNumber = index + 1;
    return task.sequenceNumber === sequenceNumber ? [] : [{ id: task.id, sequenceNumber }];
  });
}
