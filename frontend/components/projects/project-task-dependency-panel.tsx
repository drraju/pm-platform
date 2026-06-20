import React from "react";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import type { ApiTask, ApiTaskDependency } from "@/features/projects";

type DependencyMutationInput = {
  dependencyType: ApiTaskDependency["dependencyType"];
  lagDays?: number;
  predecessorTaskId: string;
  successorTaskId: string;
};

type ProjectTaskDependencyPanelProps = {
  canManageDependencies?: boolean;
  dependencies: ApiTaskDependency[];
  isSaving?: boolean;
  onCreateDependency?: (input: DependencyMutationInput) => void;
  onDeleteDependency?: (dependencyId: string) => void;
  onUpdateDependency?: (
    dependencyId: string,
    input: DependencyMutationInput,
  ) => void;
  tasks: ApiTask[];
};

type DependencyFormState = {
  dependencyType: ApiTaskDependency["dependencyType"];
  lagDays: string;
  predecessorTaskId: string;
  successorTaskId: string;
};

const dependencyTypeOptions: Array<{
  description: string;
  label: string;
  value: ApiTaskDependency["dependencyType"];
}> = [
  {
    description: "Successor starts after predecessor finishes.",
    label: "Finish-to-Start",
    value: "FS",
  },
  {
    description: "Successor starts when predecessor starts.",
    label: "Start-to-Start",
    value: "SS",
  },
  {
    description: "Successor finishes when predecessor finishes.",
    label: "Finish-to-Finish",
    value: "FF",
  },
  {
    description: "Successor finishes after predecessor starts.",
    label: "Start-to-Finish",
    value: "SF",
  },
];

export function ProjectTaskDependencyPanel({
  canManageDependencies = false,
  dependencies,
  isSaving = false,
  onCreateDependency,
  onDeleteDependency,
  onUpdateDependency,
  tasks,
}: ProjectTaskDependencyPanelProps) {
  const [dependencyPendingDelete, setDependencyPendingDelete] =
    React.useState<ApiTaskDependency | null>(null);
  const [form, setForm] = React.useState<DependencyFormState>(() =>
    createEmptyDependencyForm(),
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedDependency, setSelectedDependency] =
    React.useState<ApiTaskDependency | null>(null);
  const eligibleTasks = React.useMemo(() => getEligibleDependencyTasks(tasks), [tasks]);

  function openCreateDialog() {
    setSelectedDependency(null);
    setForm(createEmptyDependencyForm());
    setFormError(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(dependency: ApiTaskDependency) {
    setSelectedDependency(dependency);
    setForm({
      dependencyType: dependency.dependencyType,
      lagDays: String(dependency.lagDays ?? 0),
      predecessorTaskId: dependency.predecessorTaskId,
      successorTaskId: dependency.successorTaskId,
    });
    setFormError(null);
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setSelectedDependency(null);
    setForm(createEmptyDependencyForm());
    setFormError(null);
    setIsDialogOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.predecessorTaskId === form.successorTaskId) {
      setFormError("Dependency endpoints must be different plan items.");
      return;
    }

    const payload: DependencyMutationInput = {
      dependencyType: form.dependencyType,
      lagDays: form.lagDays.trim() ? Number.parseInt(form.lagDays, 10) : 0,
      predecessorTaskId: form.predecessorTaskId,
      successorTaskId: form.successorTaskId,
    };

    if (selectedDependency && onUpdateDependency) {
      onUpdateDependency(selectedDependency.id, payload);
      closeDialog();
      return;
    }

    if (onCreateDependency) {
      onCreateDependency(payload);
      closeDialog();
    }
  }

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Dependencies</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage scheduling links between leaf tasks and milestones using the Phase 2 dependency model.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            {dependencies.length}
          </span>
          {canManageDependencies && onCreateDependency ? (
            <button
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              onClick={openCreateDialog}
              type="button"
            >
              Add Dependency
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Predecessor</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Successor</th>
              <th className="px-3 py-3">Lag</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {dependencies.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>
                  No task dependencies have been recorded yet.
                </td>
              </tr>
            ) : null}
            {dependencies.map((dependency) => (
              <tr key={dependency.id}>
                <td className="px-3 py-3 font-medium text-slate-950">
                  {formatDependencyTask(dependency.predecessorTask)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {dependency.dependencyType}
                </td>
                <td className="px-3 py-3 font-medium text-slate-950">
                  {formatDependencyTask(dependency.successorTask)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatLagDays(dependency.lagDays)}
                </td>
                <td className="px-3 py-3">
                  {canManageDependencies ? (
                    <div className="flex flex-wrap gap-2">
                      {onUpdateDependency ? (
                        <button
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          onClick={() => openEditDialog(dependency)}
                          type="button"
                        >
                          Edit
                        </button>
                      ) : null}
                      {onDeleteDependency ? (
                        <button
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                          onClick={() => setDependencyPendingDelete(dependency)}
                          type="button"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDialogOpen ? (
        <AppModal
          footer={
            <>
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={closeDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  isSaving || !form.predecessorTaskId || !form.successorTaskId
                }
                form="project-task-dependency-form"
                type="submit"
              >
                {isSaving ? "Saving..." : "Save dependency"}
              </button>
            </>
          }
          labelledById="project-task-dependency-dialog-title"
          onClose={closeDialog}
          title={selectedDependency ? "Edit Dependency" : "Add Dependency"}
          widthClassName="max-w-3xl"
        >
          <ModalForm id="project-task-dependency-form" onSubmit={handleSubmit}>
            <ModalFormSection
              description="Dependencies link two eligible plan items inside the same project schedule."
              title="Dependency Detail"
            >
              {formError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}
              <ModalFormGrid className="md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Predecessor
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        predecessorTaskId: event.target.value,
                      })
                    }
                    value={form.predecessorTaskId}
                  >
                    <option value="">Select predecessor</option>
                    {eligibleTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Successor
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        successorTaskId: event.target.value,
                      })
                    }
                    value={form.successorTaskId}
                  >
                    <option value="">Select successor</option>
                    {eligibleTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Dependency Type
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        dependencyType:
                          event.target.value as ApiTaskDependency["dependencyType"],
                      })
                    }
                    value={form.dependencyType}
                  >
                    {dependencyTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-slate-500">
                    {
                      dependencyTypeOptions.find(
                        (option) => option.value === form.dependencyType,
                      )?.description
                    }
                  </span>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Lag Days
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm({ ...form, lagDays: event.target.value })
                    }
                    step="1"
                    type="number"
                    value={form.lagDays}
                  />
                </label>
              </ModalFormGrid>
            </ModalFormSection>
          </ModalForm>
        </AppModal>
      ) : null}

      {dependencyPendingDelete ? (
        <AppModal
          footer={
            <>
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setDependencyPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                onClick={() => {
                  onDeleteDependency?.(dependencyPendingDelete.id);
                  setDependencyPendingDelete(null);
                }}
                type="button"
              >
                Confirm delete
              </button>
            </>
          }
          labelledById="delete-task-dependency-dialog-title"
          onClose={() => setDependencyPendingDelete(null)}
          title="Delete Dependency"
          widthClassName="max-w-md"
        >
          <p className="mt-2 text-sm text-slate-600">
            Delete the dependency from{" "}
            <span className="font-semibold">
              {formatDependencyTask(dependencyPendingDelete.predecessorTask)}
            </span>{" "}
            to{" "}
            <span className="font-semibold">
              {formatDependencyTask(dependencyPendingDelete.successorTask)}
            </span>
            ?
          </p>
        </AppModal>
      ) : null}
    </section>
  );
}

function createEmptyDependencyForm(): DependencyFormState {
  return {
    dependencyType: "FS",
    lagDays: "0",
    predecessorTaskId: "",
    successorTaskId: "",
  };
}

function getEligibleDependencyTasks(tasks: ApiTask[]) {
  const childrenByParentId = new Map<string | null, ApiTask[]>();

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId ?? null;
    const childTasks = childrenByParentId.get(parentTaskId) ?? [];
    childTasks.push(task);
    childrenByParentId.set(parentTaskId, childTasks);
  }

  return tasks
    .filter((task) => {
      if (task.taskKind === "milestone") {
        return true;
      }

      if (task.taskKind === "summary") {
        return false;
      }

      return (childrenByParentId.get(task.id) ?? []).length === 0;
    })
    .sort((leftTask, rightTask) => {
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

      return leftTask.title.localeCompare(rightTask.title);
    })
    .map((task) => ({
      id: task.id,
      label: `${task.taskKind === "milestone" ? "◆ " : ""}${task.title}`,
    }));
}

function formatDependencyTask(task?: ApiTask | null) {
  if (!task) {
    return "Unknown plan item";
  }

  return `${task.taskKind === "milestone" ? "◆ " : ""}${task.title}`;
}

function formatLagDays(value: number) {
  if (!value) {
    return "0 days";
  }

  return `${value} day${Math.abs(value) === 1 ? "" : "s"}`;
}
