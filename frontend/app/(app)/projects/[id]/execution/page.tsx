"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  SummaryMetricCard,
  WorkspaceContent,
  WorkspaceHeader,
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
  | "updated_today";

const leadershipRoles = new Set([
  "PROJECT_MANAGER",
  "PROGRAM_MANAGER",
  "PORTFOLIO_MANAGER",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
]);

const quickFilters: Array<{ id: ExecutionFilter; label: string }> = [
  { id: "active", label: "All Active" },
  { id: "mine", label: "My Tasks" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "due_today", label: "Due Today" },
  { id: "due_week", label: "Due This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "updated_today", label: "Updated Today" },
];

export default function ProjectExecutionPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ExecutionFilter>("active");
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
    () => filterExecutionTasks(standardTasks, activeFilter, currentUserId),
    [activeFilter, currentUserId, standardTasks],
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
      renderHeader={(content) => <WorkspaceHeader {...content} />}
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
            <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {kpis.map((kpi) => (
                <SummaryMetricCard
                  key={kpi.title}
                  title={kpi.title}
                  value={kpi.value}
                  variant={kpi.variant}
                />
              ))}
            </section>

            <WorkspaceSection
              surface="card"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-950">
                  Quick Filters
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Focus the execution grid for standup review.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <button
                    aria-pressed={activeFilter === filter.id}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                      activeFilter === filter.id
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              surface="card"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-950">
                  Daily Standup
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Daily standup signals from current task status and latest execution updates.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-5">
                <StandupSignal
                  count={standup.updatedToday.length}
                  label="Changed today"
                  tone="success"
                />
                <StandupSignal
                  count={standup.blocked.length}
                  label="Blocked"
                  tone="critical"
                />
                <StandupSignal
                  count={standup.needsAttention.length}
                  label="Needs attention"
                  tone="warning"
                />
                <StandupSignal
                  count={standup.overdue.length}
                  label="Overdue"
                  tone="critical"
                />
                <StandupSignal
                  count={standup.discussion.length}
                  label="Discuss"
                  tone="neutral"
                />
              </div>
              {standup.discussion.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 text-sm">
                  {standup.discussion.slice(0, 5).map((task) => (
                    <li
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                      key={task.id}
                    >
                      <span className="font-semibold text-slate-900">
                        {task.title}
                      </span>
                      <span className="text-slate-600">
                        {getDiscussionReason(task)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  description="No blocked, overdue, or high-priority active tasks need discussion."
                  title="No standup exceptions"
                />
              )}
            </WorkspaceSection>

            <ProjectWorkspaceTasks
              canEditTasks={executionCapabilities.canManageProjectTasks}
              canReassignTasks={executionCapabilities.canManageProjectTasks}
              currentUserId={currentUserId}
              isSaving={isSaving}
              members={members}
              mode="execution"
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

function StandupSignal({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: StatusBadgeTone;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <StatusBadge tone={tone}>{count}</StatusBadge>
      </div>
    </div>
  );
}

function getExecutionKpis(tasks: ApiTask[]) {
  const today = getDateOnly(new Date());

  return [
    {
      title: "Active Tasks",
      value: tasks.filter((task) => task.status !== "done").length,
      variant: "primary" as const,
    },
    {
      title: "In Progress",
      value: tasks.filter((task) => task.status === "in_progress").length,
      variant: "neutral" as const,
    },
    {
      title: "Blocked",
      value: tasks.filter((task) => task.status === "blocked").length,
      variant: "critical" as const,
    },
    {
      title: "Due This Week",
      value: tasks.filter((task) => isDueThisWeek(task)).length,
      variant: "warning" as const,
    },
    {
      title: "Overdue",
      value: tasks.filter((task) => isOverdue(task)).length,
      variant: "critical" as const,
    },
    {
      title: "Completed Today",
      value: tasks.filter(
        (task) =>
          task.status === "done" &&
          getDateOnly(task.latestExecutionUpdate?.updatedOn) === today,
      ).length,
      variant: "success" as const,
    },
  ];
}

function getStandupSummary(tasks: ApiTask[]) {
  const blocked = tasks.filter((task) => task.status === "blocked");
  const overdue = tasks.filter((task) => isOverdue(task));
  const updatedToday = tasks.filter((task) => wasUpdatedToday(task));
  const needsAttention = tasks.filter(
    (task) =>
      task.status === "blocked" ||
      isOverdue(task) ||
      (task.priority === "critical" && task.status !== "done"),
  );
  const discussion = uniqueTasks([...blocked, ...overdue, ...needsAttention]);

  return {
    blocked,
    discussion,
    needsAttention,
    overdue,
    updatedToday,
  };
}

function filterExecutionTasks(
  tasks: ApiTask[],
  filter: ExecutionFilter,
  currentUserId: string | null,
) {
  return tasks.filter((task) => {
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
    return wasUpdatedToday(task);
  });
}

function uniqueTasks(tasks: ApiTask[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) {
      return false;
    }
    seen.add(task.id);
    return true;
  });
}

function getDiscussionReason(task: ApiTask) {
  if (task.status === "blocked") {
    return "Blocked";
  }
  if (isOverdue(task)) {
    return "Overdue";
  }
  if (task.priority === "critical") {
    return "Critical priority";
  }
  return "Needs attention";
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

function getTaskDueDate(task: ApiTask) {
  return getDateOnly(task.dueDate ?? task.plannedEndDate);
}

function getDateOnly(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}
