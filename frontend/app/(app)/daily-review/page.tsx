"use client";

import React, { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/foundation";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import { WorkspaceContent } from "@/components/foundation/layout/WorkspaceContent";
import { WorkspaceSection } from "@/components/foundation/layout/WorkspaceSection";
import { getAuthMe, hasPermission, storeAuthMe } from "@/features/auth";
import {
  getProject,
  getProjects,
  getProjectMembers,
  recordProjectTaskExecutionUpdate,
  updateProjectTask,
  type ApiProject,
  type ApiProjectDetails,
  type ApiTask,
} from "@/features/projects";
import { decorateProjectPlan } from "@/features/projects/planning";
import { getTaskExecutionUpdates } from "@/features/tasks";
import { useProjectMembers } from "@/hooks/use-project-members";

type ReviewFilter =
  | "all"
  | "overdue"
  | "today"
  | "week"
  | "updated"
  | "blocked"
  | "mine"
  | "waiting"
  | "escalations";

type CompletionSummary = {
  blockedTasks: number;
  escalations: number;
  tasksReviewed: number;
  tasksUpdated: number;
};

const leadershipRoles = new Set([
  "PROJECT_MANAGER",
  "PROGRAM_MANAGER",
  "PORTFOLIO_MANAGER",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
]);

const filterLabels: Array<{ id: ReviewFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "blocked", label: "Blocked" },
  { id: "mine", label: "Mine" },
  { id: "waiting", label: "Waiting For Me" },
  { id: "escalations", label: "Escalations" },
];

export default function DailyReviewPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [reviewedTaskIds, setReviewedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [completion, setCompletion] = useState<CompletionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProjects(), getAuthMe()])
      .then(([projectData, authMe]) => {
        if (!mounted) return;
        storeAuthMe(authMe);
        setProjects(projectData.filter((candidate) => candidate.status !== "archived"));
        setPermissionKeys(authMe.permissions.map((permission) => permission.key));
        setRoles(authMe.roles.map((role) => role.name));
        setCurrentUserId(authMe.user.id);
        const firstProject = projectData.find((candidate) => candidate.status !== "archived");
        if (firstProject) setSelectedProjectId(firstProject.id);
      })
      .catch((requestError) => {
        if (mounted) setError(getErrorMessage(requestError, "Unable to load Daily Review"));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setReviewedTaskIds(new Set());
      return;
    }
    let mounted = true;
    setIsProjectLoading(true);
    setCompletion(null);
    setFilter("all");
    setTaskSearch("");
    setReviewedTaskIds(new Set());
    Promise.all([getProject(selectedProjectId), getProjectMembers(selectedProjectId).catch(() => [])])
      .then(([projectData, members]) => {
        if (!mounted) return;
        setProject({ ...projectData, members });
      })
      .catch((requestError) => {
        if (mounted) setError(getErrorMessage(requestError, "Unable to load selected project"));
      })
      .finally(() => {
        if (mounted) setIsProjectLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedProjectId]);

  const { error: memberError, isLoading: areMembersLoading, members } =
    useProjectMembers(selectedProjectId, project?.members ?? []);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = projectSearch.trim().toLowerCase();
    if (!normalizedSearch) return projects;
    return projects.filter((candidate) => candidate.name.toLowerCase().includes(normalizedSearch));
  }, [projectSearch, projects]);

  const allTasks = useMemo(
    () => (project?.tasks ?? []).filter((task) => task.taskKind !== "summary"),
    [project?.tasks],
  );

  const visibleTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          matchesFilter(task, filter, currentUserId) &&
          matchesTaskSearch(task, taskSearch),
      ),
    [allTasks, currentUserId, filter, taskSearch],
  );

  const canAccess =
    roles.some((role) => leadershipRoles.has(role)) &&
    hasPermission(permissionKeys, "project.read") &&
    hasPermission(permissionKeys, "task.update");

  async function handleUpdateTask(taskId: string, input: Parameters<typeof updateProjectTask>[2]) {
    if (!project) return;
    setIsSaving(true);
    setError(null);
    try {
      const updatedTask = await updateProjectTask(project.id, taskId, input);
      setProject((current) =>
        current
          ? decorateProjectPlan({
              ...current,
              tasks: (current.tasks ?? []).map((task) =>
                task.id === taskId ? { ...task, ...updatedTask } : task,
              ),
            })
          : current,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update task"));
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExecutionUpdate(
    taskId: string,
    input: Parameters<typeof recordProjectTaskExecutionUpdate>[2],
  ) {
    if (!project) return;
    setIsSaving(true);
    setError(null);
    try {
      const updatedTask = await recordProjectTaskExecutionUpdate(project.id, taskId, input);
      setProject((current) =>
        current
          ? decorateProjectPlan({
              ...current,
              tasks: (current.tasks ?? []).map((task) =>
                task.id === taskId ? { ...task, ...updatedTask } : task,
              ),
            })
          : current,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save execution update"));
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading Daily Review" rows={5} />;

  if (!canAccess) {
    return <ErrorState title="Daily Review access required" message="Daily Review is available to project leadership with task update access." />;
  }

  const projectTaskCount = allTasks.filter((task) => task.status !== "done").length;

  return (
    <WorkspaceContent spacing="compact">
      <WorkspaceSection className="space-y-3" surface="plain" padding="none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
            Project
            <input
              aria-label="Search projects"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setProjectSearch(event.target.value)}
              placeholder="Search projects"
              type="search"
              value={projectSearch}
            />
          </label>
          <select
            aria-label="Select project"
            className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 lg:w-[min(44vw,32rem)]"
            onChange={(event) => setSelectedProjectId(event.target.value)}
            value={selectedProjectId}
          >
            {filteredProjects.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
            ))}
          </select>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm lg:min-w-52">
            <div><dt className="text-xs text-slate-500">Sprint</dt><dd className="font-semibold text-slate-800">Not assigned</dd></div>
            <div><dt className="text-xs text-slate-500">Active tasks</dt><dd className="font-semibold text-slate-800">{projectTaskCount}</dd></div>
          </dl>
        </div>
      </WorkspaceSection>

      {error ? <ErrorState message={error} /> : null}
      {memberError ? <ErrorState message={memberError} /> : null}
      {isProjectLoading || areMembersLoading ? <LoadingState label="Loading execution queue" rows={4} /> : null}

      {!isProjectLoading && !areMembersLoading && project ? (
        <>
          <WorkspaceSection className="sticky top-0 z-20 space-y-3 border-y border-slate-200 bg-surface/95 py-3 backdrop-blur" surface="plain" padding="none">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search execution queue
                <input
                  aria-label="Search execution queue"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Search task names"
                  type="search"
                  value={taskSearch}
                />
              </label>
              <div className="flex shrink-0 items-center gap-2 text-sm text-slate-600" aria-label="Review progress">
                <span className="font-semibold text-slate-900">Reviewed</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-800">
                  {reviewedTaskIds.size} / {allTasks.length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {widgetDefinitions(allTasks, currentUserId).map((widget) => (
                <button
                  aria-pressed={filter === widget.filter}
                  className={`min-h-16 rounded-md border px-3 py-2 text-left transition ${filter === widget.filter ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand/40"}`}
                  key={widget.filter}
                  onClick={() => setFilter(widget.filter)}
                  type="button"
                >
                  <span className="block text-xs font-medium opacity-80">{widget.label}</span>
                  <span className="mt-1 block text-xl font-semibold">{widget.count}</span>
                </button>
              ))}
            </div>
            <div aria-label="Daily Review filters" className="flex flex-wrap gap-2" role="toolbar">
              {filterLabels.map((item) => (
                <button
                  aria-pressed={filter === item.id}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === item.id ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand/40"}`}
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </WorkspaceSection>

          {completion ? (
            <WorkspaceSection className="space-y-4" surface="card">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Standup complete</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Daily Review Complete</h1><p className="mt-1 text-sm text-slate-600">The execution queue has been reviewed for {project.name}.</p></div>
              <dl className="grid gap-3 sm:grid-cols-4">
                <CompletionMetric label="Tasks reviewed" value={completion.tasksReviewed} />
                <CompletionMetric label="Tasks updated" value={completion.tasksUpdated} />
                <CompletionMetric label="Blocked tasks" value={completion.blockedTasks} />
                <CompletionMetric label="Escalations" value={completion.escalations} />
              </dl>
              <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark" onClick={() => setCompletion(null)} type="button">Finish</button>
            </WorkspaceSection>
          ) : visibleTasks.length > 0 ? (
            <ProjectWorkspaceTasks
              canEditTasks
              canReassignTasks
              currentUserId={currentUserId}
              executionTaskOrder={compareDeliveryPriority}
              hideExecutionFilters
              hideHeaderDescription
              isSaving={isSaving}
              members={members}
              mode="execution"
              onExecutionComplete={setCompletion}
              onExecutionTaskReviewed={(taskId) =>
                setReviewedTaskIds((current) => {
                  const next = new Set(current);
                  next.add(taskId);
                  return next;
                })
              }
              onLoadExecutionHistory={getTaskExecutionUpdates}
              onRecordExecutionUpdate={handleExecutionUpdate}
              onUpdateTask={handleUpdateTask}
              tasks={visibleTasks}
            />
          ) : (
            <EmptyState title="No tasks in this review queue" description="Choose another filter or select a different project." />
          )}
        </>
      ) : null}
    </WorkspaceContent>
  );
}

function CompletionMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-semibold text-slate-950">{value}</dd></div>;
}

function widgetDefinitions(tasks: ApiTask[], currentUserId: string | null) {
  return [
    { filter: "overdue" as const, label: "Overdue", count: tasks.filter(isOverdue).length },
    { filter: "today" as const, label: "Due Today", count: tasks.filter((task) => getDueDate(task) === dateOnly(new Date())).length },
    { filter: "week" as const, label: "Due This Week", count: tasks.filter(isDueThisWeek).length },
    { filter: "blocked" as const, label: "Blocked", count: tasks.filter((task) => task.status === "blocked").length },
    { filter: "updated" as const, label: "Updated Today", count: tasks.filter(wasUpdatedToday).length },
    { filter: "waiting" as const, label: "Waiting For Me", count: tasks.filter((task) => task.latestExecutionUpdate?.nextActionOwnerId === currentUserId).length },
    { filter: "escalations" as const, label: "Escalations", count: tasks.filter((task) => task.priority === "critical" && task.status !== "done").length },
  ];
}

function matchesFilter(task: ApiTask, filter: ReviewFilter, currentUserId: string | null) {
  if (filter === "all") return task.status !== "done";
  if (filter === "overdue") return isOverdue(task);
  if (filter === "today") return getDueDate(task) === dateOnly(new Date());
  if (filter === "week") return isDueThisWeek(task);
  if (filter === "updated") return wasUpdatedToday(task);
  if (filter === "blocked") return task.status === "blocked";
  if (filter === "mine") return task.assigneeId === currentUserId;
  if (filter === "waiting") return task.latestExecutionUpdate?.nextActionOwnerId === currentUserId;
  return task.priority === "critical" && task.status !== "done";
}

function matchesTaskSearch(task: ApiTask, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  return !normalizedSearch || task.title.toLowerCase().includes(normalizedSearch);
}

function compareDeliveryPriority(left: ApiTask, right: ApiTask) {
  const rank = (task: ApiTask) => {
    if (isOverdue(task)) return 1;
    if (getDueDate(task) === dateOnly(new Date())) return 2;
    if (isDueThisWeek(task)) return 3;
    if (task.status === "blocked") return 4;
    if (isWaitingForCustomer(task)) return 5;
    return 6;
  };
  return rank(left) - rank(right) || priorityRank(right.priority) - priorityRank(left.priority) || left.title.localeCompare(right.title);
}

function isWaitingForCustomer(task: ApiTask) {
  const update = task.latestExecutionUpdate;
  return Boolean(
    update &&
      `${update.nextStep ?? ""} ${update.updateNotes ?? ""}`
        .toLowerCase()
        .includes("customer"),
  );
}

function priorityRank(priority: string) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[priority as "critical" | "high" | "medium" | "low"] ?? 0;
}

function getDueDate(task: ApiTask) { return task.dueDate ?? task.plannedEndDate ?? null; }
function dateOnly(value?: string | Date | null) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }
function isOverdue(task: ApiTask) { const dueDate = getDueDate(task); return Boolean(dueDate && task.status !== "done" && dateOnly(dueDate) < dateOnly(new Date())); }
function isDueThisWeek(task: ApiTask) { const dueDate = getDueDate(task); if (!dueDate || task.status === "done") return false; const today = new Date(); const day = today.getDay(); const start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day - 1)); const end = new Date(start); end.setDate(start.getDate() + 6); const due = dateOnly(dueDate); return due >= dateOnly(start) && due <= dateOnly(end); }
function wasUpdatedToday(task: ApiTask) { return dateOnly(task.latestExecutionUpdate?.updatedOn) === dateOnly(new Date()); }
function getErrorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
