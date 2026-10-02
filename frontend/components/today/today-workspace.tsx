"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActionToolbar,
  EmptyState,
  ErrorState,
  StatusBadge,
  WorkspaceContent,
  WorkspaceSection,
} from "@/components/foundation";
import { DisclosureButton } from "@/components/ui/disclosure-button";
import {
  buildExecutionUpdatePayload,
  getDisplayedPercentComplete,
  type TaskExecutionUpdatePayload,
} from "@/components/projects/execution-update-payload";
import type {
  ApiProject,
  ApiProjectDetails,
  ApiProjectMember,
  ApiTask,
  ApiTaskExecutionUpdate,
} from "@/features/projects";
import { includeTaskAncestors } from "@/lib/tasks/include-task-ancestors";
import { includePersonalWorkContext } from "@/lib/tasks/personal-work-context";
import {
  buildTaskHierarchy,
  getHierarchyParentTaskIds,
  type TaskHierarchyRow,
} from "@/lib/tasks/task-hierarchy";
import {
  findAdjacentColumn,
  findAdjacentEditableTaskId,
  findAdjacentWorkPackageId,
  findOwningWorkPackageId,
  focusTodayCell,
  getEditableTaskIds,
  getPreferredFocusColumn,
  getWorkPackageIds,
  isEditableTodayTask,
  readTodayCellCoordinates,
  TODAY_MINE_EDITABLE_COLUMNS,
  TODAY_TEAM_EDITABLE_COLUMNS,
  type TodayEditableColumn,
} from "./today-grid-navigation";
import { resolveTaskUiCapabilities } from "@/features/auth/capabilities";
import {
  matchesWorkAttention,
  primaryWorkFilters,
  type WorkAttention,
  type WorkSecondary,
} from "@/lib/tasks/task-work-filters";
import { useTodayExpansionState } from "./today-expansion-state";

export type TodayTaskScope = "mine" | "team";

type TodayWorkspaceProps = {
  roleNames?: string[];
  identityType?: "HUMAN" | "SERVICE";
  currentUserId?: string | null;
  /** When true, project picker is hidden (Delivery → Today). */
  embedded?: boolean;
  isSaving?: boolean;
  members: ApiProjectMember[];
  onLoadHistory: (taskId: string) => Promise<ApiTaskExecutionUpdate[]>;
  onRecordExecutionUpdate: (
    taskId: string,
    input: TaskExecutionUpdatePayload,
  ) => Promise<ApiTask>;
  onRefreshTasks: () => Promise<ApiTask[]>;
  onSearchTermChange: (value: string) => void;
  onSelectedProjectIdChange?: (projectId: string) => void;
  onTaskScopeChange?: (scope: TodayTaskScope) => void;
  project: ApiProjectDetails;
  projects: ApiProject[];
  searchTerm: string;
  selectedProjectId: string;
  taskScope?: TodayTaskScope;
};

type TodayRow = TaskHierarchyRow;

type SaveState = "idle" | "saving" | "saved" | "error";

type ExecutionOverrides = NonNullable<
  Parameters<typeof buildExecutionUpdatePayload>[1]
>;

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

const taskPriorities: Array<{ label: string; value: ApiTask["priority"] }> = [
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const teamGridTemplate =
  "minmax(3.5rem,4.5rem) minmax(14rem,1.8fr) minmax(8rem,10rem) minmax(4.5rem,5.5rem) minmax(5.5rem,6.5rem) minmax(5rem,6rem) minmax(7.5rem,8.5rem) minmax(11rem,1.1fr) minmax(11rem,1.1fr) minmax(8rem,10rem) minmax(4.5rem,5rem)";

const mineGridTemplate =
  "minmax(14rem,1.8fr) minmax(4.5rem,5.5rem) minmax(5.5rem,6.5rem) minmax(5rem,6rem) minmax(7.5rem,8.5rem) minmax(11rem,1.1fr) minmax(11rem,1.1fr) minmax(4.5rem,5rem)";

const editableControlClassName =
  "w-full rounded-sm border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500";

const COLUMN_HEADER_OFFSET = "2.25rem";

export function TodayWorkspace({
  roleNames = [],
  identityType,
  currentUserId = null,
  embedded = false,
  isSaving = false,
  members,
  onLoadHistory,
  onRecordExecutionUpdate,
  onRefreshTasks,
  onSearchTermChange,
  onSelectedProjectIdChange,
  onTaskScopeChange,
  project,
  projects,
  searchTerm,
  selectedProjectId,
  taskScope: taskScopeProp,
}: TodayWorkspaceProps) {
  const canEdit = resolveTaskUiCapabilities({
    currentUserId,
    members,
    project,
    roleNames,
    identityType,
  }).canManageTasks;
  const expansion = useTodayExpansionState(project.id);
  const [attention, setAttention] = useState<WorkAttention>("active");
  const [secondary, setSecondary] = useState<WorkSecondary>("none");
  const committedTasks = useRef(project.tasks ?? []);
  const queues = useRef(new Map<string, Promise<void>>());
  const failureVersions = useRef(new Map<string, number>());
  const refreshRequired = useRef(new Set<string>());
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
    };
  }, [project.id]);
  const { expandedTaskIds } = expansion.getSnapshot();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyTask, setHistoryTask] = useState<ApiTask | null>(null);
  const historyTaskId = useRef<string | null>(null);
  const [history, setHistory] = useState<ApiTaskExecutionUpdate[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [tasks, setTasks] = useState<ApiTask[]>(() => project.tasks ?? []);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pendingFocusPackageId, setPendingFocusPackageId] = useState<
    string | null
  >(null);
  const [internalTaskScope, setInternalTaskScope] = useState<TodayTaskScope>(
    () => taskScopeProp ?? (canEdit ? "team" : "mine"),
  );
  const taskScope = taskScopeProp ?? internalTaskScope;
  const navigableColumns =
    taskScope === "mine"
      ? TODAY_MINE_EDITABLE_COLUMNS
      : TODAY_TEAM_EDITABLE_COLUMNS;
  const gridTemplate =
    taskScope === "mine" ? mineGridTemplate : teamGridTemplate;

  useEffect(() => {
    committedTasks.current = project.tasks ?? [];
    setTasks(project.tasks ?? []);
  }, [project.id, project.tasks]);

  useEffect(() => {
    if (taskScopeProp) {
      return;
    }
    setInternalTaskScope(canEdit ? "team" : "mine");
  }, [canEdit, project.id, taskScopeProp]);

  const summaryTaskIds = useMemo(
    () => getHierarchyParentTaskIds(tasks),
    [tasks],
  );

  const scopedTasks = useMemo(() => {
    if (taskScope !== "mine" || !currentUserId) {
      return tasks;
    }
    const directTasks = tasks.filter(
      (task) =>
        task.taskKind !== "summary" && task.assigneeId === currentUserId,
    );
    return includeTaskAncestors(
      tasks,
      includePersonalWorkContext(tasks, directTasks, currentUserId),
    );
  }, [currentUserId, taskScope, tasks]);

  // Match work before adding hierarchy/context rows; counts never depend on expansion.
  const searchedTasks = useMemo(() => {
    const rows = buildTaskHierarchy(
      scopedTasks,
      getHierarchyParentTaskIds(scopedTasks),
    ).rows;
    const searchIds = new Set(
      filterRowsForSearch(rows, scopedTasks, searchTerm).map(
        (row) => row.task.id,
      ),
    );
    const matches = tasks.filter(
      (task) =>
        searchIds.has(task.id) &&
        (taskScope !== "mine" || task.assigneeId === currentUserId),
    );
    return [...new Map(matches.map((task) => [task.id, task])).values()];
  }, [scopedTasks, searchTerm, tasks, taskScope, currentUserId]);
  const today = new Date().toISOString().slice(0, 10);
  const attentionMatches = useMemo(() => {
    return new Map(
      primaryWorkFilters.map(([key]) => [
        key,
        searchedTasks.filter((task) =>
          matchesWorkAttention(task, key, currentUserId, today, secondary),
        ),
      ]),
    );
  }, [searchedTasks, currentUserId, secondary, today]);
  const matchingTasks = useMemo(
    () => attentionMatches.get(attention) ?? [],
    [attentionMatches, attention],
  );
  const visibleRows = useMemo(() => {
    const context =
      taskScope === "mine"
        ? includePersonalWorkContext(tasks, matchingTasks, currentUserId ?? "")
        : matchingTasks;
    const filtered = includeTaskAncestors(tasks, context);
    return buildTaskHierarchy(
      filtered,
      taskScope === "mine"
        ? getHierarchyParentTaskIds(filtered)
        : expandedTaskIds,
    ).rows;
  }, [tasks, matchingTasks, currentUserId, expandedTaskIds, taskScope]);

  const workPackageIds = useMemo(
    () => getWorkPackageIds(visibleRows),
    [visibleRows],
  );
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  useEffect(() => {
    if (!searchTerm.trim()) {
      return;
    }
    const matchIds = tasks
      .filter((task) => matchesSearch(task, searchTerm))
      .map((task) => task.id);
    const ancestorIds = collectAncestorIds(tasks, matchIds);
    expansion.expandMany(
      ancestorIds.filter((id) => summaryTaskIds.includes(id)),
    );
  }, [expansion, searchTerm, summaryTaskIds, tasks]);

  const focusCell = useCallback(
    (taskId: string, column: TodayEditableColumn) => {
      if (!gridRef.current) {
        return false;
      }
      const focused = focusTodayCell(gridRef.current, taskId, column);
      if (focused) {
        setActiveTaskId(taskId);
      }
      return focused;
    },
    [],
  );

  const focusPackageEntry = useCallback(
    (packageId: string) => {
      const firstEditableId = findFirstEditableChildId(visibleRows, packageId);
      if (!firstEditableId) {
        return;
      }
      const task = tasksById.get(firstEditableId);
      const column = task ? getPreferredFocusColumn(task) : "updateNotes";
      focusCell(firstEditableId, column);
    },
    [focusCell, tasksById, visibleRows],
  );

  useEffect(() => {
    if (!pendingFocusPackageId) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      focusPackageEntry(pendingFocusPackageId);
      setPendingFocusPackageId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusPackageEntry, pendingFocusPackageId, visibleRows]);

  const canEditTask = useCallback(
    (
      task: ApiTask,
      action:
        | "canRecordUpdate"
        | "canAssign"
        | "canReassign"
        | "canEditDueDate"
        | "canComplete" = "canRecordUpdate",
    ) => {
      if (taskScope === "team" && !canEdit) return false;
      return resolveTaskUiCapabilities({
        currentUserId,
        members,
        project,
        task,
        roleNames,
        identityType,
      })[action];
    },
    [
      canEdit,
      currentUserId,
      taskScope,
      members,
      project,
      roleNames,
      identityType,
    ],
  );

  const setTaskScope = useCallback(
    (scope: TodayTaskScope) => {
      if (!taskScopeProp) {
        setInternalTaskScope(scope);
      }
      onTaskScopeChange?.(scope);
    },
    [onTaskScopeChange, taskScopeProp],
  );

  const editableTaskIds = useMemo(
    () =>
      getEditableTaskIds(visibleRows).filter((taskId) => {
        const task = tasksById.get(taskId);
        return task ? canEditTask(task) : false;
      }),
    [canEditTask, tasksById, visibleRows],
  );

  useEffect(() => {
    if (
      !activeTaskId ||
      visibleRows.some((row) => row.task.id === activeTaskId)
    )
      return;
    // A completed or filtered-out focused row must leave a usable keyboard target.
    if (document.activeElement === document.body) {
      const nextTask = visibleRows.find((row) => canEditTask(row.task))?.task;
      if (nextTask) focusCell(nextTask.id, getPreferredFocusColumn(nextTask));
      else
        filtersRef.current
          ?.querySelector<HTMLButtonElement>("button[aria-pressed=true]")
          ?.focus();
    }
    setActiveTaskId(null);
  }, [activeTaskId, visibleRows, canEditTask, focusCell]);

  const commitUpdate = useCallback(
    (task: ApiTask, overrides: ExecutionOverrides): Promise<void> => {
      const version = failureVersions.current.get(task.id) ?? 0;
      const requestGeneration = generation.current;
      const isCurrent = () => generation.current === requestGeneration;
      const save = async () => {
        if (
          !isCurrent() ||
          version !== (failureVersions.current.get(task.id) ?? 0)
        )
          return;
        const latest = committedTasks.current.find(
          (candidate) => candidate.id === task.id,
        );
        if (!latest || !canEditTask(latest)) return;
        if (refreshRequired.current.has(task.id)) {
          setSaveState("error");
          setSaveError("Refresh task state before saving another update.");
          return;
        }
        const changes = { ...overrides };
        if (
          changes.percentComplete !== undefined &&
          changes.status === undefined
        ) {
          changes.status =
            changes.percentComplete === 100
              ? "done"
              : latest.status === "done"
                ? changes.percentComplete === 0
                  ? "todo"
                  : "in_progress"
                : changes.percentComplete > 0 &&
                    ["todo", "backlog"].includes(latest.status)
                  ? "in_progress"
                  : latest.status;
        }
        if (
          latest.status === "blocked" &&
          changes.updateNotes !== undefined &&
          changes.status === undefined
        ) {
          changes.isBlocked = true;
          changes.blockerCategory = "Other";
          changes.blockerReason = changes.updateNotes ?? "";
        }
        if (changes.status === "blocked") {
          changes.blockerReason = getDisplayUpdateNotes(
            latest.latestExecutionUpdate?.updateNotes,
          );
          changes.blockerCategory = "Other";
        }
        const payload = buildExecutionUpdatePayload(latest, changes);
        const validationError = validateTodayUpdate(payload, changes);
        if (validationError) {
          setSaveState("error");
          setSaveError(`Validation: ${validationError}`);
          return;
        }
        setSaveState("saving");
        setSaveError(null);
        try {
          const updated = await onRecordExecutionUpdate(task.id, payload);
          if (!isCurrent()) return;
          committedTasks.current = committedTasks.current.map((candidate) =>
            candidate.id === task.id ? { ...candidate, ...updated } : candidate,
          );
          setTasks(committedTasks.current);
          setSaveState("saved");
          window.setTimeout(() => {
            if (isCurrent())
              setSaveState((current) =>
                current === "saved" ? "idle" : current,
              );
          }, 1200);
        } catch (error) {
          if (!isCurrent()) return;
          // A failed response may follow a committed POST. Cancel queued writes; never retry it.
          failureVersions.current.set(task.id, version + 1);
          refreshRequired.current.add(task.id);
          setNeedsRefresh(true);
          setSaveState("error");
          setSaveError(
            `Server: ${error instanceof Error ? error.message : "Unable to save update"}. Update was not retried.`,
          );
          const [state, refreshedHistory] = await Promise.allSettled([
            onRefreshTasks(),
            onLoadHistory(task.id),
          ]);
          if (!isCurrent()) return;
          if (
            refreshedHistory.status === "fulfilled" &&
            historyTaskId.current === task.id
          ) {
            setHistory(refreshedHistory.value);
          }
          if (state.status === "fulfilled") {
            committedTasks.current = state.value;
            setTasks(state.value);
            refreshRequired.current.delete(task.id);
            setNeedsRefresh(refreshRequired.current.size > 0);
          }
        }
      };
      const queued = (queues.current.get(task.id) ?? Promise.resolve()).then(
        save,
      );
      queues.current.set(task.id, queued);
      return queued;
    },
    [canEditTask, onRecordExecutionUpdate, onRefreshTasks, onLoadHistory],
  );

  const openHistory = useCallback(
    async (task: ApiTask) => {
      historyTaskId.current = task.id;
      setHistoryTask(task);
      setIsHistoryLoading(true);
      setHistory([]);
      try {
        setHistory(await onLoadHistory(task.id));
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Unable to load history",
        );
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [onLoadHistory],
  );

  const toggleExpand = useCallback(
    (taskId: string) => {
      const willExpand = !expansion.isExpanded(taskId);
      expansion.toggle(taskId);
      if (willExpand) {
        setPendingFocusPackageId(taskId);
      }
    },
    [expansion],
  );

  const expandAll = useCallback(() => {
    expansion.expandMany(summaryTaskIds);
  }, [expansion, summaryTaskIds]);

  const collapseAll = useCallback(() => {
    expansion.collapseAll();
  }, [expansion]);

  const moveHorizontal = useCallback(
    (taskId: string, column: TodayEditableColumn, direction: 1 | -1) => {
      let nextColumn = findAdjacentColumn(column, direction, navigableColumns);
      const currentTaskId = taskId;

      while (nextColumn) {
        if (focusCell(currentTaskId, nextColumn)) {
          return;
        }
        nextColumn = findAdjacentColumn(
          nextColumn,
          direction,
          navigableColumns,
        );
      }

      const adjacentTaskId = findAdjacentEditableTaskId(
        editableTaskIds,
        taskId,
        direction,
      );
      if (!adjacentTaskId) {
        return;
      }
      const wrapColumn =
        direction === 1
          ? navigableColumns[0]
          : navigableColumns[navigableColumns.length - 1];
      focusCell(adjacentTaskId, wrapColumn);
    },
    [editableTaskIds, focusCell, navigableColumns],
  );

  const moveVertical = useCallback(
    (taskId: string, column: TodayEditableColumn, direction: 1 | -1) => {
      const nextTaskId = findAdjacentEditableTaskId(
        editableTaskIds,
        taskId,
        direction,
      );
      if (!nextTaskId) {
        return;
      }
      focusCell(nextTaskId, column);
    },
    [editableTaskIds, focusCell],
  );

  const navigateWorkPackage = useCallback(
    (direction: 1 | -1) => {
      const currentPackageId = activeTaskId
        ? findOwningWorkPackageId(visibleRows, activeTaskId)
        : null;
      const nextPackageId = findAdjacentWorkPackageId(
        workPackageIds,
        currentPackageId,
        direction,
      );
      if (!nextPackageId) {
        return;
      }
      if (!expansion.isExpanded(nextPackageId)) {
        expansion.expand(nextPackageId);
      }
      setActiveTaskId(nextPackageId);
      setPendingFocusPackageId(nextPackageId);
    },
    [activeTaskId, expansion, visibleRows, workPackageIds],
  );

  const handleGridKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!canEdit && !currentUserId) {
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
        event.stopPropagation();
        navigateWorkPackage(event.key === "ArrowUp" ? -1 : 1);
        return;
      }

      const coords = readTodayCellCoordinates(event.target);
      if (!coords) {
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        moveHorizontal(coords.taskId, coords.column, event.shiftKey ? -1 : 1);
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (target instanceof HTMLInputElement && target.type !== "checkbox") {
        target.blur();
      }

      window.requestAnimationFrame(() => {
        moveVertical(coords.taskId, coords.column, 1);
      });
    },
    [canEdit, currentUserId, moveHorizontal, moveVertical, navigateWorkPackage],
  );

  return (
    <WorkspaceContent aria-label="Today workspace" spacing="compact">
      <WorkspaceSection padding="none" surface="plain">
        <div
          ref={filtersRef}
          aria-label="Attention filters"
          className="flex flex-wrap items-center gap-2 p-2"
        >
          {primaryWorkFilters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={attention === key}
              className={`rounded border px-2 py-1 text-xs font-semibold ${attention === key ? "border-brand bg-sky-50" : "border-slate-300 bg-white"}`}
              onClick={() => setAttention(key)}
            >
              {label} ({attentionMatches.get(key)?.length ?? 0})
            </button>
          ))}
          <details>
            <summary className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-xs font-semibold">
              More
            </summary>
            <label className="flex flex-col gap-1 p-2 text-xs">
              Additional filter
              <select
                aria-label="Additional filter"
                value={secondary}
                onChange={(event) =>
                  setSecondary(event.target.value as WorkSecondary)
                }
              >
                <option value="none">None</option>
                <option value="next7">Next 7 days</option>
                <option value="updated">Updated today</option>
                <option value="critical">Critical priority</option>
              </select>
            </label>
          </details>
        </div>
        <ActionToolbar
          className="gap-2 p-2"
          label="Today toolbar"
          search={
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-end">
              {embedded ? null : (
                <label className="flex min-w-[10rem] flex-col gap-0.5 text-[11px] font-semibold text-slate-600 sm:max-w-[14rem]">
                  Project
                  <select
                    aria-label="Select project"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      onSelectedProjectIdChange?.(event.target.value)
                    }
                    value={selectedProjectId}
                  >
                    {projects.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex min-w-[8rem] flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
                Scope
                <select
                  aria-label="Task scope"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) =>
                    setTaskScope(event.target.value as TodayTaskScope)
                  }
                  value={taskScope}
                >
                  <option value="mine">My Tasks</option>
                  <option value="team">Team Tasks</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-[11px] font-semibold text-slate-600">
                Search
                <input
                  aria-label="Search tasks"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => onSearchTermChange(event.target.value)}
                  placeholder="Search tasks"
                  type="search"
                  value={searchTerm}
                />
              </label>
            </div>
          }
          secondaryActions={
            <div className="flex flex-wrap items-center gap-1.5">
              {taskScope === "team" ? (
                <>
                  <button
                    className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={expandAll}
                    type="button"
                  >
                    Expand
                  </button>
                  <button
                    className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={collapseAll}
                    type="button"
                  >
                    Collapse
                  </button>
                </>
              ) : null}
              {needsRefresh ? (
                <button
                  type="button"
                  onClick={async () => {
                    const requestGeneration = generation.current;
                    try {
                      const refreshed = await onRefreshTasks();
                      if (requestGeneration !== generation.current) return;
                      committedTasks.current = refreshed;
                      setTasks(refreshed);
                      refreshRequired.current.clear();
                      setNeedsRefresh(false);
                    } catch (error) {
                      if (requestGeneration !== generation.current) return;
                      setSaveError(
                        `Server: ${error instanceof Error ? error.message : "Unable to refresh task state"}`,
                      );
                    }
                  }}
                >
                  Refresh task state
                </button>
              ) : null}
              <SaveIndicator
                error={saveError}
                isBusy={isSaving || saveState === "saving"}
                state={saveState}
              />
            </div>
          }
        />
      </WorkspaceSection>

      {saveError && saveState === "error" ? (
        <ErrorState message={saveError} title="Unable to save" />
      ) : null}

      {visibleRows.length === 0 ? (
        <EmptyState
          description={
            searchTerm.trim()
              ? "No tasks match the current search and filters."
              : "No work matches the current scope and filters."
          }
          title="Nothing to update"
        />
      ) : (
        <WorkspaceSection
          className="overflow-hidden"
          padding="none"
          surface="card"
        >
          <div
            aria-label="Today task grid"
            className="max-h-[calc(100vh-14rem)] min-w-0 overflow-auto text-xs"
            onFocusCapture={(event) => {
              const coords = readTodayCellCoordinates(event.target);
              if (coords) {
                setActiveTaskId(coords.taskId);
              }
            }}
            onKeyDownCapture={handleGridKeyDownCapture}
            ref={gridRef}
            role="table"
            tabIndex={-1}
          >
            <div
              className="sticky top-0 z-30 grid min-w-[64rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
              role="row"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {taskScope === "team" ? (
                <>
                  <div role="columnheader">WBS</div>
                  <div role="columnheader">Task</div>
                  <div role="columnheader">Owner</div>
                  <div role="columnheader">Priority</div>
                  <div role="columnheader">Status</div>
                  <div role="columnheader">Progress</div>
                  <div role="columnheader">Due</div>
                  <div role="columnheader">Today&apos;s Update</div>
                  <div role="columnheader">Next Step</div>
                  <div role="columnheader">Next Owner</div>
                  <div role="columnheader">History</div>
                </>
              ) : (
                <>
                  <div role="columnheader">Task</div>
                  <div role="columnheader">Priority</div>
                  <div role="columnheader">Status</div>
                  <div role="columnheader">Progress</div>
                  <div role="columnheader">Due</div>
                  <div role="columnheader">Today&apos;s Update</div>
                  <div role="columnheader">Next Step</div>
                  <div role="columnheader">History</div>
                </>
              )}
            </div>

            {visibleRows.map((row) => (
              <TodayTaskRow
                active={activeTaskId === row.task.id}
                canEdit={canEditTask(row.task)}
                canEditAssignee={canEditTask(
                  row.task,
                  row.task.assigneeId ? "canReassign" : "canAssign",
                )}
                canEditDueDate={canEditTask(row.task, "canEditDueDate")}
                canComplete={canEditTask(row.task, "canComplete")}
                currentUserId={currentUserId}
                expanded={expandedTaskIds.includes(row.task.id)}
                gridTemplate={gridTemplate}
                key={`${project.id}:${row.task.id}`}
                members={members}
                onCommit={commitUpdate}
                onOpenHistory={openHistory}
                onToggleExpand={toggleExpand}
                row={row}
                taskScope={taskScope}
              />
            ))}
          </div>
        </WorkspaceSection>
      )}

      {historyTask ? (
        <HistoryPanel
          history={history}
          isLoading={isHistoryLoading}
          members={members}
          onClose={() => {
            historyTaskId.current = null;
            setHistoryTask(null);
          }}
          task={historyTask}
        />
      ) : null}
    </WorkspaceContent>
  );
}

const TodayTaskRow = memo(function TodayTaskRow({
  active,
  canEdit,
  canEditAssignee,
  canEditDueDate,
  canComplete,
  currentUserId,
  expanded,
  gridTemplate,
  members,
  onCommit,
  onOpenHistory,
  onToggleExpand,
  row,
  taskScope,
}: {
  active: boolean;
  canEdit: boolean;
  canEditAssignee: boolean;
  canEditDueDate: boolean;
  canComplete: boolean;
  currentUserId: string | null;
  expanded: boolean;
  gridTemplate: string;
  members: ApiProjectMember[];
  onCommit: (task: ApiTask, overrides: ExecutionOverrides) => Promise<void>;
  onOpenHistory: (task: ApiTask) => void;
  onToggleExpand: (taskId: string) => void;
  row: TodayRow;
  taskScope: TodayTaskScope;
}) {
  const { task } = row;
  const isSummary = task.taskKind === "summary";
  const editable = canEdit && !isSummary;
  const priorityEditable = editable;
  const isDone = task.status === "done";
  const nextStep = task.latestExecutionUpdate?.nextStep ?? "";
  const storedUpdateNotes = getDisplayUpdateNotes(
    task.latestExecutionUpdate?.updateNotes,
  );
  const updateNotes = storedUpdateNotes;
  const nextOwnerId =
    task.latestExecutionUpdate?.nextActionOwnerId ?? task.assigneeId ?? "";
  const targetDate =
    task.latestExecutionUpdate?.targetCompletionDate ??
    task.dueDate ??
    task.plannedEndDate ??
    "";
  const progress = getDisplayedPercentComplete(task);
  const isPackageHeader = isSummary || row.hasChildren;
  const showTeamColumns = taskScope === "team";
  const showContextAssignee =
    taskScope === "mine" &&
    Boolean(task.assigneeId) &&
    task.assigneeId !== currentUserId;

  const taskTitleCell = (
    <div role="cell">
      <div
        className="flex min-w-0 items-center gap-1"
        style={{ paddingLeft: `${row.depth * 14}px` }}
      >
        {showTeamColumns && row.hasChildren ? (
          <DisclosureButton
            expanded={expanded}
            label={task.title}
            onClick={() => onToggleExpand(task.id)}
          />
        ) : showTeamColumns ? (
          <span aria-hidden="true" className="inline-block w-6 shrink-0" />
        ) : null}
        <span
          className={`truncate font-medium ${
            isSummary
              ? "text-slate-900"
              : isDone
                ? "text-slate-500"
                : "text-slate-800"
          }`}
          title={task.title}
        >
          {task.title}
        </span>
        {showContextAssignee ? (
          <span className="shrink-0 text-[11px] font-medium text-slate-500">
            {formatMemberByUserId(task.assigneeId, members)}
          </span>
        ) : null}
      </div>
    </div>
  );

  const priorityCell = (
    <div role="cell">
      {isSummary ? (
        <span className="text-slate-400">—</span>
      ) : priorityEditable ? (
        <InlineSelect
          column="priority"
          disabled={!priorityEditable}
          label={`Priority for ${task.title}`}
          onCommit={(priority) =>
            void onCommit(task, {
              priority: priority as ApiTask["priority"],
            })
          }
          options={taskPriorities}
          taskId={task.id}
          value={task.priority}
        />
      ) : (
        <span
          aria-label={`Priority for ${task.title}`}
          className="text-[11px] font-semibold uppercase text-slate-700"
        >
          {task.priority}
        </span>
      )}
    </div>
  );

  const statusCell = (
    <div role="cell">
      {isSummary ? (
        <StatusBadge size="sm" tone="neutral">
          Summary
        </StatusBadge>
      ) : (
        <InlineSelect
          column="status"
          disabled={!editable}
          label={`Status for ${task.title}`}
          onCommit={(status) =>
            void onCommit(task, {
              status: status as ApiTask["status"],
              isBlocked: status === "blocked",
            })
          }
          options={taskStatuses.map((status) => ({
            ...status,
            disabled: status.value === "done" && !canComplete,
          }))}
          taskId={task.id}
          value={task.status}
        />
      )}
    </div>
  );

  const progressCell = (
    <div role="cell">
      {isSummary ? (
        <span className="font-semibold text-slate-700">{progress}%</span>
      ) : (
        <InlineProgressInput
          column="progress"
          disabled={!editable}
          label={`Progress for ${task.title}`}
          onCommit={(percentComplete) =>
            void onCommit(task, {
              percentComplete,
            })
          }
          taskId={task.id}
          value={progress}
        />
      )}
    </div>
  );

  const dueCell = (
    <div role="cell">
      {isSummary ? (
        <span className="text-slate-400">—</span>
      ) : (
        <InlineDateInput
          column="targetDate"
          disabled={!canEditDueDate}
          label={`Due date for ${task.title}`}
          onCommit={(targetCompletionDate) =>
            void onCommit(task, {
              targetCompletionDate,
            })
          }
          taskId={task.id}
          value={targetDate}
        />
      )}
    </div>
  );

  const updateCell = (
    <div role="cell">
      {isSummary ? (
        <span className="text-slate-400">—</span>
      ) : (
        <InlineTextInput
          column="updateNotes"
          committedValue={storedUpdateNotes}
          disabled={!editable}
          label={`Today's update for ${task.title}`}
          onCommit={(notes) =>
            void onCommit(task, {
              updateNotes: notes,
            })
          }
          placeholder="Type today's update..."
          taskId={task.id}
          value={updateNotes}
        />
      )}
    </div>
  );

  const nextStepCell = (
    <div role="cell">
      {isSummary ? (
        <span className="text-slate-400">—</span>
      ) : (
        <InlineTextInput
          column="nextStep"
          committedValue={nextStep}
          disabled={!editable}
          label={`Next step for ${task.title}`}
          onCommit={(value) =>
            void onCommit(task, {
              nextStep: value,
            })
          }
          placeholder="Next step..."
          taskId={task.id}
          value={nextStep}
        />
      )}
    </div>
  );

  const historyCell = (
    <div role="cell">
      {isSummary ? (
        <span className="text-slate-400">—</span>
      ) : (
        <button
          className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
          onClick={() => onOpenHistory(task)}
          type="button"
        >
          History
        </button>
      )}
    </div>
  );

  return (
    <div
      className={[
        "grid min-w-[64rem] items-center gap-2 border-b px-3 py-1.5",
        isPackageHeader
          ? "sticky z-20 border-slate-200 bg-slate-100/95 font-medium shadow-sm backdrop-blur-sm"
          : "border-slate-100",
        !isPackageHeader && isDone ? "bg-slate-100/80 text-slate-500" : null,
        !isPackageHeader && active && !isDone ? "bg-sky-50/90" : null,
        !isPackageHeader && !active && !isDone ? "hover:bg-slate-50/80" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      data-today-row={task.id}
      role="row"
      style={{
        gridTemplateColumns: gridTemplate,
        top: isPackageHeader ? COLUMN_HEADER_OFFSET : undefined,
      }}
    >
      {showTeamColumns ? (
        <>
          <div className="font-medium text-slate-500" role="cell">
            {row.wbs}
          </div>
          {taskTitleCell}
          <div role="cell">
            {isSummary ? (
              <span className="text-slate-400">—</span>
            ) : (
              <InlineAssigneeSelect
                column="owner"
                disabled={!canEditAssignee}
                label={`Owner for ${task.title}`}
                members={members}
                onCommit={(assigneeId) =>
                  void onCommit(task, {
                    assigneeId,
                  })
                }
                taskId={task.id}
                value={task.assigneeId ?? ""}
              />
            )}
          </div>
          {priorityCell}
          {statusCell}
          {progressCell}
          {dueCell}
          {updateCell}
          {nextStepCell}
          <div role="cell">
            {isSummary ? (
              <span className="text-slate-400">—</span>
            ) : (
              <InlineAssigneeSelect
                column="nextOwner"
                disabled={!editable}
                label={`Next owner for ${task.title}`}
                members={members}
                onCommit={(nextActionOwnerId) =>
                  void onCommit(task, {
                    nextActionOwnerId:
                      nextActionOwnerId || task.assigneeId || null,
                  })
                }
                taskId={task.id}
                value={nextOwnerId}
              />
            )}
          </div>
          {historyCell}
        </>
      ) : (
        <>
          {taskTitleCell}
          {priorityCell}
          {statusCell}
          {progressCell}
          {dueCell}
          {updateCell}
          {nextStepCell}
          {historyCell}
        </>
      )}
    </div>
  );
}, areTodayTaskRowsEqual);

function areTodayTaskRowsEqual(
  previous: Readonly<{
    active: boolean;
    canEdit: boolean;
    canEditAssignee: boolean;
    canEditDueDate: boolean;
    canComplete: boolean;
    currentUserId: string | null;
    expanded: boolean;
    gridTemplate: string;
    members: ApiProjectMember[];
    row: TodayRow;
    taskScope: TodayTaskScope;
  }>,
  next: Readonly<{
    active: boolean;
    canEdit: boolean;
    canEditAssignee: boolean;
    canEditDueDate: boolean;
    canComplete: boolean;
    currentUserId: string | null;
    expanded: boolean;
    gridTemplate: string;
    members: ApiProjectMember[];
    row: TodayRow;
    taskScope: TodayTaskScope;
  }>,
) {
  return (
    previous.active === next.active &&
    previous.canEdit === next.canEdit &&
    previous.canEditAssignee === next.canEditAssignee &&
    previous.canEditDueDate === next.canEditDueDate &&
    previous.canComplete === next.canComplete &&
    previous.currentUserId === next.currentUserId &&
    previous.expanded === next.expanded &&
    previous.gridTemplate === next.gridTemplate &&
    previous.members === next.members &&
    previous.taskScope === next.taskScope &&
    previous.row.depth === next.row.depth &&
    previous.row.hasChildren === next.row.hasChildren &&
    previous.row.wbs === next.row.wbs &&
    previous.row.task === next.row.task
  );
}

function HistoryPanel({
  history,
  isLoading,
  members,
  onClose,
  task,
}: {
  history: ApiTaskExecutionUpdate[];
  isLoading: boolean;
  members: ApiProjectMember[];
  onClose: () => void;
  task: ApiTask;
}) {
  return (
    <div
      aria-label={`History for ${task.title}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-ui-subtle"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Execution history
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-slate-950">
            {task.title}
          </h2>
        </div>
        <button
          className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading history…</p>
        ) : null}
        {!isLoading && history.length === 0 ? (
          <EmptyState
            compact
            description="No execution updates recorded yet."
            title="No history"
          />
        ) : null}
        {history.map((update) => (
          <article
            className="rounded-md border border-slate-200 p-3 text-sm"
            key={update.id}
          >
            <div className="flex justify-between gap-2 text-xs text-slate-500">
              <span>{formatDate(update.updatedOn)}</span>
              <span>{formatMemberByUserId(update.updatedById, members)}</span>
            </div>
            <p className="mt-2 font-medium text-slate-900">
              {update.nextStep ?? "No next step recorded"}
            </p>
            {update.updateNotes ? (
              <p className="mt-1 whitespace-pre-line text-slate-600">
                {getDisplayUpdateNotes(update.updateNotes)}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function SaveIndicator({
  error,
  isBusy,
  state,
}: {
  error: string | null;
  isBusy: boolean;
  state: SaveState;
}) {
  if (isBusy || state === "saving") {
    return (
      <span aria-live="polite" className="text-xs font-medium text-slate-500">
        Saving...
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span aria-live="polite" className="text-xs font-medium text-emerald-700">
        Saved
      </span>
    );
  }
  if (state === "error" && error) {
    return (
      <span aria-live="polite" className="text-xs font-medium text-red-700">
        Save failed
      </span>
    );
  }
  return null;
}

function useCommittedDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const previousValue = previous.current;
    setDraft((current) =>
      current === previousValue || current === value ? value : current,
    );
    previous.current = value;
  }, [value]);
  return [draft, setDraft] as const;
}

function InlineSelect({
  column,
  disabled,
  label,
  onCommit,
  options,
  taskId,
  value,
}: {
  column: TodayEditableColumn;
  disabled: boolean;
  label: string;
  onCommit: (value: string) => void;
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  taskId: string;
  value: string;
}) {
  const [draft, setDraft] = useCommittedDraft(value);
  return (
    <select
      aria-label={label}
      className={editableControlClassName}
      data-today-column={column}
      data-today-task-id={taskId}
      disabled={disabled}
      onChange={(event) => {
        setDraft(event.target.value);
        onCommit(event.target.value);
      }}
      value={draft}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

function InlineAssigneeSelect({
  column,
  disabled,
  label,
  members,
  onCommit,
  taskId,
  value,
}: {
  column: TodayEditableColumn;
  disabled: boolean;
  label: string;
  members: ApiProjectMember[];
  onCommit: (assigneeId: string | null) => void;
  taskId: string;
  value: string;
}) {
  const [draft, setDraft] = useCommittedDraft(value);
  return (
    <select
      aria-label={label}
      className={editableControlClassName}
      data-today-column={column}
      data-today-task-id={taskId}
      disabled={disabled}
      onChange={(event) => {
        setDraft(event.target.value);
        onCommit(event.target.value || null);
      }}
      value={draft}
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option
          key={member.id}
          value={member.userId}
          disabled={
            column === "owner" &&
            ((Boolean(member.user?.status) &&
              member.user?.status !== "active") ||
              member.user?.role === "PARTNER" ||
              (member.user?.role === "CUSTOMER" && member.role !== "viewer"))
          }
        >
          {formatMemberName(member)}
        </option>
      ))}
    </select>
  );
}

function InlineTextInput({
  column,
  committedValue,
  disabled,
  label,
  onCommit,
  placeholder,
  taskId,
  value,
}: {
  column: TodayEditableColumn;
  committedValue: string;
  disabled: boolean;
  label: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  taskId: string;
  value: string;
}) {
  const [draft, setDraft] = useCommittedDraft(value);
  const cancelCommitRef = useRef(false);

  return (
    <div className="relative">
      <input
        aria-label={label}
        className={editableControlClassName}
        data-today-column={column}
        data-today-task-id={taskId}
        disabled={disabled}
        onBlur={() => {
          if (cancelCommitRef.current) {
            cancelCommitRef.current = false;
            return;
          }
          // Only explicit edits become new commentary.
          if (draft !== committedValue) {
            onCommit(draft);
          }
        }}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelCommitRef.current = true;
            setDraft(value);
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder={placeholder}
        value={draft}
      />
    </div>
  );
}

function InlineProgressInput({
  column,
  disabled,
  label,
  onCommit,
  taskId,
  value,
}: {
  column: TodayEditableColumn;
  disabled: boolean;
  label: string;
  onCommit: (value: number) => void;
  taskId: string;
  value: number;
}) {
  const [draft, setDraft] = useCommittedDraft(String(value));

  const cancelCommitRef = useRef(false);

  function commitDraft() {
    if (cancelCommitRef.current) {
      cancelCommitRef.current = false;
      return;
    }
    const nextValue = draft.trim() ? Number(draft) : Number.NaN;
    if (nextValue !== value) onCommit(nextValue);
  }

  return (
    <div className="flex items-center gap-1">
      <input
        aria-label={label}
        className={`${editableControlClassName} min-w-0`}
        data-today-column={column}
        data-today-task-id={taskId}
        disabled={disabled}
        max={100}
        min={0}
        onBlur={commitDraft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelCommitRef.current = true;
            setDraft(String(value));
            (event.target as HTMLInputElement).blur();
            return;
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const current = Number(draft);
            const base = Number.isFinite(current) ? current : value;
            const delta = event.key === "ArrowUp" ? 1 : -1;
            const next = Math.min(100, Math.max(0, Math.round(base + delta)));
            setDraft(String(next));
          }
        }}
        type="number"
        value={draft}
      />
      <span aria-hidden="true" className="shrink-0 text-xs text-slate-500">
        %
      </span>
    </div>
  );
}

function InlineDateInput({
  column,
  disabled,
  label,
  onCommit,
  taskId,
  value,
}: {
  column: TodayEditableColumn;
  disabled: boolean;
  label: string;
  onCommit: (value: string | null) => void;
  taskId: string;
  value: string;
}) {
  const normalized = value ? value.slice(0, 10) : "";
  const [draft, setDraft] = useCommittedDraft(normalized);

  return (
    <input
      aria-label={label}
      className={editableControlClassName}
      data-today-column={column}
      data-today-task-id={taskId}
      disabled={disabled}
      onChange={(event) => {
        setDraft(event.target.value);
        onCommit(event.target.value || null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(normalized);
          (event.target as HTMLInputElement).blur();
        }
      }}
      type="date"
      value={draft}
    />
  );
}

function findFirstEditableChildId(
  rows: readonly TodayRow[],
  packageId: string,
) {
  let foundPackage = false;
  const packageDepth =
    rows.find((row) => row.task.id === packageId)?.depth ?? 0;

  for (const row of rows) {
    if (row.task.id === packageId) {
      foundPackage = true;
      continue;
    }
    if (!foundPackage) {
      continue;
    }
    if (
      (row.task.taskKind === "summary" || row.hasChildren) &&
      row.depth <= packageDepth
    ) {
      break;
    }
    if (isEditableTodayTask(row.task)) {
      return row.task.id;
    }
  }
  return null;
}

function filterRowsForSearch(
  rows: TodayRow[],
  allTasks: ApiTask[],
  searchTerm: string,
) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }

  const matchIds = new Set(
    allTasks
      .filter((task) => matchesSearch(task, searchTerm))
      .map((task) => task.id),
  );
  if (matchIds.size === 0) {
    return [];
  }

  const keepIds = new Set<string>();
  for (const taskId of matchIds) {
    keepIds.add(taskId);
    for (const ancestorId of collectAncestorIds(allTasks, [taskId])) {
      keepIds.add(ancestorId);
    }
    for (const descendantId of collectDescendantIds(allTasks, taskId)) {
      keepIds.add(descendantId);
    }
  }

  return rows.filter((row) => keepIds.has(row.task.id));
}

function collectAncestorIds(tasks: ApiTask[], taskIds: string[]) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ancestors = new Set<string>();
  for (const taskId of taskIds) {
    let current = byId.get(taskId);
    while (current?.parentTaskId) {
      ancestors.add(current.parentTaskId);
      current = byId.get(current.parentTaskId);
    }
  }
  return [...ancestors];
}

function collectDescendantIds(tasks: ApiTask[], rootId: string) {
  const children = new Map<string, string[]>();
  for (const task of tasks) {
    if (!task.parentTaskId) continue;
    const list = children.get(task.parentTaskId) ?? [];
    list.push(task.id);
    children.set(task.parentTaskId, list);
  }
  const result: string[] = [];
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return result;
}

function matchesSearch(task: ApiTask, searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    task.title,
    task.assignee?.displayName,
    task.assignee?.firstName,
    task.assignee?.lastName,
    task.latestExecutionUpdate?.nextStep,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function validateTodayUpdate(
  payload: TaskExecutionUpdatePayload,
  overrides: ExecutionOverrides,
) {
  if (
    !Number.isInteger(payload.percentComplete) ||
    payload.percentComplete < 0 ||
    payload.percentComplete > 100
  ) {
    return "Progress must be a whole number between 0 and 100.";
  }

  if (!taskPriorities.some((priority) => priority.value === payload.priority)) {
    return "Priority must be low, medium, high, or critical.";
  }
  if (payload.status === "done" && payload.percentComplete !== 100) {
    return "Done tasks must be at 100% progress.";
  }
  if (
    ["todo", "backlog"].includes(payload.status) &&
    payload.percentComplete !== 0
  ) {
    return "Todo and Backlog tasks must stay at 0% progress.";
  }
  if (
    payload.status === "in_progress" &&
    (payload.percentComplete <= 0 || payload.percentComplete >= 100)
  ) {
    return "In Progress tasks must be between 1% and 99% complete.";
  }

  if (
    payload.status === "blocked" &&
    (overrides.status === "blocked" || overrides.isBlocked)
  ) {
    const reason = overrides.blockerReason?.trim() ?? "";
    if (!reason) {
      return "Add a blocker reason in Today's Update when marking blocked.";
    }
  }

  return null;
}

function getDisplayUpdateNotes(updateNotes?: string | null) {
  if (!updateNotes) {
    return "";
  }
  return updateNotes
    .split("\n")
    .filter((line) => !line.startsWith("Blocker Category:"))
    .join("\n")
    .replace(/^Blocker:\s*/gm, "")
    .trim();
}

function formatMemberName(member: ApiProjectMember) {
  const user = member.user;

  if (!user) {
    return "Unassigned";
  }

  return (
    user.displayName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Unknown User"
  );
}

function formatMemberByUserId(
  userId: string | null | undefined,
  members: ApiProjectMember[],
) {
  if (!userId) {
    return "Unknown";
  }
  const member = members.find((candidate) => candidate.userId === userId);
  return member ? formatMemberName(member) : "Unknown";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
