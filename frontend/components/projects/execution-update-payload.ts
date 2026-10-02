import type { ApiTask } from "@/features/projects";

export type TaskExecutionUpdatePayload = {
  assigneeId?: string | null;
  nextActionOwnerId?: string | null;
  nextStep?: string | null;
  percentComplete: number;
  priority: string;
  status: ApiTask["status"];
  targetCompletionDate?: string | null;
  updateNotes?: string | null;
};

type ExecutionUpdatePayloadOverrides = Partial<TaskExecutionUpdatePayload> & {
  blockerCategory?: string;
  blockerReason?: string;
  isBlocked?: boolean;
};

export function buildExecutionUpdatePayload(
  task: ApiTask,
  overrides: ExecutionUpdatePayloadOverrides = {},
): TaskExecutionUpdatePayload {
  const latestUpdate = task.latestExecutionUpdate;
  let status = overrides.isBlocked
    ? "blocked"
    : (overrides.status ?? task.status);
  // Lowering progress on completed work is a reopening edit, not another completion.
  // An explicit status still follows the backend's existing completion precedence.
  if (
    task.status === "done" &&
    overrides.status === undefined &&
    !overrides.isBlocked &&
    overrides.percentComplete !== undefined &&
    overrides.percentComplete >= 0 &&
    overrides.percentComplete < 100
  ) {
    status = overrides.percentComplete === 0 ? "todo" : "in_progress";
  }
  const percentComplete =
    overrides.percentComplete ??
    getProgressForStatus(getDisplayedPercentComplete(task), status);

  return {
    assigneeId: normalizeNullableValue(overrides.assigneeId, task.assigneeId),
    nextActionOwnerId: normalizeNullableValue(
      overrides.nextActionOwnerId,
      latestUpdate?.nextActionOwnerId,
    ),
    nextStep: normalizeNullableValue(
      overrides.nextStep,
      latestUpdate?.nextStep,
    ),
    percentComplete,
    priority: overrides.priority ?? task.priority,
    status,
    targetCompletionDate: normalizeNullableValue(
      overrides.targetCompletionDate,
      latestUpdate?.targetCompletionDate ?? task.dueDate ?? task.plannedEndDate,
    ),
    updateNotes: normalizeNullableText(
      overrides.isBlocked
        ? buildBlockerUpdateNotes(overrides)
        : overrides.updateNotes,
    ),
  };
}

export function getDisplayedPercentComplete(task: ApiTask) {
  if (task.taskKind === "summary") {
    return task.phaseProgress ?? task.percentComplete ?? 0;
  }

  return task.percentComplete ?? 0;
}

function buildBlockerUpdateNotes({
  blockerCategory,
  blockerReason,
  updateNotes,
}: ExecutionUpdatePayloadOverrides) {
  return [
    blockerCategory ? `Blocker Category: ${blockerCategory}` : "",
    blockerReason?.trim() ? `Blocker: ${blockerReason.trim()}` : "",
    updateNotes?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getProgressForStatus(
  currentProgress: number,
  status: ApiTask["status"],
) {
  if (status === "todo" || status === "backlog") {
    return 0;
  }
  if (status === "done") {
    return 100;
  }
  if (status === "in_progress") {
    return Math.min(Math.max(currentProgress || 1, 1), 99);
  }
  return status === "blocked" && currentProgress === 100 ? 99 : currentProgress;
}

function normalizeNullableValue(
  value: string | null | undefined,
  fallback?: string | null,
) {
  if (value !== undefined) {
    return normalizeNullableText(value);
  }

  return normalizeNullableText(fallback);
}

function normalizeNullableText(value?: string | null) {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length > 0 ? trimmedValue : null;
}
