import { BadRequestException } from '@nestjs/common';
import { OutlineRole } from '../enums/outline-role.enum';
import { TaskKind } from '../enums/task-kind.enum';

const outlineRoles = new Set<string>(Object.values(OutlineRole));

export function isOutlineRole(value: string): value is OutlineRole {
  return outlineRoles.has(value);
}

export function parseOutlineRole(value: string): OutlineRole {
  if (!isOutlineRole(value)) {
    throw new BadRequestException(`Unsupported outline role ${value}`);
  }
  return value;
}

export function taskKindForOutlineRole(role: OutlineRole): TaskKind {
  if (role === OutlineRole.Gate) return TaskKind.Milestone;
  if (role === OutlineRole.Work) return TaskKind.Standard;
  return TaskKind.Summary;
}

export function outlineRoleFromTaskKind(
  taskKind?: string | null,
): OutlineRole {
  if (taskKind === TaskKind.Milestone) return OutlineRole.Gate;
  if (taskKind === TaskKind.Summary) return OutlineRole.Summary;
  return OutlineRole.Work;
}

export function resolveOutlineRole(task: {
  outlineRole?: string | null;
  taskKind?: string | null;
}): OutlineRole {
  if (task.outlineRole && isOutlineRole(task.outlineRole)) {
    return task.outlineRole;
  }
  return outlineRoleFromTaskKind(task.taskKind);
}

export function outlineHidesSchedule(role: OutlineRole): boolean {
  return role !== OutlineRole.Work;
}

const scheduleFields = [
  'assigneeId',
  'dueDate',
  'estimatedHours',
  'percentComplete',
  'plannedEndDate',
  'plannedStartDate',
  'remainingHours',
  'startDate',
  'status',
] as const;

export function withExplicitOutline<T extends { outlineRole?: string | null; taskKind?: string | null }>(
  input: T,
): T & { outlineRole: OutlineRole; taskKind: TaskKind } {
  const role = parseOutlineRole(String(input.outlineRole));
  const next: T & { outlineRole: OutlineRole; taskKind: TaskKind } = {
    ...input,
    outlineRole: role,
    taskKind: taskKindForOutlineRole(role),
  };
  if (outlineHidesSchedule(role)) {
    for (const field of scheduleFields) {
      delete (next as Record<string, unknown>)[field];
    }
  }
  return next;
}

export function outlinePlacementError(input: {
  childHasChildren: boolean;
  childRole: OutlineRole;
  parentParentRole: OutlineRole | null;
  parentRole: OutlineRole | null;
}): string | null {
  const { childHasChildren, childRole, parentParentRole, parentRole } = input;

  if (parentRole === null) {
    return childRole === OutlineRole.Phase
      ? null
      : 'Only a phase can sit on the project.';
  }

  if (parentRole === OutlineRole.Gate) {
    return 'A gate cannot contain other rows.';
  }

  if (parentRole === OutlineRole.Work) {
    if (parentParentRole === OutlineRole.Work) {
      return 'A subtask cannot contain other rows.';
    }
    if (childRole !== OutlineRole.Work || childHasChildren) {
      return 'Tasks with child tasks cannot become subtasks or milestones';
    }
    return null;
  }

  if (parentRole === OutlineRole.Phase) {
    if (
      childRole === OutlineRole.Milestone ||
      childRole === OutlineRole.Summary ||
      childRole === OutlineRole.Gate
    ) {
      return null;
    }
    return 'A phase holds milestones, summaries, and gates.';
  }

  if (
    childRole === OutlineRole.Summary ||
    childRole === OutlineRole.Work ||
    childRole === OutlineRole.Gate
  ) {
    return null;
  }

  if (childRole === OutlineRole.Phase) {
    return 'A phase sits on the project.';
  }

  return 'A milestone sits under a phase.';
}
