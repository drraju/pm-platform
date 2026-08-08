import React from "react";
import { buildExecutionUpdatePayload } from "@/components/projects/execution-update-payload";
import { resolveProjectUiCapabilities } from "@/features/auth";
import type { ApiProjectMember, ApiTask } from "@/lib/api/client";

type ExecutionUpdateInput = ReturnType<typeof buildExecutionUpdatePayload>;

export type TaskPriority = "critical" | "high" | "medium" | "low";

type TaskTableProps = {
  currentUserId?: string | null;
  emptyMessage: string;
  isLoading: boolean;
  isSavingTaskId?: string | null;
  membersByProjectId?: Record<string, ApiProjectMember[]>;
  onRecordExecutionUpdate?: (
    task: ApiTask,
    input: ExecutionUpdateInput,
  ) => Promise<void> | void;
  permissionKeys?: string[];
  roleNames?: string[];
  saveStateByTaskId?: Record<string, "saving" | "saved" | "error">;
  tasks: ApiTask[];
};

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

const taskPriorities: Array<{ label: string; value: TaskPriority }> = [
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export function TaskTable({
  currentUserId = null,
  emptyMessage,
  isLoading,
  isSavingTaskId,
  membersByProjectId = {},
  onRecordExecutionUpdate,
  permissionKeys = [],
  roleNames = [],
  saveStateByTaskId = {},
  tasks,
}: TaskTableProps) {
  return (
    <section
      aria-label="My Tasks queue"
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      <div className="max-h-[min(70vh,820px)] overflow-auto">
        <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                "Task",
                "Project",
                "Priority",
                "Status",
                "Progress",
                "Due",
                "Today's Update",
                "Next Step",
              ].map((heading) => (
                <th className="px-2.5 py-2 font-semibold" key={heading} scope="col">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={8}>
                  Loading tasks...
                </td>
              </tr>
            ) : null}
            {!isLoading && tasks.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={8}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {tasks.map((task) => (
              <EditableTaskRow
                currentUserId={currentUserId}
                isSaving={isSavingTaskId === task.id}
                key={task.id}
                members={membersByProjectId[task.projectId] ?? []}
                onRecordExecutionUpdate={onRecordExecutionUpdate}
                permissionKeys={permissionKeys}
                roleNames={roleNames}
                saveState={saveStateByTaskId[task.id]}
                task={task}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditableTaskRow({
  currentUserId,
  isSaving,
  members,
  onRecordExecutionUpdate,
  permissionKeys,
  roleNames,
  saveState,
  task,
}: {
  currentUserId?: string | null;
  isSaving: boolean;
  members: ApiProjectMember[];
  onRecordExecutionUpdate?: TaskTableProps["onRecordExecutionUpdate"];
  permissionKeys: string[];
  roleNames: string[];
  saveState?: "saving" | "saved" | "error";
  task: ApiTask;
}) {
  const [status, setStatus] = React.useState(task.status);
  const [priority, setPriority] = React.useState(task.priority);
  const [percentComplete, setPercentComplete] = React.useState(
    String(task.percentComplete ?? 0),
  );
  const [updateNotes, setUpdateNotes] = React.useState(
    task.latestExecutionUpdate?.updateNotes ?? "",
  );
  const [nextStep, setNextStep] = React.useState(
    task.latestExecutionUpdate?.nextStep ?? "",
  );
  const [nextOwnerId, setNextOwnerId] = React.useState(
    task.latestExecutionUpdate?.nextActionOwnerId ?? task.assigneeId ?? "",
  );

  React.useEffect(() => {
    setStatus(task.status);
    setPriority(task.priority);
    setPercentComplete(String(task.percentComplete ?? 0));
    setUpdateNotes(task.latestExecutionUpdate?.updateNotes ?? "");
    setNextStep(task.latestExecutionUpdate?.nextStep ?? "");
    setNextOwnerId(
      task.latestExecutionUpdate?.nextActionOwnerId ?? task.assigneeId ?? "",
    );
  }, [task]);

  const capabilities = resolveProjectUiCapabilities({
    currentUserId,
    members,
    permissionKeys,
    project: task.project,
    roleNames,
    task,
  });
  const canEditExecution =
    Boolean(onRecordExecutionUpdate) && capabilities.canExecuteAssignedTask;
  const canEditPriority =
    Boolean(onRecordExecutionUpdate) && capabilities.canManageProjectTasks;
  const isDirty =
    status !== task.status ||
    priority !== task.priority ||
    Number(percentComplete || 0) !== (task.percentComplete ?? 0) ||
    updateNotes !== (task.latestExecutionUpdate?.updateNotes ?? "") ||
    nextStep !== (task.latestExecutionUpdate?.nextStep ?? "") ||
    nextOwnerId !==
      (task.latestExecutionUpdate?.nextActionOwnerId ?? task.assigneeId ?? "");

  async function saveRow() {
    if (!onRecordExecutionUpdate || !canEditExecution) {
      return;
    }
    const payload = buildExecutionUpdatePayload(task, {
      nextActionOwnerId: nextOwnerId || null,
      nextStep: nextStep || null,
      percentComplete: Number(percentComplete || 0),
      priority: canEditPriority ? priority : task.priority,
      status,
      updateNotes: updateNotes || null,
    });
    await onRecordExecutionUpdate(task, payload);
  }

  return (
    <tr className="align-top hover:bg-slate-50/70">
      <td className="max-w-[220px] px-2.5 py-2">
        <p className="font-semibold text-slate-950">{task.title}</p>
        {saveState === "saving" || isSaving ? (
          <p className="mt-1 text-[11px] font-medium text-slate-500">Saving...</p>
        ) : null}
        {saveState === "saved" ? (
          <p className="mt-1 text-[11px] font-medium text-emerald-700">Saved</p>
        ) : null}
        {saveState === "error" ? (
          <p className="mt-1 text-[11px] font-medium text-red-700">Error / Retry</p>
        ) : null}
      </td>
      <td className="px-2.5 py-2 text-slate-600">
        {task.project?.name ?? "No project"}
      </td>
      <td className="px-2.5 py-2">
        {canEditPriority ? (
          <select
            aria-label={`Priority for ${task.title}`}
            className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-xs font-semibold uppercase"
            disabled={isSaving}
            onBlur={() => {
              if (isDirty) {
                void saveRow();
              }
            }}
            onChange={(event) =>
              setPriority(event.target.value as ApiTask["priority"])
            }
            value={priority}
          >
            {taskPriorities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={`text-xs font-semibold uppercase ${priorityClass(task.priority)}`}>
            {task.priority}
          </span>
        )}
      </td>
      <td className="px-2.5 py-2">
        {canEditExecution ? (
          <select
            aria-label={`Status for ${task.title}`}
            className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-xs"
            disabled={isSaving}
            onBlur={() => {
              if (isDirty) {
                void saveRow();
              }
            }}
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
        ) : (
          <span className="capitalize text-slate-700">
            {formatLabel(task.status)}
          </span>
        )}
      </td>
      <td className="px-2.5 py-2">
        {canEditExecution ? (
          <input
            aria-label={`Progress for ${task.title}`}
            className="w-20 rounded border border-slate-300 px-1.5 py-1 text-xs"
            disabled={isSaving}
            max={100}
            min={0}
            onBlur={() => {
              if (isDirty) {
                void saveRow();
              }
            }}
            onChange={(event) => setPercentComplete(event.target.value)}
            type="number"
            value={percentComplete}
          />
        ) : (
          <span className="text-slate-600">{task.percentComplete ?? 0}%</span>
        )}
      </td>
      <td className="px-2.5 py-2 text-slate-600">{formatDate(task.dueDate)}</td>
      <td className="px-2.5 py-2">
        {canEditExecution ? (
          <textarea
            aria-label={`Today's update for ${task.title}`}
            className="min-h-14 w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
            disabled={isSaving}
            onBlur={() => {
              if (isDirty) {
                void saveRow();
              }
            }}
            onChange={(event) => setUpdateNotes(event.target.value)}
            value={updateNotes}
          />
        ) : (
          <span className="text-slate-600">
            {task.latestExecutionUpdate?.updateNotes ?? "—"}
          </span>
        )}
      </td>
      <td className="px-2.5 py-2">
        {canEditExecution ? (
          <input
            aria-label={`Next step for ${task.title}`}
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
            disabled={isSaving}
            onBlur={() => {
              if (isDirty) {
                void saveRow();
              }
            }}
            onChange={(event) => setNextStep(event.target.value)}
            value={nextStep}
          />
        ) : (
          <span className="text-slate-600">
            {task.latestExecutionUpdate?.nextStep ?? "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

function priorityClass(priority: string) {
  if (priority === "critical" || priority === "high") {
    return "text-red-700";
  }
  if (priority === "medium") {
    return "text-amber-700";
  }
  return "text-slate-600";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function compareTaskPriority(
  left: Pick<ApiTask, "priority">,
  right: Pick<ApiTask, "priority">,
) {
  return priorityRank(left.priority) - priorityRank(right.priority);
}

function priorityRank(priority?: string | null) {
  if (priority === "critical") return 0;
  if (priority === "high") return 1;
  if (priority === "medium") return 2;
  if (priority === "low") return 3;
  return 4;
}
