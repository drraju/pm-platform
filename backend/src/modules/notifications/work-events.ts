import { TaskStatus } from '../../common/enums/task-status.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';

export const workEventReasons = ['assigned', 'blocked', 'overdue'] as const;

export type WorkEventReason = (typeof workEventReasons)[number];

export type WorkEventSnapshot = {
  assigneeId: string | null;
  status: string | null;
};

export function localWorkDate(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function isOverdueLeaf(input: {
  dueDate?: string | null;
  status?: string | null;
  today: string;
}) {
  if (!input.dueDate || input.status === TaskStatus.Done) {
    return false;
  }

  return input.dueDate.slice(0, 10) < input.today;
}

export function planWorkEvents(input: {
  alreadyAlerted: boolean;
  isContainer: boolean;
  nextAssigneeId: string | null;
  nextStatus: string;
  overdue: boolean;
  previous: WorkEventSnapshot;
}): WorkEventReason[] {
  if (input.isContainer || !input.nextAssigneeId) {
    return [];
  }

  const reasons: WorkEventReason[] = [];
  if (input.nextAssigneeId !== input.previous.assigneeId) {
    reasons.push('assigned');
  }
  if (
    input.nextStatus === TaskStatus.Blocked &&
    input.previous.status !== TaskStatus.Blocked
  ) {
    reasons.push('blocked');
  }
  if (input.overdue && !input.alreadyAlerted) {
    reasons.push('overdue');
  }

  return reasons;
}

export function isSummaryTask(taskKind?: string | null) {
  return taskKind === TaskKind.Summary;
}
