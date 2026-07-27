import React from "react";
import { ActionGroup } from "@/components/ui/action-group";
import { AppModal } from "@/components/ui/app-modal";
import { SectionCard } from "@/components/ui/card";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState } from "@/components/ui/states";
import { CountBadge } from "@/components/ui/status-badge";
import { ProjectTaskDependencyPanel } from "@/components/projects/project-task-dependency-panel";
import type {
  ApiProjectMember,
  ApiTask,
  ApiTaskDependency,
} from "@/features/projects";

type TaskOperationInput = {
  actualEndDate?: string | null;
  actualStartDate?: string | null;
  assigneeId?: string | null;
  description?: string | null;
  estimatedHours?: number | null;
  parentTaskId?: string | null;
  percentComplete?: number;
  plannedEndDate?: string | null;
  plannedStartDate?: string | null;
  priority?: string;
  remainingHours?: number | null;
  remarks?: string | null;
  sequenceNumber?: number | null;
  status?: ApiTask["status"];
  taskKind?: ApiTask["taskKind"];
  title?: string;
};

type TaskExecutionUpdateInput = {
  assigneeId?: string | null;
  nextActionOwnerId?: string | null;
  nextStep?: string | null;
  percentComplete: number;
  priority: string;
  status: ApiTask["status"];
  targetCompletionDate?: string | null;
  updateNotes?: string | null;
};

type ProjectWorkspaceTasksProps = {
  canManageDependencies?: boolean;
  canCreateTasks?: boolean;
  canDeleteTasks?: boolean;
  canEditTasks?: boolean;
  canManageTasks?: boolean;
  canReassignTasks?: boolean;
  currentUserId?: string | null;
  dependencies?: ApiTaskDependency[];
  isSaving?: boolean;
  members?: ApiProjectMember[];
  mode?: "execution" | "planning";
  onCreateDependency?: (input: {
    dependencyType: ApiTaskDependency["dependencyType"];
    lagDays?: number;
    predecessorTaskId: string;
    successorTaskId: string;
  }) => void;
  onCreateTask?: (
    input: Required<Pick<TaskOperationInput, "title">> & TaskOperationInput,
  ) => void;
  onDeleteDependency?: (dependencyId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateDependency?: (
    dependencyId: string,
    input: {
      dependencyType: ApiTaskDependency["dependencyType"];
      lagDays?: number;
      predecessorTaskId: string;
      successorTaskId: string;
    },
  ) => void;
  onRecordExecutionUpdate?: (
    taskId: string,
    input: TaskExecutionUpdateInput,
  ) => Promise<void> | void;
  onUpdateTask?: (taskId: string, input: TaskOperationInput) => void;
  statusFilter?: "all" | ApiTask["status"];
  tasks: ApiTask[];
};

type CreatePreset =
  | { kind: "standard"; parentTaskId?: string | null }
  | { kind: "summary"; parentTaskId?: string | null }
  | { kind: "milestone"; parentTaskId?: string | null };

type DialogMode = "create" | "edit" | "reassign";

type PlanRow = {
  childCount: number;
  depth: number;
  hasChildren: boolean;
  task: ApiTask;
  wbs: string;
};

type ParentOption = {
  id: string;
  label: string;
};

type TaskFormState = {
  actualEndDate: string;
  actualStartDate: string;
  assigneeId: string;
  description: string;
  estimatedHours: string;
  parentTaskId: string;
  percentComplete: string;
  plannedEndDate: string;
  plannedStartDate: string;
  priority: string;
  remainingHours: string;
  remarks: string;
  sequenceNumber: string;
  status: ApiTask["status"];
  taskKind: NonNullable<ApiTask["taskKind"]>;
  title: string;
};

type ExecutionUpdateFormState = {
  assigneeId: string;
  nextActionOwnerId: string;
  nextStep: string;
  percentComplete: string;
  priority: string;
  status: ApiTask["status"];
  targetCompletionDate: string;
  updateNotes: string;
};

type TaskFieldAccess = {
  assignee: boolean;
  core: boolean;
  effort: boolean;
  progress: boolean;
  planning: boolean;
  structure: boolean;
};

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

const priorities = ["low", "medium", "high", "critical"];
const taskKinds: Array<{
  description: string;
  label: string;
  value: NonNullable<ApiTask["taskKind"]>;
}> = [
  {
    description: "Work item that can have one assignee.",
    label: "Task",
    value: "standard",
  },
  {
    description: "Summary container for child tasks and milestones.",
    label: "Summary",
    value: "summary",
  },
  {
    description: "Checkpoint represented as a zero-duration milestone.",
    label: "Milestone",
    value: "milestone",
  },
];

export function ProjectWorkspaceTasks({
  canManageDependencies = false,
  canCreateTasks = false,
  canDeleteTasks = false,
  canEditTasks = false,
  canManageTasks = false,
  canReassignTasks = false,
  currentUserId = null,
  dependencies = [],
  isSaving = false,
  members = [],
  mode = "planning",
  onCreateDependency,
  onCreateTask,
  onDeleteDependency,
  onDeleteTask,
  onUpdateDependency,
  onRecordExecutionUpdate,
  onUpdateTask,
  statusFilter = "all",
  tasks,
}: ProjectWorkspaceTasksProps) {
  const [dialogMode, setDialogMode] = React.useState<DialogMode | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = React.useState<ApiTask | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<ApiTask | null>(null);
  const [executionTask, setExecutionTask] = React.useState<ApiTask | null>(null);
  const [form, setForm] = React.useState<TaskFormState>(() => createEmptyTaskForm());
  const [executionForm, setExecutionForm] =
    React.useState<ExecutionUpdateFormState>(() => createEmptyExecutionUpdateForm());
  const [formError, setFormError] = React.useState<string | null>(null);
  const [executionFormError, setExecutionFormError] = React.useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = React.useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const knownSummaryTaskIdsRef = React.useRef<Set<string>>(new Set());

  const isPlanningMode = mode === "planning";
  const canCreateTask =
    isPlanningMode && (canManageTasks || canCreateTasks) && Boolean(onCreateTask);
  const hasFullEditAccess = isPlanningMode && (canManageTasks || canEditTasks);
  const hasExecutionEditAccess = !isPlanningMode && canEditTasks;
  const hasDeleteAccess = canManageTasks || canDeleteTasks;
  const hasReassignAccess = canManageTasks || canReassignTasks;
  const [localStatusFilter, setLocalStatusFilter] =
    React.useState<"all" | ApiTask["status"]>(statusFilter);

  React.useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  const visibleTasks = tasks.filter((task) => {
    const matchesStatus =
      localStatusFilter === "all" || task.status === localStatusFilter;
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" && !task.assigneeId) ||
      task.assigneeId === assigneeFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;

    return matchesStatus && matchesAssignee && matchesPriority;
  });
  const hierarchy = buildTaskHierarchy(visibleTasks, expandedTaskIds);

  React.useEffect(() => {
    setExpandedTaskIds((currentExpandedTaskIds) => {
      const knownSummaryTaskIds = knownSummaryTaskIdsRef.current;
      const nextExpandedTaskIds = new Set(currentExpandedTaskIds);
      let didChange = false;

      for (const task of visibleTasks) {
        if (
          task.taskKind === "summary" &&
          hierarchy.summaryTaskIds.includes(task.id) &&
          !knownSummaryTaskIds.has(task.id)
        ) {
          nextExpandedTaskIds.add(task.id);
          knownSummaryTaskIds.add(task.id);
          didChange = true;
        }
      }

      if (!didChange) {
        return currentExpandedTaskIds;
      }

      return Array.from(nextExpandedTaskIds);
    });
  }, [hierarchy.summaryTaskIds, visibleTasks]);

  function openCreateDialog(preset: CreatePreset) {
    setSelectedTask(null);
    setFormError(null);
    setForm(
      createEmptyTaskForm({
        parentTaskId: preset.parentTaskId ?? "",
        taskKind: preset.kind,
      }),
    );
    setDialogMode("create");
  }

  function openTaskDialog(task: ApiTask, mode: DialogMode) {
    setSelectedTask(task);
    setFormError(null);
    setForm(createTaskForm(task));
    setDialogMode(mode);
  }

  function closeDialog() {
    setDialogMode(null);
    setSelectedTask(null);
    setForm(createEmptyTaskForm());
    setFormError(null);
  }

  function openExecutionUpdate(task: ApiTask) {
    setExecutionTask(task);
    setExecutionForm(createExecutionUpdateForm(task));
    setExecutionFormError(null);
  }

  function closeExecutionUpdate() {
    setExecutionTask(null);
    setExecutionForm(createEmptyExecutionUpdateForm());
    setExecutionFormError(null);
  }

  function toggleExpanded(taskId: string) {
    setExpandedTaskIds((currentExpandedTaskIds) =>
      currentExpandedTaskIds.includes(taskId)
        ? currentExpandedTaskIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentExpandedTaskIds, taskId],
    );
  }

  function updateForm(nextForm: TaskFormState) {
    setForm(nextForm);
    if (formError) {
      setFormError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateTaskForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = toTaskPayload(form);

    if (dialogMode === "create" && payload.title && onCreateTask) {
      onCreateTask({ ...payload, title: payload.title });
      closeDialog();
      return;
    }

    if (selectedTask && onUpdateTask) {
      if (!dialogMode) {
        return;
      }

      onUpdateTask(
        selectedTask.id,
        getUpdatePayloadForDialog(dialogMode, payload, taskFieldAccess),
      );
      closeDialog();
    }
  }

  async function updateInlineTask(
    task: ApiTask,
    input: TaskOperationInput,
  ) {
    if (!onUpdateTask) {
      return;
    }

    setInlineError(null);
    try {
      await onUpdateTask(task.id, input);
    } catch (requestError) {
      setInlineError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update task",
      );
    }
  }

  async function handleExecutionUpdateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!executionTask || !onRecordExecutionUpdate) {
      return;
    }

    const validationError = validateExecutionUpdateForm(executionForm);
    if (validationError) {
      setExecutionFormError(validationError);
      return;
    }

    setExecutionFormError(null);
    try {
      await onRecordExecutionUpdate(executionTask.id, toExecutionUpdatePayload(executionForm));
      closeExecutionUpdate();
    } catch (requestError) {
      setExecutionFormError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record execution update",
      );
    }
  }

  const editableParentOptions = getParentOptions(tasks, hierarchy.wbsByTaskId, selectedTask);
  const taskFieldAccess = getTaskFieldAccess({
    currentUserId,
    dialogMode,
    hasExecutionEditAccess,
    hasFullEditAccess,
    hasReassignAccess,
    selectedTask,
  });

  return (
    <SectionCard>
      <SectionHeader
        action={
          <ActionGroup>
            <CountBadge value={hierarchy.rows.length} />
          {canCreateTask ? (
            <>
              <button
                className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
                onClick={() => openCreateDialog({ kind: "standard" })}
                type="button"
              >
                Create Task
              </button>
              <button
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                onClick={() => openCreateDialog({ kind: "summary" })}
                type="button"
              >
                Create Summary
              </button>
              <button
                className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                onClick={() => openCreateDialog({ kind: "milestone" })}
                type="button"
              >
                Create Milestone
              </button>
            </>
          ) : null}
          </ActionGroup>
        }
        description={
          isPlanningMode
            ? "Hierarchical project planning with summaries, tasks, milestones, and calculated rollups."
            : "Track execution status, ownership, progress, actual dates, effort, and comments for approved project tasks."
        }
        layout="wide"
        title={isPlanningMode ? "Plan" : "Tasks"}
      />

      <div className="mt-5 overflow-x-auto">
        {inlineError ? (
          <ErrorState className="mb-3">
            {inlineError}
          </ErrorState>
        ) : null}
        <div className="mb-3 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assigned To
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
              onChange={(event) => setAssigneeFilter(event.target.value)}
              value={assigneeFilter}
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {formatMemberName(member)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
              onChange={(event) =>
                setLocalStatusFilter(event.target.value as "all" | ApiTask["status"])
              }
              value={localStatusFilter}
            >
              <option value="all">All statuses</option>
              {taskStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Priority
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
              onChange={(event) => setPriorityFilter(event.target.value)}
              value={priorityFilter}
            >
              <option value="all">All priorities</option>
              {priorities.map((priority) => (
                <option className="capitalize" key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
        </div>
        <table className="min-w-[1480px] divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3" scope="col">WBS</th>
              <th className="px-3 py-3" scope="col">Task Name</th>
              <th className="px-3 py-3" scope="col">Assignee</th>
              <th className="px-3 py-3" scope="col">Status</th>
              <th className="px-3 py-3" scope="col">Priority</th>
              <th className="px-3 py-3" scope="col">Progress</th>
              <th className="px-3 py-3" scope="col">Planned Start</th>
              <th className="px-3 py-3" scope="col">Planned End</th>
              <th className="px-3 py-3" scope="col">Actual Start</th>
              <th className="px-3 py-3" scope="col">Actual End</th>
              <th className="px-3 py-3" scope="col">Est. Hours</th>
              <th className="px-3 py-3" scope="col">Remaining</th>
              <th className="px-3 py-3" scope="col">Comments</th>
              <th className="px-3 py-3" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hierarchy.rows.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={14}>
                  {isPlanningMode ? "No plan items yet." : "No tasks yet."}
                </td>
              </tr>
            ) : null}
            {hierarchy.rows.map((row) => {
              const task = row.task;
              const isSummary = task.taskKind === "summary";
              const isMilestone = task.taskKind === "milestone";
              const isExpanded = expandedTaskIds.includes(task.id);
              const canUpdateOwnTask = task.assigneeId === currentUserId && Boolean(onUpdateTask);
              const canEditRow =
                hasFullEditAccess || hasExecutionEditAccess || canUpdateOwnTask;
              const canRecordExecutionUpdate =
                !isPlanningMode &&
                !isSummary &&
                Boolean(onRecordExecutionUpdate) &&
                (canEditRow || hasReassignAccess);
              const canEditPlanningFields = hasFullEditAccess;
              const canEditExecutionFields =
                hasFullEditAccess || hasExecutionEditAccess || canUpdateOwnTask;
              const canDeleteRow = hasDeleteAccess && Boolean(onDeleteTask);
              const canAddChild = canCreateTask && isSummary;
              const rowClassName = isSummary
                ? "bg-amber-50/70"
                : isMilestone
                  ? "bg-sky-50/70"
                  : "bg-white";

              return (
                <tr className={rowClassName} key={task.id}>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-slate-600">
                    {row.wbs}
                  </td>
                  <td className="px-3 py-3">
                    <div
                      className="flex items-start gap-2"
                      style={{ paddingLeft: `${row.depth * 1.25}rem` }}
                    >
                      <div className="mt-0.5 flex items-center gap-1">
                        {row.hasChildren ? (
                          <button
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${task.title}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            onClick={() => toggleExpanded(task.id)}
                            type="button"
                          >
                            {isExpanded ? "−" : "+"}
                          </button>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                            ·
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <InlineTextInput
                            ariaLabel={`Task Name ${task.title}`}
                            disabled={!canEditPlanningFields}
                            displayValue={`${isMilestone ? "◆ " : ""}${task.title}`}
                            value={task.title}
                            onCommit={(title) =>
                              updateInlineTask(task, { title: title.trim() })
                            }
                          />
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                              isSummary
                                ? "bg-amber-200 text-amber-900"
                                : isMilestone
                                  ? "bg-sky-200 text-sky-900"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {formatTaskKindBadge(task.taskKind ?? "standard")}
                          </span>
                          {row.childCount > 0 ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {row.childCount} child{row.childCount === 1 ? "" : "ren"}
                            </span>
                          ) : null}
                        </div>
                        {task.description ? (
                          <p className="mt-1 max-w-xl text-xs text-slate-500">
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {isSummary ? (
                      "Not assignable"
                    ) : !hasReassignAccess && !canEditPlanningFields ? (
                      formatAssignee(task)
                    ) : (
                      <InlineAssigneeSelect
                        disabled={!hasReassignAccess && !canEditPlanningFields}
                        members={members}
                        onCommit={(assigneeId) =>
                          updateInlineTask(task, { assigneeId })
                        }
                        value={task.assigneeId ?? ""}
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 capitalize text-slate-600">
                    {isSummary ? (
                      formatTaskStatus(task)
                    ) : isMilestone ? (
                      getMilestoneState(task)
                    ) : (
                      <InlineSelect
                        disabled={!canEditExecutionFields}
                        label={`Status ${task.title}`}
                        onCommit={(status) =>
                          updateInlineTask(task, { status: status as ApiTask["status"] })
                        }
                        options={taskStatuses}
                        value={task.status}
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 capitalize text-slate-600">
                    {isSummary ? (
                      "—"
                    ) : (
                      <InlineSelect
                        disabled={!canEditPlanningFields}
                        label={`Priority ${task.title}`}
                        onCommit={(priority) => updateInlineTask(task, { priority })}
                        options={priorities.map((priority) => ({
                          label: formatLabel(priority),
                          value: priority,
                        }))}
                        value={task.priority}
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {isMilestone ? (
                      <span>{getMilestoneState(task)}</span>
                    ) : (
                      <InlineNumberInput
                        ariaLabel={`Progress ${task.title}`}
                        disabled={isSummary || !canEditExecutionFields}
                        max={100}
                        min={0}
                        onCommit={(percentComplete) =>
                          updateInlineTask(task, { percentComplete })
                        }
                        suffix="%"
                        value={getDisplayedPercentComplete(task)}
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    <InlineDateInput
                      ariaLabel={`Start ${task.title}`}
                      disabled={!canEditPlanningFields}
                      onCommit={(plannedStartDate) =>
                        updateInlineTask(task, { plannedStartDate })
                      }
                      value={getDisplayedStartDate(task)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    <InlineDateInput
                      ariaLabel={`Finish ${task.title}`}
                      disabled={!canEditPlanningFields}
                      onCommit={(plannedEndDate) =>
                        updateInlineTask(task, { plannedEndDate })
                      }
                      value={getDisplayedEndDate(task)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    <InlineDateInput
                      ariaLabel={`Actual Start ${task.title}`}
                      disabled={isSummary || !canEditExecutionFields}
                      onCommit={(actualStartDate) =>
                        updateInlineTask(task, { actualStartDate })
                      }
                      value={task.actualStartDate}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    <InlineDateInput
                      ariaLabel={`Actual End ${task.title}`}
                      disabled={isSummary || !canEditExecutionFields}
                      onCommit={(actualEndDate) =>
                        updateInlineTask(task, { actualEndDate })
                      }
                      value={task.actualEndDate}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {isSummary ? "—" : formatNumber(task.estimatedHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {isSummary ? "—" : formatNumber(task.remainingHours)}
                  </td>
                  <td className="min-w-56 px-3 py-3 text-slate-600">
                    <InlineTextInput
                      ariaLabel={`Comments ${task.title}`}
                      disabled={isSummary || !canEditExecutionFields}
                      value={task.remarks ?? ""}
                      onCommit={(remarks) =>
                        updateInlineTask(task, { remarks: remarks.trim() || null })
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    {canEditRow || canDeleteRow || canAddChild || hasReassignAccess || canRecordExecutionUpdate ? (
                      <div className="flex flex-wrap gap-2">
                        {canRecordExecutionUpdate ? (
                          <button
                            className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
                            onClick={() => openExecutionUpdate(task)}
                            type="button"
                          >
                            Update
                          </button>
                        ) : null}
                        {canEditRow ? (
                          <button
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => openTaskDialog(task, "edit")}
                            type="button"
                          >
                            {hasFullEditAccess ? "Edit" : "Update Progress"}
                          </button>
                        ) : null}
                        {hasReassignAccess ? (
                          <button
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={() => openTaskDialog(task, "reassign")}
                            type="button"
                          >
                            Reassign
                          </button>
                        ) : null}
                        {canAddChild ? (
                          <button
                            className="rounded-md border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                            onClick={() =>
                              openCreateDialog({
                                kind: "standard",
                                parentTaskId: task.id,
                              })
                            }
                            type="button"
                          >
                            Child Task
                          </button>
                        ) : null}
                        {canDeleteRow ? (
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
              : isPlanningMode
                ? "Capture summary hierarchy, planning dates, effort, and ownership in one place."
                : "Update task execution details without changing schedule structure."
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
          title={getDialogTitle(dialogMode, form, hasFullEditAccess)}
          widthClassName="max-w-4xl"
        >
          <ModalForm id="project-task-form" onSubmit={handleSubmit}>
            <ModalFormSection
              description={
                dialogMode === "reassign"
                  ? "Only assignee changes are available in this mode."
                  : isPhaseForm(form)
                    ? "Summaries are planning containers. Progress and rolled-up dates are calculated from descendant work."
                    : isPlanningMode
                      ? "Use canonical planning fields for the current project plan. WBS is derived from hierarchy and ordering."
                      : "Use this view for execution updates only. Schedule structure remains owned by Planning."
              }
              title={isPlanningMode ? "Planning Detail" : "Task Execution Detail"}
            >
              {formError ? (
                <ErrorState className="mb-4">
                  {formError}
                </ErrorState>
              ) : null}

              <ModalFormGrid className="md:grid-cols-2 xl:grid-cols-3">
                {!shouldHideStructuralFields(dialogMode, form) ? (
                  <>
                    <label className="block text-sm font-medium text-slate-700">
                      Type
                      <select
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.structure}
                        onChange={(event) =>
                          updateForm({
                            ...form,
                            taskKind: event.target.value as NonNullable<ApiTask["taskKind"]>,
                          })
                        }
                        value={form.taskKind}
                      >
                        {taskKinds.map((taskKind) => (
                          <option key={taskKind.value} value={taskKind.value}>
                            {taskKind.label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs text-slate-500">
                        {
                          taskKinds.find((taskKind) => taskKind.value === form.taskKind)
                            ?.description
                        }
                      </span>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Parent Summary
                      <select
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.structure}
                        onChange={(event) =>
                          updateForm({ ...form, parentTaskId: event.target.value })
                        }
                        value={form.parentTaskId}
                      >
                        <option value="">Top level</option>
                        {editableParentOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Sequence
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.structure}
                        min={0}
                        onChange={(event) =>
                          updateForm({ ...form, sequenceNumber: event.target.value })
                        }
                        type="number"
                        value={form.sequenceNumber}
                      />
                    </label>
                  </>
                ) : null}

                <label className="block text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                  Title
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                    disabled={dialogMode === "reassign" || !taskFieldAccess.core}
                    onChange={(event) =>
                      updateForm({ ...form, title: event.target.value })
                    }
                    required={dialogMode === "create"}
                    value={form.title}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                  Description
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                    disabled={dialogMode === "reassign" || !taskFieldAccess.core}
                    onChange={(event) =>
                      updateForm({ ...form, description: event.target.value })
                    }
                    value={form.description}
                  />
                </label>

                {!isPhaseForm(form) ? (
                  <>
                    <TaskAssigneeSelect
                      disabled={dialogMode !== "create" && !taskFieldAccess.assignee}
                      members={members}
                      onChange={(assigneeId) => updateForm({ ...form, assigneeId })}
                      value={form.assigneeId}
                    />

                    {isMilestoneForm(form) ? (
                      <label className="block text-sm font-medium text-slate-700">
                        Milestone State
                        <span className="mt-2 block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-700">
                          {getMilestoneState({
                            percentComplete: Number(form.percentComplete || 0),
                            status: form.status,
                          })}
                        </span>
                      </label>
                    ) : (
                      <label className="block text-sm font-medium text-slate-700">
                        Status
                        <select
                          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                          disabled={dialogMode === "reassign" || !taskFieldAccess.progress}
                          onChange={(event) =>
                            updateForm({
                              ...form,
                              status: event.target.value as ApiTask["status"],
                            })
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
                    )}

                    <label className="block text-sm font-medium text-slate-700">
                      Priority
                      <select
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.core}
                        onChange={(event) =>
                          updateForm({ ...form, priority: event.target.value })
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
                  </>
                ) : (
                  <PhaseRollupReadOnly task={selectedTask} />
                )}

                <label className="block text-sm font-medium text-slate-700">
                  Planned Start
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                    disabled={dialogMode === "reassign" || !taskFieldAccess.planning}
                    onChange={(event) =>
                      updateForm(syncMilestoneDates(form, "plannedStartDate", event.target.value))
                    }
                    type="date"
                    value={form.plannedStartDate}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Planned End
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                    disabled={dialogMode === "reassign" || !taskFieldAccess.planning}
                    onChange={(event) =>
                      updateForm(syncMilestoneDates(form, "plannedEndDate", event.target.value))
                    }
                    type="date"
                    value={form.plannedEndDate}
                  />
                </label>

                {!isPhaseForm(form) ? (
                  <>
                    <label className="block text-sm font-medium text-slate-700">
                      Actual Start
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.progress}
                        onChange={(event) =>
                          updateForm({ ...form, actualStartDate: event.target.value })
                        }
                        type="date"
                        value={form.actualStartDate}
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Actual End
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        onChange={(event) =>
                          updateForm({ ...form, actualEndDate: event.target.value })
                        }
                        disabled={dialogMode === "reassign" || !taskFieldAccess.progress}
                        type="date"
                        value={form.actualEndDate}
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Estimated Hours
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.effort}
                        min={0}
                        onChange={(event) =>
                          updateForm({ ...form, estimatedHours: event.target.value })
                        }
                        step="0.25"
                        type="number"
                        value={form.estimatedHours}
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Remaining Hours
                      <input
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                        disabled={dialogMode === "reassign" || !taskFieldAccess.effort}
                        min={0}
                        onChange={(event) =>
                          updateForm({ ...form, remainingHours: event.target.value })
                        }
                        step="0.25"
                        type="number"
                        value={form.remainingHours}
                      />
                    </label>

                    {!isMilestoneForm(form) ? (
                      <label className="block text-sm font-medium text-slate-700">
                        Percent Complete
                        <input
                          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                          disabled={dialogMode === "reassign" || !taskFieldAccess.progress}
                          max={100}
                          min={0}
                          onChange={(event) =>
                            updateForm({ ...form, percentComplete: event.target.value })
                          }
                          type="number"
                          value={form.percentComplete}
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}

                <label className="block text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                  Remarks
                  <textarea
                    className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
                    disabled={dialogMode === "reassign" || !taskFieldAccess.progress}
                    onChange={(event) =>
                      updateForm({ ...form, remarks: event.target.value })
                    }
                    value={form.remarks}
                  />
                </label>
              </ModalFormGrid>
            </ModalFormSection>
          </ModalForm>
        </AppModal>
      ) : null}

      {executionTask ? (
        <div
          aria-labelledby="task-execution-update-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
          role="dialog"
        >
          <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-lg font-semibold text-slate-950"
                    id="task-execution-update-title"
                  >
                    Task Execution Update
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {executionTask.title}
                  </p>
                </div>
                <button
                  aria-label="Close execution update"
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  onClick={closeExecutionUpdate}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <form
              className="flex flex-1 flex-col"
              id="task-execution-update-form"
              onSubmit={handleExecutionUpdateSubmit}
            >
              <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
                {executionFormError ? (
                  <ErrorState className="sm:col-span-2">
                    {executionFormError}
                  </ErrorState>
                ) : null}

                <label className="block text-sm font-medium text-slate-700">
                  Status
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        status: event.target.value as ApiTask["status"],
                      })
                    }
                    value={executionForm.status}
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
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        priority: event.target.value,
                      })
                    }
                    value={executionForm.priority}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <TaskAssigneeSelect
                  members={members}
                  onChange={(assigneeId) =>
                    setExecutionForm({ ...executionForm, assigneeId })
                  }
                  value={executionForm.assigneeId}
                />

                <label className="block text-sm font-medium text-slate-700">
                  Progress %
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    max={100}
                    min={0}
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        percentComplete: event.target.value,
                      })
                    }
                    type="number"
                    value={executionForm.percentComplete}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Next Step
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        nextStep: event.target.value,
                      })
                    }
                    value={executionForm.nextStep}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Next Action Owner
                  <select
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        nextActionOwnerId: event.target.value,
                      })
                    }
                    value={executionForm.nextActionOwnerId}
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.userId}>
                        {formatMemberName(member)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Target Completion Date
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        targetCompletionDate: event.target.value,
                      })
                    }
                    type="date"
                    value={executionForm.targetCompletionDate}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Update Notes
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setExecutionForm({
                        ...executionForm,
                        updateNotes: event.target.value,
                      })
                    }
                    value={executionForm.updateNotes}
                  />
                </label>
              </div>

              <div className="mt-auto flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={closeExecutionUpdate}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Saving..." : "Save update"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
          title={isPlanningMode ? "Delete Planning Item" : "Delete Task"}
          widthClassName="max-w-md"
        >
          <p className="mt-2 text-sm text-slate-600">
            {isPlanningMode
              ? `Delete "${taskPendingDelete.title}" from the project plan?`
              : `Delete "${taskPendingDelete.title}" from the task list?`}
          </p>
        </AppModal>
      ) : null}

      {isPlanningMode ? (
        <ProjectTaskDependencyPanel
          canManageDependencies={canManageDependencies}
          dependencies={dependencies}
          isSaving={isSaving}
          onCreateDependency={onCreateDependency}
          onDeleteDependency={onDeleteDependency}
          onUpdateDependency={onUpdateDependency}
          tasks={tasks}
        />
      ) : null}
    </SectionCard>
  );
}

function TaskAssigneeSelect({
  disabled = false,
  members,
  onChange,
  value,
}: {
  disabled?: boolean;
  members: ApiProjectMember[];
  onChange: (assigneeId: string) => void;
  value: string;
}) {
  if (disabled) {
    const member = members.find((candidate) => candidate.userId === value);
    return <span>{member ? formatMemberName(member) : "Unassigned"}</span>;
  }

  return (
    <label className="block text-sm font-medium text-slate-700">
      Assignee
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
        disabled={disabled}
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

function InlineAssigneeSelect({
  disabled,
  members,
  onCommit,
  value,
}: {
  disabled: boolean;
  members: ApiProjectMember[];
  onCommit: (assigneeId: string | null) => void;
  value: string;
}) {
  if (disabled) {
    const member = members.find((candidate) => candidate.userId === value);
    return <span>{member ? formatMemberName(member) : "Unassigned"}</span>;
  }

  return (
    <select
      aria-label="Assigned To"
      className="w-full min-w-36 rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:border-transparent disabled:bg-transparent disabled:px-0"
      disabled={disabled}
      onChange={(event) => onCommit(event.target.value || null)}
      value={value}
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.id} value={member.userId}>
          {formatMemberName(member)}
        </option>
      ))}
    </select>
  );
}

function InlineSelect({
  disabled,
  label,
  onCommit,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onCommit: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  if (disabled) {
    return (
      <span>
        {options.find((option) => option.value === value)?.label ??
          formatLabel(value)}
      </span>
    );
  }

  return (
    <select
      aria-label={label}
      className="w-full min-w-32 rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:border-transparent disabled:bg-transparent disabled:px-0"
      disabled={disabled}
      onChange={(event) => onCommit(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function InlineTextInput({
  ariaLabel,
  disabled,
  displayValue,
  onCommit,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  displayValue?: string;
  onCommit: (value: string) => void;
  value: string;
}) {
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  if (disabled) {
    return (
      <span className="font-medium text-slate-950">
        {displayValue || value || "—"}
      </span>
    );
  }

  return (
    <span className="block">
      <span className="sr-only">{displayValue || value}</span>
      <input
        aria-label={ariaLabel}
        className="w-full min-w-44 rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-950 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:border-transparent disabled:bg-transparent disabled:px-0"
        disabled={disabled}
        onBlur={() => {
          if (draft !== value && draft.trim()) {
            onCommit(draft);
          }
        }}
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />
    </span>
  );
}

function InlineNumberInput({
  ariaLabel,
  disabled,
  max,
  min,
  onCommit,
  suffix,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  const [draft, setDraft] = React.useState(String(value));

  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  if (disabled) {
    return <span>{suffix ? `${value}${suffix}` : value}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        aria-label={ariaLabel}
        className="w-20 rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:border-transparent disabled:bg-transparent disabled:px-0"
        disabled={disabled}
        max={max}
        min={min}
        onBlur={() => {
          const nextValue = Number(draft);
          if (
            Number.isFinite(nextValue) &&
            nextValue >= min &&
            nextValue <= max &&
            nextValue !== value
          ) {
            onCommit(nextValue);
          }
        }}
        onChange={(event) => setDraft(event.target.value)}
        type="number"
        value={draft}
      />
      {suffix ? <span className="text-xs text-slate-500">{suffix}</span> : null}
    </div>
  );
}

function InlineDateInput({
  ariaLabel,
  disabled,
  onCommit,
  value,
}: {
  ariaLabel: string;
  disabled: boolean;
  onCommit: (value: string | null) => void;
  value?: string | null;
}) {
  const [draft, setDraft] = React.useState(value ?? "");

  React.useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  if (disabled) {
    return <span>{formatDate(value, "Not set")}</span>;
  }

  return (
    <input
      aria-label={ariaLabel}
      className="w-36 rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:border-transparent disabled:bg-transparent disabled:px-0"
      disabled={disabled}
      onBlur={() => {
        if (draft !== (value ?? "")) {
          onCommit(draft || null);
        }
      }}
      onChange={(event) => setDraft(event.target.value)}
      type="date"
      value={draft}
    />
  );
}

function PhaseRollupReadOnly({ task }: { task: ApiTask | null }) {
  return (
    <>
      <ReadOnlyPlanningField
        label="Calculated Progress"
        value={formatPercent(task?.phaseProgress ?? task?.percentComplete ?? 0)}
      />
      <ReadOnlyPlanningField
        label="Calculated Start"
        value={formatDate(getDisplayedStartDate(task), "No calculated start")}
      />
      <ReadOnlyPlanningField
        label="Calculated Finish"
        value={formatDate(getDisplayedEndDate(task), "No calculated finish")}
      />
    </>
  );
}

function ReadOnlyPlanningField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {value}
      </div>
    </label>
  );
}

function buildTaskHierarchy(tasks: ApiTask[], expandedTaskIds: string[]) {
  const tasksByParentId = new Map<string | null, ApiTask[]>();
  const wbsByTaskId = new Map<string, string>();
  const rows: PlanRow[] = [];
  const expandedTaskIdsSet = new Set(expandedTaskIds);

  for (const task of tasks) {
    const parentTaskId = task.parentTaskId ?? null;
    const currentSiblingTasks = tasksByParentId.get(parentTaskId) ?? [];
    currentSiblingTasks.push(task);
    tasksByParentId.set(parentTaskId, currentSiblingTasks);
  }

  for (const [parentTaskId, siblingTasks] of tasksByParentId.entries()) {
    tasksByParentId.set(parentTaskId, sortTasks(siblingTasks));
  }

  const summaryTaskIds = tasks.filter((task) => task.taskKind === "summary").map((task) => task.id);

  function visit(parentTaskId: string | null, prefix: string, depth: number) {
    const siblingTasks = tasksByParentId.get(parentTaskId) ?? [];

    siblingTasks.forEach((task, index) => {
      const wbs = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      const childCount = (tasksByParentId.get(task.id) ?? []).length;
      const hasChildren = childCount > 0;
      wbsByTaskId.set(task.id, wbs);
      rows.push({
        childCount,
        depth,
        hasChildren,
        task,
        wbs,
      });

      if (hasChildren && expandedTaskIdsSet.has(task.id)) {
        visit(task.id, wbs, depth + 1);
      }
    });
  }

  visit(null, "", 0);

  return {
    rows,
    summaryTaskIds,
    wbsByTaskId,
  };
}

function sortTasks(tasks: ApiTask[]) {
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

    return leftTask.title.localeCompare(rightTask.title);
  });
}

function getTaskFieldAccess({
  currentUserId,
  dialogMode,
  hasExecutionEditAccess,
  hasFullEditAccess,
  hasReassignAccess,
  selectedTask,
}: {
  currentUserId: string | null;
  dialogMode: DialogMode | null;
  hasExecutionEditAccess: boolean;
  hasFullEditAccess: boolean;
  hasReassignAccess: boolean;
  selectedTask: ApiTask | null;
}): TaskFieldAccess {
  if (dialogMode === "create") {
    return {
      assignee: true,
      core: true,
      effort: true,
      planning: true,
      progress: true,
      structure: true,
    };
  }

  if (dialogMode === "reassign") {
    return {
      assignee: true,
      core: false,
      effort: false,
      planning: false,
      progress: false,
      structure: false,
    };
  }

  if (hasFullEditAccess) {
    return {
      assignee: true,
      core: true,
      effort: true,
      planning: true,
      progress: true,
      structure: true,
    };
  }

  const canUpdateOwnTask =
    (Boolean(currentUserId) && selectedTask?.assigneeId === currentUserId) ||
    hasExecutionEditAccess;

  return {
    assignee: canUpdateOwnTask || hasReassignAccess,
    core: false,
    effort: false,
    planning: false,
    progress: canUpdateOwnTask,
    structure: false,
  };
}

function getParentOptions(
  tasks: ApiTask[],
  wbsByTaskId: Map<string, string>,
  selectedTask: ApiTask | null,
): ParentOption[] {
  const blockedTaskIds = new Set<string>();

  if (selectedTask) {
    blockedTaskIds.add(selectedTask.id);

    const childrenByParentId = new Map<string | null, ApiTask[]>();
    for (const task of tasks) {
      const parentTaskId = task.parentTaskId ?? null;
      const childTasks = childrenByParentId.get(parentTaskId) ?? [];
      childTasks.push(task);
      childrenByParentId.set(parentTaskId, childTasks);
    }

    const queue = [...(childrenByParentId.get(selectedTask.id) ?? [])];
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) {
        continue;
      }
      blockedTaskIds.add(task.id);
      queue.push(...(childrenByParentId.get(task.id) ?? []));
    }
  }

  return sortTasks(tasks)
    .filter((task) => task.taskKind === "summary" && !blockedTaskIds.has(task.id))
    .map((task) => ({
      id: task.id,
      label: `${wbsByTaskId.get(task.id) ?? "?"} ${task.title}`,
    }));
}

function createEmptyTaskForm(
  defaults: Partial<Pick<TaskFormState, "parentTaskId" | "taskKind">> = {},
): TaskFormState {
  return {
    actualEndDate: "",
    actualStartDate: "",
    assigneeId: "",
    description: "",
    estimatedHours: "",
    parentTaskId: defaults.parentTaskId ?? "",
    percentComplete: "0",
    plannedEndDate: "",
    plannedStartDate: "",
    priority: "medium",
    remainingHours: "",
    remarks: "",
    sequenceNumber: "",
    status: "todo",
    taskKind: defaults.taskKind ?? "standard",
    title: "",
  };
}

function createTaskForm(task: ApiTask): TaskFormState {
  return {
    actualEndDate: task.actualEndDate ?? "",
    actualStartDate: task.actualStartDate ?? "",
    assigneeId: task.assigneeId ?? "",
    description: task.description ?? "",
    estimatedHours:
      typeof task.estimatedHours === "number" ? String(task.estimatedHours) : "",
    parentTaskId: task.parentTaskId ?? "",
    percentComplete: String(task.percentComplete ?? 0),
    plannedEndDate: task.plannedEndDate ?? "",
    plannedStartDate: task.plannedStartDate ?? "",
    priority: task.priority,
    remainingHours:
      typeof task.remainingHours === "number" ? String(task.remainingHours) : "",
    remarks: task.remarks ?? "",
    sequenceNumber:
      typeof task.sequenceNumber === "number" ? String(task.sequenceNumber) : "",
    status: task.status,
    taskKind: task.taskKind ?? "standard",
    title: task.title,
  };
}

function createEmptyExecutionUpdateForm(): ExecutionUpdateFormState {
  return {
    assigneeId: "",
    nextActionOwnerId: "",
    nextStep: "",
    percentComplete: "0",
    priority: "medium",
    status: "todo",
    targetCompletionDate: "",
    updateNotes: "",
  };
}

function createExecutionUpdateForm(task: ApiTask): ExecutionUpdateFormState {
  const latestUpdate = task.latestExecutionUpdate;

  return {
    assigneeId: task.assigneeId ?? "",
    nextActionOwnerId: latestUpdate?.nextActionOwnerId ?? "",
    nextStep: latestUpdate?.nextStep ?? "",
    percentComplete: String(getDisplayedPercentComplete(task)),
    priority: task.priority,
    status: task.status,
    targetCompletionDate:
      latestUpdate?.targetCompletionDate ?? task.dueDate ?? task.plannedEndDate ?? "",
    updateNotes: "",
  };
}

function validateExecutionUpdateForm(form: ExecutionUpdateFormState) {
  const percentComplete = Number(form.percentComplete);

  if (
    !Number.isFinite(percentComplete) ||
    percentComplete < 0 ||
    percentComplete > 100
  ) {
    return "Progress must be between 0 and 100.";
  }

  if (!priorities.includes(form.priority)) {
    return "Priority must be low, medium, high, or critical.";
  }

  return null;
}

function toExecutionUpdatePayload(
  form: ExecutionUpdateFormState,
): TaskExecutionUpdateInput {
  return {
    assigneeId: toNullableString(form.assigneeId),
    nextActionOwnerId: toNullableString(form.nextActionOwnerId),
    nextStep: toNullableString(form.nextStep),
    percentComplete: Number(form.percentComplete),
    priority: form.priority,
    status: form.status,
    targetCompletionDate: toNullableString(form.targetCompletionDate),
    updateNotes: toNullableString(form.updateNotes),
  };
}

function syncMilestoneDates(
  currentForm: TaskFormState,
  fieldName: "plannedStartDate" | "plannedEndDate",
  nextValue: string,
) {
  if (currentForm.taskKind !== "milestone") {
    return {
      ...currentForm,
      [fieldName]: nextValue,
    };
  }

  return {
    ...currentForm,
    plannedEndDate: fieldName === "plannedStartDate" ? nextValue : currentForm.plannedEndDate,
    plannedStartDate: fieldName === "plannedEndDate" ? currentForm.plannedStartDate : nextValue,
    [fieldName]: nextValue,
  };
}

function validateTaskForm(form: TaskFormState) {
  if (
    form.taskKind === "milestone" &&
    form.plannedStartDate &&
    form.plannedEndDate &&
    form.plannedStartDate !== form.plannedEndDate
  ) {
    return "Milestones must use the same planned start and planned end date.";
  }

  return null;
}

function toTaskPayload(
  form: TaskFormState,
): Required<Pick<TaskOperationInput, "title">> & TaskOperationInput {
  const isPhase = isPhaseForm(form);

  return {
    actualEndDate: isPhase ? undefined : toNullableString(form.actualEndDate),
    actualStartDate: isPhase ? undefined : toNullableString(form.actualStartDate),
    assigneeId: isPhase ? undefined : toNullableString(form.assigneeId),
    description: toNullableString(form.description),
    estimatedHours: isPhase ? undefined : toNullableNumber(form.estimatedHours),
    parentTaskId: toNullableString(form.parentTaskId),
    percentComplete: isPhase ? undefined : Number(form.percentComplete || 0),
    plannedEndDate: toNullableString(form.plannedEndDate),
    plannedStartDate: toNullableString(form.plannedStartDate),
    priority: isPhase ? undefined : form.priority,
    remainingHours: isPhase ? undefined : toNullableNumber(form.remainingHours),
    remarks: toNullableString(form.remarks),
    sequenceNumber: toNullableInteger(form.sequenceNumber),
    status: isPhase ? undefined : form.status,
    taskKind: form.taskKind,
    title: form.title.trim(),
  };
}

function getUpdatePayloadForDialog(
  dialogMode: DialogMode,
  payload: Required<Pick<TaskOperationInput, "title">> & TaskOperationInput,
  taskFieldAccess: TaskFieldAccess,
): TaskOperationInput {
  if (dialogMode === "reassign") {
    return { assigneeId: payload.assigneeId };
  }

  if (!taskFieldAccess.core && !taskFieldAccess.planning && !taskFieldAccess.structure) {
    return {
      assigneeId: taskFieldAccess.assignee ? payload.assigneeId : undefined,
      percentComplete: taskFieldAccess.progress ? payload.percentComplete : undefined,
      remarks: taskFieldAccess.progress ? payload.remarks : undefined,
      status: taskFieldAccess.progress ? payload.status : undefined,
    };
  }

  return payload;
}

function getDialogTitle(
  dialogMode: DialogMode,
  form: TaskFormState,
  hasFullEditAccess: boolean,
) {
  if (dialogMode === "create") {
    if (form.taskKind === "summary") {
      return "Create Summary";
    }

    if (form.taskKind === "milestone") {
      return "Create Milestone";
    }

    return form.parentTaskId ? "Create Child Task" : "Create Task";
  }

  if (dialogMode === "reassign") {
    return "Reassign Task";
  }

  return hasFullEditAccess ? "Edit Planning Item" : "Update Task Progress";
}

function shouldHideStructuralFields(
  dialogMode: DialogMode,
  form: TaskFormState,
) {
  return dialogMode === "create" && isPhaseForm(form);
}

function isPhaseForm(form: TaskFormState) {
  return form.taskKind === "summary";
}

function isMilestoneForm(form: TaskFormState) {
  return form.taskKind === "milestone";
}

function formatAssignee(task: ApiTask) {
  return task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`
    : "Unassigned";
}

function formatMemberName(member: ApiProjectMember) {
  return member.user
    ? `${member.user.firstName} ${member.user.lastName}`.trim() ||
        member.user.email ||
        member.userId
    : member.userId;
}

function formatTaskKindBadge(value: NonNullable<ApiTask["taskKind"]>) {
  if (value === "summary") {
    return "[SUMMARY]";
  }

  if (value === "milestone") {
    return "[MILESTONE]";
  }

  return "[TASK]";
}

function getDisplayedStartDate(task?: ApiTask | null) {
  if (!task) {
    return null;
  }

  return task.taskKind === "summary"
    ? task.phaseStartDate ?? task.plannedStartDate ?? null
    : task.plannedStartDate ?? null;
}

function getDisplayedEndDate(task?: ApiTask | null) {
  if (!task) {
    return null;
  }

  return task.taskKind === "summary"
    ? task.phaseEndDate ?? task.plannedEndDate ?? null
    : task.plannedEndDate ?? null;
}

function getDisplayedPercentComplete(task: ApiTask) {
  if (task.taskKind === "summary") {
    return task.phaseProgress ?? task.percentComplete ?? 0;
  }

  return task.percentComplete ?? 0;
}

function formatTaskStatus(task: ApiTask) {
  if (task.taskKind !== "summary") {
    return formatLabel(task.status);
  }

  const phaseProgress = task.phaseProgress ?? task.percentComplete ?? 0;

  if (phaseProgress >= 100) {
    return "complete";
  }

  if (phaseProgress > 0) {
    return "in progress";
  }

  return "not started";
}

function getMilestoneState(
  task: Pick<ApiTask, "percentComplete" | "status">,
) {
  return task.status === "done" || Number(task.percentComplete ?? 0) >= 100
    ? "Reached"
    : "Pending";
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

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
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

function formatPercent(value?: number | null) {
  if (typeof value !== "number") {
    return "0%";
  }

  return `${value}%`;
}

function toNullableString(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function toNullableNumber(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? Number(trimmedValue) : null;
}

function toNullableInteger(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? Number.parseInt(trimmedValue, 10) : null;
}
