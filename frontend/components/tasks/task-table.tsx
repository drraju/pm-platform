import React from "react";
import type { ApiProjectMember, ApiTask } from "@/lib/api/client";

type TaskTableProps = {
  emptyMessage: string;
  isLoading: boolean;
  isSavingTaskId?: string | null;
  membersByProjectId?: Record<string, ApiProjectMember[]>;
  onUpdateTask?: (
    taskId: string,
    input: {
      assigneeId?: string;
      percentComplete?: number;
      remarks?: string;
      status?: ApiTask["status"];
    },
  ) => void;
  tasks: ApiTask[];
};

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

export function TaskTable({
  emptyMessage,
  isLoading,
  isSavingTaskId,
  membersByProjectId = {},
  onUpdateTask,
  tasks,
}: TaskTableProps) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="hidden grid-cols-[1.15fr_0.85fr_0.7fr_0.65fr_0.75fr_1fr_1.25fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Task</span>
        <span>Project</span>
        <span>Status</span>
        <span>Complete</span>
        <span>Due Date</span>
        <span>Next Step</span>
        <span>Operations</span>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading tasks...</p>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
        ) : null}

        {tasks.map((task) => {
          const dueState = getDueState(task);
          const projectMembers = membersByProjectId[task.projectId] ?? [];

          return (
            <EditableTaskRow
              dueState={dueState}
              key={task.id}
              members={projectMembers}
              onUpdateTask={onUpdateTask}
              task={task}
              isSaving={isSavingTaskId === task.id}
            />
          );
        })}
      </div>
    </section>
  );
}

function EditableTaskRow({
  dueState,
  isSaving,
  members,
  onUpdateTask,
  task,
}: {
  dueState: ReturnType<typeof getDueState>;
  isSaving: boolean;
  members: ApiProjectMember[];
  onUpdateTask?: TaskTableProps["onUpdateTask"];
  task: ApiTask;
}) {
  const [status, setStatus] = React.useState(task.status);
  const [percentComplete, setPercentComplete] = React.useState(
    String(task.percentComplete ?? 0),
  );
  const [remarks, setRemarks] = React.useState(task.remarks ?? "");
  const [assigneeId, setAssigneeId] = React.useState(task.assigneeId ?? "");

  React.useEffect(() => {
    setStatus(task.status);
    setPercentComplete(String(task.percentComplete ?? 0));
    setRemarks(task.remarks ?? "");
    setAssigneeId(task.assigneeId ?? "");
  }, [task]);

  const canEdit = Boolean(onUpdateTask);
  const isDirty =
    status !== task.status ||
    Number(percentComplete || 0) !== (task.percentComplete ?? 0) ||
    remarks !== (task.remarks ?? "") ||
    assigneeId !== (task.assigneeId ?? "");

  return (
    <article className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.15fr_0.85fr_0.7fr_0.65fr_0.75fr_1fr_1.25fr] md:items-start">
      <div>
        <h2 className="font-semibold text-slate-950">{task.title}</h2>
        <p className="mt-1 text-xs text-slate-500 md:hidden">
          {task.project?.name ?? "No project"}
        </p>
        {task.remarks ? (
          <p className="mt-2 text-xs text-slate-500">{task.remarks}</p>
        ) : null}
      </div>
      <span className="hidden text-slate-600 md:block">
        {task.project?.name ?? "No project"}
      </span>
      <span className="capitalize text-slate-700">
        <span className="font-medium text-slate-500 md:hidden">Status: </span>
        {formatLabel(task.status)}
      </span>
      <span className="text-slate-600">
        <span className="font-medium text-slate-500 md:hidden">Complete: </span>
        {task.percentComplete ?? 0}%
      </span>
      <span className="flex flex-wrap items-center gap-2 text-slate-600">
        <span className="font-medium text-slate-500 md:hidden">Due: </span>
        {formatDate(task.dueDate)}
        {dueState ? (
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${dueState.className}`}
          >
            {dueState.label}
          </span>
        ) : null}
      </span>
      <span
        className="min-w-0 truncate text-slate-600"
        title={task.latestExecutionUpdate?.nextStep ?? undefined}
      >
        <span className="font-medium text-slate-500 md:hidden">
          Next Step:{" "}
        </span>
        {task.latestExecutionUpdate?.nextStep ?? "—"}
      </span>
      <div className="space-y-2">
        {canEdit ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Status
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) =>
                    setStatus(event.target.value as ApiTask["status"])
                  }
                  value={status}
                >
                  {taskStatuses.map((taskStatus) => (
                    <option key={taskStatus.value} value={taskStatus.value}>
                      {taskStatus.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Complete %
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  max={100}
                  min={0}
                  onChange={(event) => setPercentComplete(event.target.value)}
                  type="number"
                  value={percentComplete}
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-slate-600">
              Remarks
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setRemarks(event.target.value)}
                value={remarks}
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Reassign
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setAssigneeId(event.target.value)}
                value={assigneeId}
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
            <button
              className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isDirty || isSaving}
              onClick={() =>
                onUpdateTask?.(task.id, {
                  assigneeId: assigneeId || undefined,
                  percentComplete: Number(percentComplete || 0),
                  remarks,
                  status,
                })
              }
              type="button"
            >
              {isSaving ? "Saving..." : "Save updates"}
            </button>
          </>
        ) : (
          <span className="text-slate-500">Inline updates unavailable</span>
        )}
      </div>
    </article>
  );
}

function getDueState(task: ApiTask) {
  if (!task.dueDate || task.status === "done") {
    return null;
  }

  const today = toDateOnly(new Date());
  const dueDate = toDateOnly(new Date(task.dueDate));
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  if (dueDate < today) {
    return {
      className: "bg-red-50 text-red-700",
      label: "Overdue",
    };
  }

  if (dueDate <= nextWeek) {
    return {
      className: "bg-amber-50 text-amber-700",
      label: "Due this week",
    };
  }

  return null;
}

function toDateOnly(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
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
