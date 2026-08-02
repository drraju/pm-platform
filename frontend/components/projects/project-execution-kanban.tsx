import React from "react";
import type {
  ApiProjectMember,
  ApiTask,
  ApiTaskDependency,
} from "@/features/projects";

type ExecutionUpdateInput = {
  assigneeId?: string | null;
  nextActionOwnerId?: string | null;
  nextStep?: string | null;
  percentComplete: number;
  priority: string;
  status: ApiTask["status"];
  targetCompletionDate?: string | null;
  updateNotes?: string | null;
};

type ProjectExecutionKanbanProps = {
  canUpdateTask: (task: ApiTask) => boolean;
  dependencies?: ApiTaskDependency[];
  isSaving?: boolean;
  members?: ApiProjectMember[];
  onOpenExecutionUpdate: (task: ApiTask, mode?: "edit" | "read-only") => void;
  onRecordExecutionUpdate?: (
    taskId: string,
    input: ExecutionUpdateInput,
  ) => Promise<void> | void;
  tasks: ApiTask[];
};

type KanbanColumn = {
  label: string;
  status: Exclude<ApiTask["status"], "backlog">;
};

type KanbanDropEvent = React.DragEvent<HTMLElement>;
type KanbanCardDragEvent = React.DragEvent<HTMLButtonElement>;

const kanbanColumns: KanbanColumn[] = [
  { label: "To Do", status: "todo" },
  { label: "In Progress", status: "in_progress" },
  { label: "Blocked", status: "blocked" },
  { label: "Done", status: "done" },
];

export function ProjectExecutionKanban({
  canUpdateTask,
  dependencies = [],
  isSaving = false,
  members = [],
  onOpenExecutionUpdate,
  onRecordExecutionUpdate,
  tasks,
}: ProjectExecutionKanbanProps) {
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const executionTasks = tasks.filter(
    (task) => task.status !== "backlog" && task.taskKind !== "summary",
  );

  async function dropTask(
    event: KanbanDropEvent,
    status: KanbanColumn["status"],
  ) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const task = executionTasks.find((candidate) => candidate.id === taskId);
    setDraggedTaskId(null);
    if (!task || task.status === status || !onRecordExecutionUpdate) {
      return;
    }

    await onRecordExecutionUpdate(task.id, createDragExecutionUpdate(task, status));
  }

  return (
    <div className="overflow-x-auto" data-testid="execution-kanban-board">
      <div className="grid min-w-[920px] gap-3 md:grid-cols-4">
        {kanbanColumns.map((column) => {
          const columnTasks = executionTasks.filter(
            (task) => task.status === column.status,
          );

          return (
            <section
              aria-label={`${column.label} column`}
              className="min-h-96 rounded-md border border-slate-200 bg-slate-50"
              key={column.status}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => void dropTask(event, column.status)}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {column.label}
                </h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-3 p-3">
                {columnTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                    No tasks
                  </p>
                ) : null}
                {columnTasks.map((task) => (
                  <KanbanCard
                    canDrag={
                      Boolean(onRecordExecutionUpdate) &&
                      !isSaving &&
                      canUpdateTask(task)
                    }
                    hasDependency={hasTaskDependency(task.id, dependencies)}
                    key={task.id}
                    members={members}
                    onDragStart={(event) => {
                      setDraggedTaskId(task.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task.id);
                    }}
                    onOpen={() =>
                      onOpenExecutionUpdate(
                        task,
                        canUpdateTask(task) ? "edit" : "read-only",
                      )
                    }
                    task={task}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  canDrag,
  hasDependency,
  members,
  onDragStart,
  onOpen,
  task,
}: {
  canDrag: boolean;
  hasDependency: boolean;
  members: ApiProjectMember[];
  onDragStart: (event: KanbanCardDragEvent) => void;
  onOpen: () => void;
  task: ApiTask;
}) {
  const progress = task.percentComplete ?? 0;

  return (
    <button
      className="block w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-75"
      draggable={canDrag}
      onClick={onOpen}
      onDragStart={canDrag ? onDragStart : undefined}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold leading-5 text-slate-950">
          {task.title}
        </h4>
        <span className={getPriorityClassName(task.priority)}>
          {formatLabel(task.priority)}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-2">
          <dt>Owner</dt>
          <dd className="truncate font-medium text-slate-800">
            {formatAssignee(task, members)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt>Due</dt>
          <dd className="font-medium text-slate-800">
            {formatDate(task.dueDate, "No due date")}
          </dd>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <dt>Progress</dt>
            <dd className="font-medium text-slate-800">{progress}%</dd>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-brand"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {task.status === "blocked" ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
              Blocked
            </span>
          ) : null}
          {hasDependency ? (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">
              Dependency
            </span>
          ) : null}
        </div>
        <div className="border-t border-slate-100 pt-2">
          <dt>Last update</dt>
          <dd className="mt-0.5 line-clamp-2 text-slate-700">
            {task.latestExecutionUpdate?.updateNotes ||
              task.latestExecutionUpdate?.nextStep ||
              "No execution update"}
          </dd>
        </div>
      </dl>
    </button>
  );
}

function createDragExecutionUpdate(
  task: ApiTask,
  status: Exclude<ApiTask["status"], "backlog">,
): ExecutionUpdateInput {
  return {
    assigneeId: task.assigneeId ?? null,
    nextStep:
      task.latestExecutionUpdate?.nextStep ??
      `Review ${formatLabel(status)} execution state`,
    percentComplete: getProgressForStatus(task.percentComplete ?? 0, status),
    priority: task.priority,
    status,
    targetCompletionDate: task.dueDate ?? null,
    updateNotes: `Kanban status changed to ${formatLabel(status)}.`,
  };
}

function getProgressForStatus(
  currentProgress: number,
  status: Exclude<ApiTask["status"], "backlog">,
) {
  if (status === "todo") {
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

function hasTaskDependency(taskId: string, dependencies: ApiTaskDependency[]) {
  return dependencies.some(
    (dependency) =>
      dependency.predecessorTaskId === taskId ||
      dependency.successorTaskId === taskId,
  );
}

function formatAssignee(task: ApiTask, members: ApiProjectMember[]) {
  if (task.assignee) {
    return `${task.assignee.firstName} ${task.assignee.lastName}`.trim();
  }
  const member = members.find((candidate) => candidate.userId === task.assigneeId);
  return member?.user
    ? `${member.user.firstName} ${member.user.lastName}`.trim()
    : "Unassigned";
}

function formatDate(value?: string | null, emptyLabel = "None") {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value?: string | null) {
  return (value ?? "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPriorityClassName(priority?: string | null) {
  const baseClassName = "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold";
  if (priority === "critical") {
    return `${baseClassName} bg-red-100 text-red-700`;
  }
  if (priority === "high") {
    return `${baseClassName} bg-amber-100 text-amber-800`;
  }
  if (priority === "low") {
    return `${baseClassName} bg-slate-100 text-slate-600`;
  }
  return `${baseClassName} bg-teal-100 text-teal-700`;
}
