import React from "react";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import type {
  ApiProjectBaseline,
  ApiProjectBaselineTask,
  ApiTask,
} from "@/features/projects";

type ProjectWorkspaceBaselinesProps = {
  baselines: ApiProjectBaseline[];
  canCaptureBaseline?: boolean;
  currentTasks: ApiTask[];
  isSaving?: boolean;
  onCaptureBaseline?: (input: {
    name: string;
    setAsCurrent?: boolean;
    status?: string;
  }) => void;
};

export function ProjectWorkspaceBaselines({
  baselines,
  canCaptureBaseline = false,
  currentTasks,
  isSaving = false,
  onCaptureBaseline,
}: ProjectWorkspaceBaselinesProps) {
  const [captureName, setCaptureName] = React.useState("Approved Delivery Baseline");
  const [captureError, setCaptureError] = React.useState<string | null>(null);
  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = React.useState(false);
  const [selectedBaselineId, setSelectedBaselineId] = React.useState<string | null>(
    baselines[0]?.id ?? null,
  );

  React.useEffect(() => {
    if (!selectedBaselineId && baselines[0]?.id) {
      setSelectedBaselineId(baselines[0].id);
    }
  }, [baselines, selectedBaselineId]);

  const selectedBaseline =
    baselines.find((baseline) => baseline.id === selectedBaselineId) ?? baselines[0] ?? null;
  const baselineRows = React.useMemo(
    () =>
      selectedBaseline
        ? buildBaselineRows(selectedBaseline.tasks ?? [], currentTasks)
        : [],
    [currentTasks, selectedBaseline],
  );

  function closeCaptureDialog() {
    setCaptureError(null);
    setCaptureName("Approved Delivery Baseline");
    setIsCaptureDialogOpen(false);
  }

  function handleCaptureSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!captureName.trim()) {
      setCaptureError("Baseline name is required.");
      return;
    }

    onCaptureBaseline?.({
      name: captureName.trim(),
      setAsCurrent: true,
      status: "approved",
    });
    closeCaptureDialog();
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Baselines</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review immutable baseline snapshots and compare them with the current plan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {baselines.length}
          </span>
          {canCaptureBaseline && onCaptureBaseline ? (
            <button
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              onClick={() => setIsCaptureDialogOpen(true)}
              type="button"
            >
              Capture Baseline
            </button>
          ) : null}
        </div>
      </div>

      {baselines.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No baseline snapshots have been captured yet.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
            <section className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Snapshot History
              </h3>
              <div className="mt-3 space-y-2">
                {baselines.map((baseline) => {
                  const isSelected = baseline.id === selectedBaseline?.id;
                  return (
                    <button
                      className={`w-full rounded-md border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-brand bg-white shadow-soft"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      key={baseline.id}
                      onClick={() => setSelectedBaselineId(baseline.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">
                            {baseline.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Version {baseline.versionNumber}
                          </p>
                        </div>
                        {baseline.isCurrent ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatDateTime(baseline.capturedAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-4">
              {selectedBaseline ? (
                <>
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {selectedBaseline.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Version {selectedBaseline.versionNumber} captured{" "}
                        {formatDateTime(selectedBaseline.capturedAt)}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-900">Status:</span>{" "}
                        {selectedBaseline.status}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Tasks:</span>{" "}
                        {selectedBaseline.tasks?.length ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3">WBS</th>
                          <th className="px-3 py-3">Plan Item</th>
                          <th className="px-3 py-3">Baseline Dates</th>
                          <th className="px-3 py-3">Current Dates</th>
                          <th className="px-3 py-3">Date Variance</th>
                          <th className="px-3 py-3">Baseline Hours</th>
                          <th className="px-3 py-3">Current Hours</th>
                          <th className="px-3 py-3">Hour Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {baselineRows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-slate-500" colSpan={8}>
                              No baseline snapshot rows are available for this version.
                            </td>
                          </tr>
                        ) : null}
                        {baselineRows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-600">
                              {row.wbs}
                            </td>
                            <td className="px-3 py-3">
                              <div>
                                <p className="font-semibold text-slate-950">
                                  {row.taskKind === "milestone" ? "◆ " : ""}
                                  {row.taskTitle}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                                  {row.taskKind}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatDateRange(row.plannedStartDate, row.plannedEndDate)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatDateRange(
                                row.currentTask?.plannedStartDate,
                                row.currentTask?.plannedEndDate,
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatVarianceDays(row)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatNumber(row.estimatedHours)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatNumber(row.currentTask?.estimatedHours)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatHourVariance(
                                row.estimatedHours,
                                row.currentTask?.estimatedHours,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </>
      )}

      {isCaptureDialogOpen ? (
        <AppModal
          footer={
            <>
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={closeCaptureDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving || !captureName.trim()}
                form="capture-project-baseline-form"
                type="submit"
              >
                {isSaving ? "Saving..." : "Capture baseline"}
              </button>
            </>
          }
          labelledById="capture-project-baseline-dialog-title"
          onClose={closeCaptureDialog}
          title="Capture Baseline"
          widthClassName="max-w-2xl"
        >
          <ModalForm
            id="capture-project-baseline-form"
            onSubmit={handleCaptureSubmit}
          >
            <ModalFormSection
              description="Create an immutable snapshot of the current project plan for later variance analysis."
              title="Baseline Detail"
            >
              {captureError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {captureError}
                </div>
              ) : null}
              <ModalFormGrid className="md:grid-cols-1">
                <label className="block text-sm font-medium text-slate-700">
                  Baseline Name
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setCaptureName(event.target.value)}
                    value={captureName}
                  />
                </label>
              </ModalFormGrid>
            </ModalFormSection>
          </ModalForm>
        </AppModal>
      ) : null}
    </section>
  );
}

type BaselineRow = ApiProjectBaselineTask & {
  currentTask?: ApiTask | null;
  wbs: string;
};

function buildBaselineRows(
  baselineTasks: ApiProjectBaselineTask[],
  currentTasks: ApiTask[],
): BaselineRow[] {
  const currentTasksById = new Map(currentTasks.map((task) => [task.id, task]));
  const tasksByParentId = new Map<string | null, ApiProjectBaselineTask[]>();
  const rows: BaselineRow[] = [];

  for (const task of baselineTasks) {
    const parentTaskId = task.parentTaskId ?? null;
    const childTasks = tasksByParentId.get(parentTaskId) ?? [];
    childTasks.push(task);
    tasksByParentId.set(parentTaskId, childTasks);
  }

  for (const [parentTaskId, siblingTasks] of tasksByParentId.entries()) {
    tasksByParentId.set(parentTaskId, sortBaselineTasks(siblingTasks));
  }

  function visit(parentTaskId: string | null, prefix: string) {
    const siblingTasks = tasksByParentId.get(parentTaskId) ?? [];

    siblingTasks.forEach((task, index) => {
      const wbs = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      rows.push({
        ...task,
        currentTask: task.taskId ? currentTasksById.get(task.taskId) ?? null : null,
        wbs,
      });
      visit(task.taskId ?? null, wbs);
    });
  }

  visit(null, "");
  return rows;
}

function sortBaselineTasks(tasks: ApiProjectBaselineTask[]) {
  return [...tasks].sort((leftTask, rightTask) => {
    const leftSequenceNumber =
      typeof leftTask.sequenceNumber === "number"
        ? leftTask.sequenceNumber
        : Number.MAX_SAFE_INTEGER;
    const rightSequenceNumber =
      typeof rightTask.sequenceNumber === "number"
        ? rightTask.sequenceNumber
        : Number.MAX_SAFE_INTEGER;

    if (leftSequenceNumber !== rightSequenceNumber) {
      return leftSequenceNumber - rightSequenceNumber;
    }

    return leftTask.taskTitle.localeCompare(rightTask.taskTitle);
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
) {
  if (!startDate && !endDate) {
    return "No planned dates";
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatVarianceDays(row: BaselineRow) {
  if (!row.plannedEndDate || !row.currentTask?.plannedEndDate) {
    return "—";
  }

  const baselineTime = new Date(row.plannedEndDate).getTime();
  const currentTime = new Date(row.currentTask.plannedEndDate).getTime();
  const differenceInDays = Math.round(
    (currentTime - baselineTime) / (1000 * 60 * 60 * 24),
  );

  if (differenceInDays === 0) {
    return "On plan";
  }

  return `${differenceInDays > 0 ? "+" : ""}${differenceInDays} days`;
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatHourVariance(
  baselineHours?: number | null,
  currentHours?: number | null,
) {
  if (typeof baselineHours !== "number" || typeof currentHours !== "number") {
    return "—";
  }

  const variance = currentHours - baselineHours;
  if (variance === 0) {
    return "On plan";
  }

  return `${variance > 0 ? "+" : ""}${formatNumber(variance)}h`;
}
