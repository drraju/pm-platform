"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ActionToolbar,
  ErrorState,
  LoadingState,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceSection,
} from "@/components/foundation";
import {
  createDefaultDeliveryFilterState,
  deliveryAttentionFilters,
  deliveryFilterToState,
  deliveryOwnerFilters,
  deliveryPriorityFilters,
  deliveryStateToLegacyFilter,
  deliveryStatusFilters,
  filterDeliveryTasksByState,
  getActiveDeliveryFilterLabels,
  getDeliveryAttentionSummary,
  getDeliveryFilterCounts,
  isDeliveryFilter,
  type DeliveryAttentionFilter,
  type DeliveryFilterState,
  type DeliveryOwnerFilter,
  type DeliveryPriorityFilter,
  type DeliveryStatusFilter,
} from "@/components/delivery/delivery-filters";
import { DeliveryHistory } from "@/components/delivery/delivery-history";
import { DeliveryTimeline } from "@/components/delivery/delivery-timeline";
import {
  DELIVERY_VIEWS,
  getDeliveryHref,
  parseDeliveryView,
  type DeliveryView,
} from "@/components/delivery/delivery-views";
import {
  CompactProjectWorkspaceLayout,
  ProjectLayout,
} from "@/components/project";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import { TodayWorkspace } from "@/components/today/today-workspace";
import {
  getAuthMe,
  resolveProjectUiCapabilities,
  storeAuthMe,
} from "@/features/auth";
import {
  getProject,
  recordProjectTaskExecutionUpdate,
  updateProjectTask,
  type ApiProjectDetails,
} from "@/features/projects";
import { decorateProjectPlan } from "@/features/projects/planning";
import { getTaskExecutionUpdates } from "@/features/tasks";
import { useProjectMembers } from "@/hooks/use-project-members";
import type { ApiTask } from "@/lib/api/client";
import { includeTaskAncestors } from "@/lib/tasks/include-task-ancestors";
import { includePersonalWorkContext } from "@/lib/tasks/personal-work-context";
import {
  readPersistedWorkspaceState,
  writePersistedWorkspaceState,
} from "@/lib/workspace/persisted-workspace-state";

type DeliveryWorkspacePrefs = {
  /** Legacy single-filter field kept for backward compatibility. */
  activeFilter?: string;
  attention?: DeliveryAttentionFilter;
  owner?: DeliveryOwnerFilter;
  priority?: DeliveryPriorityFilter;
  searchTerm: string;
  status?: DeliveryStatusFilter;
  view: DeliveryView;
};

const viewLabels: Record<DeliveryView, string> = {
  board: "Board",
  history: "History",
  list: "List",
  timeline: "Timeline",
  today: "Today",
};

function getDeliveryPrefsKey(projectId: string) {
  // v2 defaults filter to "all" so Board/List workflow columns include Done.
  return `delivery:v2:${projectId}`;
}

export default function ProjectDeliveryPage() {
  return (
    <Suspense
      fallback={
        <LoadingState label="Loading Delivery workspace" rows={6} />
      }
    >
      <ProjectDeliveryPageContent />
    </Suspense>
  );
}

function ProjectDeliveryPageContent() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewQuery = searchParams.get("view");
  const viewFromQuery = parseDeliveryView(viewQuery, "list");

  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [filterState, setFilterState] = useState<DeliveryFilterState>(() =>
    createDefaultDeliveryFilterState(),
  );
  const [activeView, setActiveView] = useState<DeliveryView>(viewFromQuery);
  const [searchTerm, setSearchTerm] = useState("");
  const [todaySearchTerm, setTodaySearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [prefsProjectId, setPrefsProjectId] = useState<string | null>(null);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
  } = useProjectMembers(projectId, project?.members ?? []);

  useEffect(() => {
    const prefs = readPersistedWorkspaceState<DeliveryWorkspacePrefs>(
      getDeliveryPrefsKey(projectId),
      {
        activeFilter: "all",
        searchTerm: "",
        view: "list",
      },
    );
    setFilterState(hydrateDeliveryFilterState(prefs));
    setSearchTerm(typeof prefs.searchTerm === "string" ? prefs.searchTerm : "");
    setActiveView(parseDeliveryView(viewQuery ?? prefs.view, "list"));
    setPrefsProjectId(projectId);
    // Hydrate once per project; query-driven updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional project-scoped hydrate
  }, [projectId]);

  useEffect(() => {
    if (!viewQuery) {
      return;
    }
    setActiveView(parseDeliveryView(viewQuery, "list"));
  }, [viewQuery]);

  useEffect(() => {
    if (prefsProjectId !== projectId) {
      return;
    }
    writePersistedWorkspaceState(getDeliveryPrefsKey(projectId), {
      activeFilter: deliveryStateToLegacyFilter(filterState),
      attention: filterState.attention,
      owner: filterState.owner,
      priority: filterState.priority,
      searchTerm,
      status: filterState.status,
      view: activeView,
    });
  }, [activeView, filterState, prefsProjectId, projectId, searchTerm]);

  const loadProject = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [projectDetails, authMe] = await Promise.all([
        getProject(projectId),
        getAuthMe(),
      ]);
      storeAuthMe(authMe);
      setProject(decorateProjectPlan(projectDetails));
      setCurrentUserId(authMe.user.id);
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
      setRoleNames(authMe.roles.map((role) => role.name));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load Delivery workspace",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  async function handleUpdateTask(
    taskId: string,
    input: {
      actualEndDate?: string | null;
      actualStartDate?: string | null;
      assigneeId?: string | null;
      percentComplete?: number;
      priority?: string;
      remarks?: string | null;
      status?: ApiTask["status"];
    },
  ) {
    setError(null);
    setIsSaving(true);
    try {
      const updatedTask = await updateProjectTask(projectId, taskId, input);
      updateTaskInProject(updatedTask);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update project task",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRecordExecutionUpdate(
    taskId: string,
    input: Parameters<typeof recordProjectTaskExecutionUpdate>[2],
  ) {
    setError(null);
    setIsSaving(true);
    try {
      const updatedTask = await recordProjectTaskExecutionUpdate(
        projectId,
        taskId,
        input,
      );
      updateTaskInProject(updatedTask);
      return updatedTask;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to record task execution update",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  function updateTaskInProject(updatedTask: ApiTask) {
    setProject((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }
      return {
        ...currentProject,
        tasks: (currentProject.tasks ?? []).map((task) =>
          task.id === updatedTask.id
            ? {
                ...task,
                ...updatedTask,
                assignee:
                  members.find(
                    (member) => member.userId === updatedTask.assigneeId,
                  )?.user ?? updatedTask.assignee,
              }
            : task,
        ),
      };
    });
  }

  function handleViewChange(view: DeliveryView) {
    setActiveView(view);
    router.replace(getDeliveryHref(projectId, view), { scroll: false });
  }

  const capabilities = resolveProjectUiCapabilities({
    currentUserId,
    members,
    permissionKeys,
    project,
    roleNames,
  });
  const canAccessDelivery = capabilities.canAccessDelivery;

  // Canonical decorated collection from decorateProjectPlan (single load).
  const decoratedTasks = useMemo(() => project?.tasks ?? [], [project?.tasks]);
  const standardTasks = useMemo(
    () => decoratedTasks.filter((task) => task.taskKind !== "summary"),
    [decoratedTasks],
  );
  const matchedTasks = useMemo(
    () =>
      filterDeliveryTasksByState(
        standardTasks,
        filterState,
        currentUserId,
        searchTerm,
      ),
    [currentUserId, filterState, searchTerm, standardTasks],
  );
  const contextualMatchedTasks = useMemo(
    () =>
      filterState.owner === "mine"
        ? includePersonalWorkContext(decoratedTasks, matchedTasks, currentUserId)
        : matchedTasks,
    [currentUserId, decoratedTasks, filterState.owner, matchedTasks],
  );
  // List hierarchy visits roots only; keep summary ancestors so nested
  // matched standards remain reachable without a second task collection.
  const visibleTasks = useMemo(
    () => includeTaskAncestors(decoratedTasks, contextualMatchedTasks),
    [contextualMatchedTasks, decoratedTasks],
  );
  const filterCounts = useMemo(
    () => getDeliveryFilterCounts(standardTasks, currentUserId),
    [currentUserId, standardTasks],
  );
  const attentionSummary = useMemo(
    () => getDeliveryAttentionSummary(standardTasks, currentUserId),
    [currentUserId, standardTasks],
  );
  const activeFilterLabels = useMemo(
    () => getActiveDeliveryFilterLabels(filterState),
    [filterState],
  );
  const showListBoardControls =
    activeView === "list" || activeView === "board";

  const availableViews = useMemo(
    () =>
      DELIVERY_VIEWS.filter(
        (view) => view !== "today" || capabilities.canAccessToday,
      ),
    [capabilities.canAccessToday],
  );

  const workspaceProject = project ?? {
    id: projectId,
    name: "Delivery Workspace",
    status: "active",
  };

  return (
    <ProjectLayout
      activeTab="delivery"
      layout={CompactProjectWorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => (
        <WorkspaceHeader density="compact" {...content} />
      )}
    >
      <WorkspaceContent spacing="compact">
        {isLoading || areMembersLoading ? (
          <LoadingState
            className="rounded-ui border border-ui-border bg-ui-surface p-5 shadow-ui-subtle"
            label="Loading Delivery workspace"
            rows={6}
          />
        ) : null}

        {error ? <ErrorState message={error} /> : null}
        {memberError ? <ErrorState message={memberError} /> : null}

        {!isLoading && !areMembersLoading && !canAccessDelivery ? (
          <ErrorState
            message="Delivery workspace requires project read and task update access."
            title="Delivery workspace access required"
          />
        ) : null}

        {!isLoading && !areMembersLoading && canAccessDelivery && project ? (
          <>
            <WorkspaceSection
              className="sticky top-0 z-20 space-y-2"
              padding="none"
              surface="plain"
            >
              <div
                aria-label="Delivery views"
                className="inline-flex w-full flex-wrap rounded-md border border-slate-200 bg-white p-1 sm:w-fit"
                role="group"
              >
                {availableViews.map((view) => (
                  <button
                    aria-pressed={activeView === view}
                    className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                      activeView === view
                        ? "bg-brand text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    key={view}
                    onClick={() => handleViewChange(view)}
                    type="button"
                  >
                    {viewLabels[view]}
                  </button>
                ))}
              </div>

              {showListBoardControls ? (
                <>
                  <ActionToolbar
                    density="compact"
                    filters={
                      <div
                        aria-label="Delivery filters"
                        className="flex w-full flex-wrap items-end gap-2"
                      >
                        <FilterSelect
                          label="Status"
                          onChange={(value) =>
                            setFilterState((current) => ({
                              ...current,
                              status: value as DeliveryStatusFilter,
                            }))
                          }
                          options={deliveryStatusFilters}
                          value={filterState.status}
                        />
                        <FilterSelect
                          label="Owner"
                          onChange={(value) =>
                            setFilterState((current) => ({
                              ...current,
                              owner: value as DeliveryOwnerFilter,
                            }))
                          }
                          options={deliveryOwnerFilters}
                          value={filterState.owner}
                        />
                        <FilterSelect
                          label="Priority"
                          onChange={(value) =>
                            setFilterState((current) => ({
                              ...current,
                              priority: value as DeliveryPriorityFilter,
                            }))
                          }
                          options={deliveryPriorityFilters}
                          value={filterState.priority}
                        />
                        <div className="relative">
                          <button
                            aria-expanded={isMoreFiltersOpen}
                            aria-haspopup="listbox"
                            className={`rounded border px-2.5 py-1.5 text-xs font-semibold transition ${
                              filterState.attention !== "none" ||
                              isMoreFiltersOpen
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() =>
                              setIsMoreFiltersOpen((current) => !current)
                            }
                            type="button"
                          >
                            More Filters
                            {filterState.attention !== "none"
                              ? ` · ${
                                  deliveryAttentionFilters.find(
                                    (item) => item.id === filterState.attention,
                                  )?.label ?? ""
                                }`
                              : ""}
                          </button>
                          {isMoreFiltersOpen ? (
                            <div
                              aria-label="More delivery filters"
                              className="absolute left-0 z-30 mt-1 min-w-[14rem] rounded-md border border-slate-200 bg-white p-1 shadow-ui-subtle"
                              role="listbox"
                            >
                              {deliveryAttentionFilters.map((filter) => (
                                <button
                                  aria-selected={
                                    filterState.attention === filter.id
                                  }
                                  className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                                    filterState.attention === filter.id
                                      ? "bg-brand/10 text-brand"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                  key={filter.id}
                                  onClick={() => {
                                    setFilterState((current) => ({
                                      ...current,
                                      attention: filter.id,
                                    }));
                                    setIsMoreFiltersOpen(false);
                                  }}
                                  role="option"
                                  type="button"
                                >
                                  <span>{filter.label}</span>
                                  {filter.id !== "none" &&
                                  filterCounts[filter.id] !== undefined ? (
                                    <span className="tabular-nums text-slate-500">
                                      {filterCounts[filter.id]}
                                    </span>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    }
                    label="Delivery toolbar"
                    search={
                      <input
                        aria-label="Search delivery queue"
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search tasks"
                        type="search"
                        value={searchTerm}
                      />
                    }
                  />

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-xs text-slate-600">
                    <p aria-label="Delivery attention summary">
                      <span className="font-semibold tabular-nums text-slate-900">
                        {attentionSummary.total}
                      </span>{" "}
                      tasks
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">
                        |
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {attentionSummary.active}
                      </span>{" "}
                      active
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">
                        |
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {attentionSummary.blocked}
                      </span>{" "}
                      blocked
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">
                        |
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {attentionSummary.overdue}
                      </span>{" "}
                      overdue
                    </p>
                    {activeFilterLabels.length > 0 ? (
                      <div
                        aria-label="Active delivery filters"
                        className="flex flex-wrap gap-1"
                      >
                        {activeFilterLabels.map((label) => (
                          <span
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700"
                            key={label}
                          >
                            {label}
                          </span>
                        ))}
                        <button
                          className="text-[11px] font-semibold text-brand hover:underline"
                          onClick={() =>
                            setFilterState(createDefaultDeliveryFilterState())
                          }
                          type="button"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </WorkspaceSection>

            {activeView === "list" || activeView === "board" ? (
              <ProjectWorkspaceTasks
                canEditTasks={capabilities.canManageProjectTasks}
                canReassignTasks={capabilities.canManageProjectTasks}
                currentUserId={currentUserId}
                executionView={activeView === "board" ? "board" : "list"}
                isSaving={isSaving}
                members={members}
                mode="execution"
                onLoadExecutionHistory={getTaskExecutionUpdates}
                onRecordExecutionUpdate={async (taskId, input) => {
                  await handleRecordExecutionUpdate(taskId, input);
                }}
                onUpdateTask={handleUpdateTask}
                tasks={visibleTasks}
              />
            ) : null}

            {activeView === "today" ? (
              <TodayWorkspace
                canEdit={capabilities.canManageProjectTasks}
                currentUserId={currentUserId}
                embedded
                isSaving={isSaving}
                members={members}
                onLoadHistory={getTaskExecutionUpdates}
                onRecordExecutionUpdate={handleRecordExecutionUpdate}
                onSearchTermChange={setTodaySearchTerm}
                project={project}
                projects={[project]}
                searchTerm={todaySearchTerm}
                selectedProjectId={project.id}
              />
            ) : null}

            {activeView === "timeline" ? (
              <DeliveryTimeline tasks={standardTasks} />
            ) : null}

            {activeView === "history" ? (
              <DeliveryHistory
                members={members}
                onLoadHistory={getTaskExecutionUpdates}
                tasks={standardTasks}
              />
            ) : null}
          </>
        ) : null}
      </WorkspaceContent>
    </ProjectLayout>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
}) {
  return (
    <label className="grid min-w-[7.25rem] gap-0.5 text-[11px] font-semibold text-slate-600">
      {label}
      <select
        aria-label={label}
        className="h-8 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function hydrateDeliveryFilterState(
  prefs: DeliveryWorkspacePrefs,
): DeliveryFilterState {
  const hasComposableFields =
    prefs.status !== undefined ||
    prefs.owner !== undefined ||
    prefs.priority !== undefined ||
    prefs.attention !== undefined;

  if (hasComposableFields) {
    const defaults = createDefaultDeliveryFilterState();
    return {
      attention: prefs.attention ?? defaults.attention,
      owner: prefs.owner ?? defaults.owner,
      priority: prefs.priority ?? defaults.priority,
      status: prefs.status ?? defaults.status,
    };
  }

  if (prefs.activeFilter && isDeliveryFilter(prefs.activeFilter)) {
    return deliveryFilterToState(prefs.activeFilter);
  }

  return createDefaultDeliveryFilterState();
}
