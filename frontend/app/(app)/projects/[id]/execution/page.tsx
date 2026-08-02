"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  StatusBadge,
  WorkspaceContent,
  WorkspaceLayout,
  WorkspaceSection,
  type StatusBadgeTone,
} from "@/components/foundation";
import { ProjectLayout } from "@/components/project";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import {
  getProject,
  recordProjectTaskExecutionUpdate,
  updateProjectTask,
  type ApiProjectDetails,
} from "@/features/projects";
import {
  getAuthMe,
  hasAnyPermission,
  hasPermission,
  resolveProjectUiCapabilities,
  storeAuthMe,
} from "@/features/auth";
import { getTaskExecutionUpdates } from "@/features/tasks";
import { decorateProjectPlan } from "@/features/projects/planning";
import { useProjectMembers } from "@/hooks/use-project-members";
import type { ApiTask } from "@/lib/api/client";

type ExecutionFilter =
  | "active"
  | "mine"
  | "in_progress"
  | "blocked"
  | "due_today"
  | "due_week"
  | "overdue"
  | "updated_today"
  | "awaiting_update"
  | "waiting_customer"
  | "completed";

type ExecutionView = "board" | "list";

const leadershipRoles = new Set([
  "PROJECT_MANAGER",
  "PROGRAM_MANAGER",
  "PORTFOLIO_MANAGER",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
]);

const quickFilters: Array<{ id: ExecutionFilter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "mine", label: "Mine" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "due_today", label: "Due Today" },
  { id: "due_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "updated_today", label: "Updated Today" },
];

type CompactExecutionHeaderProps = {
  eyebrow: string;
  metadata: Array<{ id: string; label: string; value: React.ReactNode }>;
  navigation: React.ReactNode;
  title: React.ReactNode;
};

export default function ProjectExecutionPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ExecutionFilter>("active");
  const [executionView, setExecutionView] = useState<ExecutionView>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
  } = useProjectMembers(projectId, project?.members ?? []);

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
          : "Unable to load execution workspace",
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
    input: {
      assigneeId?: string | null;
      nextActionOwnerId?: string | null;
      nextStep?: string | null;
      percentComplete: number;
      priority: string;
      status: ApiTask["status"];
      targetCompletionDate?: string | null;
      updateNotes?: string | null;
    },
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
      const nextTasks = (currentProject.tasks ?? []).map((task) =>
        task.id === updatedTask.id
          ? {
              ...task,
              ...updatedTask,
              assignee:
                members.find((member) => member.userId === updatedTask.assigneeId)
                  ?.user ?? updatedTask.assignee,
            }
          : task,
      );
      return decorateProjectPlan({ ...currentProject, tasks: nextTasks });
    });
  }

  const hasLeadershipRole =
    roleNames.length === 0
      ? false
      : roleNames.some((roleName) => leadershipRoles.has(roleName));
  const hasLeadershipPermission = hasAnyPermission(permissionKeys, [
    "portfolio.view",
    "project.update",
    "user.manage",
  ]);
  const canUpdateExecution = hasPermission(permissionKeys, "task.update");
  const canAccessExecution =
    hasLeadershipRole && hasLeadershipPermission && canUpdateExecution;
  const executionCapabilities = resolveProjectUiCapabilities({
    currentUserId,
    members,
    permissionKeys,
    project,
    roleNames,
  });
  const allTasks = useMemo(() => project?.tasks ?? [], [project]);
  const standardTasks = useMemo(
    () => allTasks.filter((task) => task.taskKind !== "summary"),
    [allTasks],
  );
  const visibleTasks = useMemo(
    () =>
      filterExecutionTasks(
        standardTasks,
        activeFilter,
        currentUserId,
        searchTerm,
      ),
    [activeFilter, currentUserId, searchTerm, standardTasks],
  );
  const kpis = useMemo(() => getExecutionKpis(standardTasks), [standardTasks]);
  const standup = useMemo(
    () => getStandupSummary(standardTasks),
    [standardTasks],
  );
  const workspaceProject = project ?? {
    id: projectId,
    name: "Execution Workspace",
    status: "active",
  };

  return (
    <ProjectLayout
      activeTab="execution"
      layout={WorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => <CompactExecutionHeader {...content} />}
    >
      <WorkspaceContent spacing="compact">
        {isLoading || areMembersLoading ? (
          <LoadingState
            className="rounded-ui border border-ui-border bg-ui-surface p-5 shadow-ui-subtle"
            label="Loading execution workspace"
            rows={6}
          />
        ) : null}

        {error ? <ErrorState message={error} /> : null}
        {memberError ? <ErrorState message={memberError} /> : null}

        {!isLoading && !areMembersLoading && !canAccessExecution ? (
          <ErrorState
            message="Execution workspace is available to project leadership roles with task update access."
            title="Execution workspace access required"
          />
        ) : null}

        {!isLoading && !areMembersLoading && canAccessExecution ? (
          <>
            <WorkspaceSection
              className="sticky top-0 z-20"
              padding="compact"
              surface="card"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div
                  aria-label="Execution view"
                  className="inline-flex w-fit shrink-0 rounded-md border border-slate-200 bg-white p-1"
                  role="group"
                >
                  {(["list", "board"] as ExecutionView[]).map((view) => (
                    <button
                      aria-pressed={executionView === view}
                      className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                        executionView === view
                          ? "bg-brand text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                      key={view}
                      onClick={() => setExecutionView(view)}
                      type="button"
                    >
                      {view === "list" ? "List" : "Board"}
                    </button>
                  ))}
                </div>
                <label className="min-w-[220px] flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Search execution queue</span>
                  <input
                    aria-label="Search execution queue"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search tasks, owners, next steps"
                    type="search"
                    value={searchTerm}
                  />
                </label>
                <div
                  aria-label="Quick filters"
                  className="flex flex-wrap gap-2"
                  role="toolbar"
                >
                  {quickFilters.map((filter) => (
                    <FilterButton
                      active={activeFilter === filter.id}
                      key={filter.id}
                      label={filter.label}
                      onClick={() => setActiveFilter(filter.id)}
                    />
                  ))}
                </div>
              </div>
            </WorkspaceSection>

            <section
              aria-label="Execution KPI summary"
              className="flex flex-wrap gap-2"
            >
              {kpis.map((kpi) => (
                <KpiChip
                  active={activeFilter === kpi.filter}
                  count={kpi.value}
                  key={kpi.title}
                  label={kpi.title}
                  onClick={() => setActiveFilter(kpi.filter)}
                  tone={kpi.tone}
                />
              ))}
            </section>

            <WorkspaceSection
              padding="compact"
              surface="card"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <h2 className="shrink-0 text-sm font-semibold text-slate-950">
                  Today&apos;s Focus
                </h2>
                <div className="flex flex-wrap gap-2">
                  <StandupSignal
                    active={activeFilter === "overdue"}
                    count={standup.overdue.length}
                    label="Overdue"
                    onClick={() => setActiveFilter("overdue")}
                    tone="critical"
                  />
                  <StandupSignal
                    active={activeFilter === "due_today"}
                    count={standup.dueToday.length}
                    label="Due Today"
                    onClick={() => setActiveFilter("due_today")}
                    tone="warning"
                  />
                  <StandupSignal
                    active={activeFilter === "awaiting_update"}
                    count={standup.awaitingUpdate.length}
                    label="Awaiting Update"
                    onClick={() => setActiveFilter("awaiting_update")}
                    tone="warning"
                  />
                  <StandupSignal
                    active={activeFilter === "waiting_customer"}
                    count={standup.waitingCustomer.length}
                    label="Waiting Customer"
                    onClick={() => setActiveFilter("waiting_customer")}
                    tone="neutral"
                  />
                  <StandupSignal
                    active={activeFilter === "blocked"}
                    count={standup.blocked.length}
                    label="Blocked"
                    onClick={() => setActiveFilter("blocked")}
                    tone="success"
                  />
                </div>
              </div>
            </WorkspaceSection>

            <ProjectWorkspaceTasks
              canEditTasks={executionCapabilities.canManageProjectTasks}
              canReassignTasks={executionCapabilities.canManageProjectTasks}
              currentUserId={currentUserId}
              isSaving={isSaving}
              members={members}
              mode="execution"
              executionView={executionView}
              onLoadExecutionHistory={getTaskExecutionUpdates}
              onRecordExecutionUpdate={handleRecordExecutionUpdate}
              onUpdateTask={handleUpdateTask}
              tasks={visibleTasks}
            />
          </>
        ) : null}
      </WorkspaceContent>
    </ProjectLayout>
  );
}

function CompactExecutionHeader({
  eyebrow,
  metadata,
  navigation,
  title,
}: CompactExecutionHeaderProps) {
  const metadataById = new Map(metadata.map((item) => [item.id, item]));
  const health = metadataById.get("status");
  const projectManager = metadataById.get("project-manager");
  const start = metadataById.get("start");
  const finish = metadataById.get("finish");
  const completion = metadataById.get("completion");

  return (
    <header className="overflow-hidden rounded-ui border border-ui-border bg-ui-surface shadow-ui-subtle">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {eyebrow}
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
        </div>
        <dl className="grid min-w-0 flex-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4 xl:grid-cols-5">
          <CompactHeaderMetric label="Health" value={health?.value} />
          <CompactHeaderMetric
            label="Project Manager"
            value={projectManager?.value}
          />
          <CompactHeaderMetric
            label="Timeline"
            value={
              start?.value || finish?.value ? (
                <>
                  {start?.value ?? "Not set"} - {finish?.value ?? "Not set"}
                </>
              ) : null
            }
          />
          <CompactHeaderMetric label="Completion" value={completion?.value} />
        </dl>
      </div>
      <div className="px-4">{navigation}</div>
    </header>
  );
}

function CompactHeaderMetric({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-slate-900">
        {value ?? "Not set"}
      </dd>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function KpiChip({
  active,
  count,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
  tone: StatusBadgeTone;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="text-base">{count}</span>
      <span>{label}</span>
      {!active ? (
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${getToneDotClassName(tone)}`}
        />
      ) : null}
    </button>
  );
}

function StandupSignal({
  active,
  count,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
  tone: StatusBadgeTone;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <StatusBadge tone={tone}>{count}</StatusBadge>
      {label}
    </button>
  );
}

function getExecutionKpis(tasks: ApiTask[]) {
  return [
    {
      filter: "active" as const,
      title: "Active",
      value: tasks.filter((task) => task.status !== "done").length,
      tone: "neutral" as const,
    },
    {
      filter: "in_progress" as const,
      title: "In Progress",
      value: tasks.filter((task) => task.status === "in_progress").length,
      tone: "neutral" as const,
    },
    {
      filter: "overdue" as const,
      title: "Overdue",
      value: tasks.filter((task) => isOverdue(task)).length,
      tone: "critical" as const,
    },
    {
      filter: "blocked" as const,
      title: "Blocked",
      value: tasks.filter((task) => task.status === "blocked").length,
      tone: "critical" as const,
    },
    {
      filter: "completed" as const,
      title: "Completed",
      value: tasks.filter((task) => task.status === "done").length,
      tone: "success" as const,
    },
  ];
}

function getStandupSummary(tasks: ApiTask[]) {
  const awaitingUpdate = tasks.filter(
    (task) => task.status !== "done" && !wasUpdatedToday(task),
  );
  const blocked = tasks.filter((task) => task.status === "blocked");
  const dueToday = tasks.filter(
    (task) => getTaskDueDate(task) === getDateOnly(new Date()),
  );
  const overdue = tasks.filter((task) => isOverdue(task));
  const waitingCustomer = tasks.filter(isWaitingCustomerTask);

  return {
    awaitingUpdate,
    blocked,
    dueToday,
    overdue,
    waitingCustomer,
  };
}

function filterExecutionTasks(
  tasks: ApiTask[],
  filter: ExecutionFilter,
  currentUserId: string | null,
  searchTerm = "",
) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return tasks.filter((task) => {
    if (
      normalizedSearchTerm &&
      !matchesExecutionSearch(task, normalizedSearchTerm)
    ) {
      return false;
    }
    if (filter === "active") {
      return task.status !== "done";
    }
    if (filter === "mine") {
      return task.assigneeId === currentUserId;
    }
    if (filter === "in_progress" || filter === "blocked") {
      return task.status === filter;
    }
    if (filter === "due_today") {
      return getTaskDueDate(task) === getDateOnly(new Date());
    }
    if (filter === "due_week") {
      return isDueThisWeek(task);
    }
    if (filter === "overdue") {
      return isOverdue(task);
    }
    if (filter === "updated_today") {
      return wasUpdatedToday(task);
    }
    if (filter === "awaiting_update") {
      return task.status !== "done" && !wasUpdatedToday(task);
    }
    if (filter === "waiting_customer") {
      return isWaitingCustomerTask(task);
    }
    return task.status === "done";
  });
}

function isOverdue(task: ApiTask) {
  const dueDate = getTaskDueDate(task);
  const today = getDateOnly(new Date());
  return Boolean(dueDate && today && dueDate < today && task.status !== "done");
}

function isDueThisWeek(task: ApiTask) {
  const dueDate = getTaskDueDate(task);
  if (!dueDate || task.status === "done") {
    return false;
  }

  const today = getDateOnly(new Date());
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndDate = getDateOnly(weekEnd);

  return Boolean(today && weekEndDate && dueDate >= today && dueDate <= weekEndDate);
}

function wasUpdatedToday(task: ApiTask) {
  return getDateOnly(task.latestExecutionUpdate?.updatedOn) === getDateOnly(new Date());
}

function isWaitingCustomerTask(task: ApiTask) {
  return Boolean(
    task.latestExecutionUpdate?.updateNotes
      ?.toLowerCase()
      .includes("waiting for customer"),
  );
}

function getToneDotClassName(tone: StatusBadgeTone) {
  if (tone === "critical") {
    return "bg-red-500";
  }
  if (tone === "warning") {
    return "bg-amber-500";
  }
  if (tone === "success") {
    return "bg-emerald-500";
  }
  return "bg-slate-400";
}

function matchesExecutionSearch(task: ApiTask, searchTerm: string) {
  return [
    task.title,
    task.description,
    task.assignee?.displayName,
    task.assignee?.firstName,
    task.assignee?.lastName,
    task.assignee?.email,
    task.latestExecutionUpdate?.nextStep,
    task.latestExecutionUpdate?.updateNotes,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchTerm));
}

function getTaskDueDate(task: ApiTask) {
  return getDateOnly(task.dueDate ?? task.plannedEndDate);
}

function getDateOnly(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}
