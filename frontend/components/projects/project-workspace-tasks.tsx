import React from "react";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import type { ApiProjectMember, ApiTask } from "@/features/projects";

type TaskOperationInput = {
  actualEndDate?: string;
  actualStartDate?: string;
  assigneeId?: string;
  description?: string;
  dueDate?: string;
  percentComplete?: number;
  plannedEndDate?: string;
  plannedStartDate?: string;
  priority?: string;
  remarks?: string;
  status?: ApiTask["status"];
  title?: string;
};

type ProjectWorkspaceTasksProps = {
  canCreateTasks?: boolean;
  canDeleteTasks?: boolean;
  canEditTasks?: boolean;
  canManageTasks?: boolean;
  canReassignTasks?: boolean;
  currentUserId?: string | null;
  isSaving?: boolean;
  members?: ApiProjectMember[];
  onCreateTask?: (input: Required<Pick<TaskOperationInput, "title">> & TaskOperationInput) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, input: TaskOperationInput) => void;
  tasks: ApiTask[];
};

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

const priorities = ["low", "medium", "high", "critical"];

export function ProjectWorkspaceTasks({
  canCreateTasks = false,
  canDeleteTasks = false,
  canEditTasks = false,
  canManageTasks = false,
  canReassignTasks = false,
  currentUserId = null,
  isSaving = false,
  members = [],
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  tasks,
}: ProjectWorkspaceTasksProps) {
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit" | "reassign" | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = React.useState<ApiTask | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<ApiTask | null>(null);
  const [form, setForm] = React.useState<TaskFormState>(() => createEmptyTaskForm());
  const canCreateTask = (canManageTasks || canCreateTasks) && Boolean(onCreateTask);
  const canEditTask = canManageTasks || canEditTasks;
  const canDeleteTask = canManageTasks || canDeleteTasks;
  const canReassignTask = canManageTasks || canReassignTasks;
  const canEditTaskFields = dialogMode === "create" ? canCreateTask : canEditTask;

  function openCreateDialog() {
    setSelectedTask(null);
    setForm(createEmptyTaskForm());
    setDialogMode("create");
  }

  function openTaskDialog(task: ApiTask, mode: "edit" | "reassign") {
    setSelectedTask(task);
    setForm(createTaskForm(task));
    setDialogMode(mode);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedTask(null);
    setForm(createEmptyTaskForm());
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toTaskPayload(form);

    if (dialogMode === "create" && payload.title && onCreateTask) {
      onCreateTask({ ...payload, title: payload.title });
      closeDialog();
      return;
    }

    if ((dialogMode === "edit" || dialogMode === "reassign") && selectedTask && onUpdateTask) {
      onUpdateTask(
        selectedTask.id,
        dialogMode === "reassign"
          ? { assigneeId: payload.assigneeId }
          : payload,
      );
      closeDialog();
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Tasks</h2>
          <p className="mt-1 text-sm text-slate-500">
            Project tasks, assignments, status, and due dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {tasks.length}
          </span>
          {canCreateTask ? (
            <button
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
              onClick={openCreateDialog}
              type="button"
            >
              Create Task
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Task</th>
              <th className="px-3 py-3">Assignee</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Due Date</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={6}>
                  No tasks yet.
                </td>
              </tr>
            ) : null}
            {tasks.map((task) => {
              const canOperateOnTask =
                canEditTask ||
                canDeleteTask ||
                canReassignTask ||
                task.assigneeId === currentUserId;

              return (
                <tr key={task.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-950">{task.title}</p>
                    {task.description ? (
                      <p className="mt-1 max-w-xs text-xs text-slate-500">
                        {task.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatAssignee(task)}
                  </td>
                  <td className="px-3 py-3 capitalize text-slate-600">
                    {formatLabel(task.status)}
                  </td>
                  <td className="px-3 py-3 capitalize text-slate-600">
                    {formatLabel(task.priority)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatDate(task.dueDate)}
                  </td>
                  <td className="px-3 py-3">
                    {canOperateOnTask ? (
                      <div className="flex flex-wrap gap-2">
                        {canEditTask ? (
                          <button
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => openTaskDialog(task, "edit")}
                            type="button"
                          >
                            Edit
                          </button>
                        ) : null}
                        {canReassignTask || task.assigneeId === currentUserId ? (
                          <button
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => openTaskDialog(task, "reassign")}
                            type="button"
                          >
                            Reassign
                          </button>
                        ) : null}
                        {canDeleteTask && onDeleteTask ? (
                          <button
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            disabled={isSaving}
                            onClick={() => setTaskPendingDelete(task)}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {dialogMode ? (
        <AppModal
          description={
            dialogMode === "reassign"
              ? "Move this task to another project team member."
              : "Update task details, assignment, status, and priority."
          }
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
                disabled={isSaving || (dialogMode === "create" && !form.title.trim())}
                form="project-task-form"
                type="submit"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </>
          }
          labelledById="project-task-dialog-title"
          onClose={closeDialog}
          title={
            dialogMode === "create"
              ? "Create Task"
              : dialogMode === "reassign"
                ? "Reassign Task"
                : "Edit Task"
          }
          widthClassName="max-w-2xl"
        >
          <ModalForm id="project-task-form" onSubmit={handleSubmit}>
            <ModalFormSection
              description={
                dialogMode === "reassign"
                  ? "Update the assignee while keeping ownership controls visible."
                  : "Capture the task summary, scheduling, and execution fields in one place."
              }
              title="Task Detail"
            >
              <ModalFormGrid className="md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Title
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required={dialogMode === "create"}
                  value={form.title}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={form.description}
                />
              </label>
              <TaskAssigneeSelect
                members={members}
                onChange={(assigneeId) =>
                  setForm((current) => ({ ...current, assigneeId }))
                }
                value={form.assigneeId}
              />
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ApiTask["status"],
                    }))
                  }
                  value={form.status}
                >
                  {taskStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Priority
                <select
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  value={form.priority}
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Due Date
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  type="date"
                  value={form.dueDate}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Planned Start
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      plannedStartDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={form.plannedStartDate}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Planned End
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      plannedEndDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={form.plannedEndDate}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Percent Complete
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  max={100}
                  min={0}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      percentComplete: event.target.value,
                    }))
                  }
                  type="number"
                  value={form.percentComplete}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Remarks
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                  disabled={dialogMode === "reassign" || !canEditTaskFields}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, remarks: event.target.value }))
                  }
                  value={form.remarks}
                />
              </label>
              </ModalFormGrid>
            </ModalFormSection>
          </ModalForm>
        </AppModal>
      ) : null}

      {taskPendingDelete ? (
        <AppModal
          footer={
            <>
              <button
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setTaskPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                onClick={() => {
                  onDeleteTask?.(taskPendingDelete.id);
                  setTaskPendingDelete(null);
                }}
                type="button"
              >
                Confirm delete
              </button>
            </>
          }
          labelledById="delete-task-dialog-title"
          onClose={() => setTaskPendingDelete(null)}
          title="Delete Task"
          widthClassName="max-w-md"
        >
            <p className="mt-2 text-sm text-slate-600">
              Delete "{taskPendingDelete.title}"? This removes it from the
              project workspace.
            </p>
        </AppModal>
      ) : null}
    </section>
  );
}

function TaskAssigneeSelect({
  members,
  onChange,
  value,
}: {
  members: ApiProjectMember[];
  onChange: (assigneeId: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      Assignee
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.id} value={member.userId}>
            {member.user
              ? `${member.user.firstName} ${member.user.lastName}`
              : member.userId}
          </option>
        ))}
      </select>
    </label>
  );
}

type TaskFormState = {
  assigneeId: string;
  description: string;
  dueDate: string;
  percentComplete: string;
  plannedEndDate: string;
  plannedStartDate: string;
  priority: string;
  remarks: string;
  status: ApiTask["status"];
  title: string;
};

function createEmptyTaskForm(): TaskFormState {
  return {
    assigneeId: "",
    description: "",
    dueDate: "",
    percentComplete: "0",
    plannedEndDate: "",
    plannedStartDate: "",
    priority: "medium",
    remarks: "",
    status: "todo",
    title: "",
  };
}

function createTaskForm(task: ApiTask): TaskFormState {
  return {
    assigneeId: task.assigneeId ?? "",
    description: task.description ?? "",
    dueDate: task.dueDate ?? "",
    percentComplete: String(task.percentComplete ?? 0),
    plannedEndDate: task.plannedEndDate ?? "",
    plannedStartDate: task.plannedStartDate ?? "",
    priority: task.priority,
    remarks: task.remarks ?? "",
    status: task.status,
    title: task.title,
  };
}

function toTaskPayload(form: TaskFormState): TaskOperationInput {
  return {
    assigneeId: form.assigneeId || undefined,
    description: form.description,
    dueDate: form.dueDate || undefined,
    percentComplete: Number(form.percentComplete || 0),
    plannedEndDate: form.plannedEndDate || undefined,
    plannedStartDate: form.plannedStartDate || undefined,
    priority: form.priority,
    remarks: form.remarks,
    status: form.status,
    title: form.title.trim(),
  };
}

function formatAssignee(task: ApiTask) {
  return task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`
    : "Unassigned";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
