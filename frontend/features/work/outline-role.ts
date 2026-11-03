export const outlineRoles = ["phase", "milestone", "summary", "work", "gate"] as const;

export type OutlineRole = (typeof outlineRoles)[number];

export type OutlineTask = {
  id?: string;
  outlineRole?: string | null;
  parentTaskId?: string | null;
  taskKind?: string | null;
};

export function outlineRoleOf(task: OutlineTask): OutlineRole {
  if (task.outlineRole === "phase" || task.outlineRole === "milestone" || task.outlineRole === "summary" || task.outlineRole === "work" || task.outlineRole === "gate") {
    return task.outlineRole;
  }
  if (task.taskKind === "milestone") return "gate";
  if (task.taskKind === "summary") return "summary";
  return "work";
}

export function isSubtask(task: OutlineTask, tasks: readonly OutlineTask[]): boolean {
  if (outlineRoleOf(task) !== "work" || !task.parentTaskId) return false;
  const parent = tasks.find((item) => item.id === task.parentTaskId);
  return parent ? outlineRoleOf(parent) === "work" : false;
}

// Stored values stay phase, milestone, summary, work, and gate.
// The names below are the ones a project manager already uses.
export function outlineRoleLabel(role: OutlineRole, subtask = false) {
  if (subtask) return "Subtask";
  if (role === "phase") return "Phase";
  if (role === "milestone") return "Section";
  if (role === "summary") return "Group";
  if (role === "gate") return "Milestone";
  return "Task";
}

export function outlineRoleHint(role: OutlineRole, subtask = false) {
  if (subtask) return "Subtask";
  if (role === "phase") return "Phase";
  if (role === "milestone") return "Section. A band of work inside a phase.";
  if (role === "summary") return "Group. Holds tasks, and can hold other groups.";
  if (role === "gate") return "Milestone. One date, no duration.";
  return "Task";
}

export function addChoices(role: OutlineRole, subtask: boolean): Array<{ label: string; role: OutlineRole }> {
  if (role === "gate" || subtask) return [];
  if (role === "work") return [{ label: outlineRoleLabel("work", true), role: "work" }];
  if (role === "phase") {
    return [
      { label: outlineRoleLabel("milestone"), role: "milestone" },
      { label: outlineRoleLabel("summary"), role: "summary" },
      { label: outlineRoleLabel("gate"), role: "gate" },
    ];
  }
  return [
    { label: outlineRoleLabel("summary"), role: "summary" },
    { label: outlineRoleLabel("work"), role: "work" },
    { label: outlineRoleLabel("gate"), role: "gate" },
  ];
}

export function outlinePlacementError(input: {
  childHasChildren: boolean;
  childRole: OutlineRole;
  parentParentRole: OutlineRole | null;
  parentRole: OutlineRole | null;
}): string | null {
  const { childHasChildren, childRole, parentParentRole, parentRole } = input;
  if (parentRole === null) {
    return childRole === "phase" ? null : "Only a phase can sit on the project.";
  }
  if (parentRole === "gate") return "A milestone cannot contain other rows.";
  if (parentRole === "work") {
    if (parentParentRole === "work") return "A subtask cannot contain other rows.";
    if (childRole !== "work" || childHasChildren) {
      return "Move or delete the rows inside this one first.";
    }
    return null;
  }
  if (parentRole === "phase") {
    if (childRole === "milestone" || childRole === "summary" || childRole === "gate") return null;
    return "A phase holds sections, groups, and milestones.";
  }
  if (childRole === "summary" || childRole === "work" || childRole === "gate") return null;
  if (childRole === "phase") return "A phase sits on the project.";
  return "A section sits under a phase.";
}

type Identified = OutlineTask & { id: string };

export function placementErrorForDrop<T extends Identified>(
  tasks: readonly T[],
  dragged: T,
  target: T,
): string | null {
  const parent = target.parentTaskId ? tasks.find((task) => task.id === target.parentTaskId) : null;
  return outlinePlacementError({
    childHasChildren: tasks.some((task) => task.parentTaskId === dragged.id),
    childRole: outlineRoleOf(dragged),
    parentParentRole: parent ? outlineRoleOf(parent) : null,
    parentRole: outlineRoleOf(target),
  });
}
