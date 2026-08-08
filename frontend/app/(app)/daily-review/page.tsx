"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ActionToolbar,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/foundation";
import {
  executeAiEnterpriseCapability,
  type ApiStructuredAIResponse,
} from "@/lib/api/client";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import { WorkspaceContent } from "@/components/foundation/layout/WorkspaceContent";
import { WorkspaceSection } from "@/components/foundation/layout/WorkspaceSection";
import { getAuthMe, resolveProjectUiCapabilities, storeAuthMe } from "@/features/auth";
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
import { includeTaskAncestors } from "@/lib/tasks/include-task-ancestors";
import {
  readPersistedWorkspaceState,
  writePersistedWorkspaceState,
} from "@/lib/workspace/persisted-workspace-state";

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

type DailyReviewPrefs = {
  filter: ReviewFilter;
  projectSearch: string;
  selectedProjectId: string;
  taskSearch: string;
};

const DAILY_REVIEW_PREFS_KEY = "daily-review";

const filterLabels: Array<{ id: ReviewFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "updated", label: "Updated" },
  { id: "blocked", label: "Blocked" },
  { id: "mine", label: "Mine" },
  { id: "waiting", label: "Waiting For Me" },
  { id: "escalations", label: "Escalations" },
];

const reviewFilterIds = new Set(filterLabels.map((item) => item.id));

function isReviewFilter(value: string): value is ReviewFilter {
  return reviewFilterIds.has(value as ReviewFilter);
}

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
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [reviewedTaskIds, setReviewedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [completion, setCompletion] = useState<CompletionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiReview, setAiReview] = useState<ApiStructuredAIResponse | null>(null);
  const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState<string | null>(null);

  useEffect(() => {
    const prefs = readPersistedWorkspaceState<DailyReviewPrefs>(
      DAILY_REVIEW_PREFS_KEY,
      {
        filter: "all",
        projectSearch: "",
        selectedProjectId: "",
        taskSearch: "",
      },
    );
    if (isReviewFilter(prefs.filter)) {
      setFilter(prefs.filter);
    }
    setProjectSearch(prefs.projectSearch);
    setTaskSearch(prefs.taskSearch);
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    writePersistedWorkspaceState(DAILY_REVIEW_PREFS_KEY, {
      filter,
      projectSearch,
      selectedProjectId,
      taskSearch,
    });
  }, [filter, prefsHydrated, projectSearch, selectedProjectId, taskSearch]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProjects(), getAuthMe()])
      .then(([projectData, authMe]) => {
        if (!mounted) return;
        storeAuthMe(authMe);
        const activeProjects = projectData.filter(
          (candidate) => candidate.status !== "archived",
        );
        setProjects(activeProjects);
        setPermissionKeys(authMe.permissions.map((permission) => permission.key));
        setRoles(authMe.roles.map((role) => role.name));
        setCurrentUserId(authMe.user.id);
        const prefs = readPersistedWorkspaceState<DailyReviewPrefs>(
          DAILY_REVIEW_PREFS_KEY,
          {
            filter: "all",
            projectSearch: "",
            selectedProjectId: "",
            taskSearch: "",
          },
        );
        const persistedProject = activeProjects.find(
          (candidate) => candidate.id === prefs.selectedProjectId,
        );
        const firstProject = activeProjects[0];
        setSelectedProjectId(persistedProject?.id ?? firstProject?.id ?? "");
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
  const gridTasks = useMemo(
    () => includeTaskAncestors(project?.tasks ?? [], visibleTasks),
    [project?.tasks, visibleTasks],
  );

  const { canAccessDailyReview } = resolveProjectUiCapabilities({
    currentUserId,
    members,
    permissionKeys,
    project,
    roleNames: roles,
  });

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

  async function handleAiDailyReview() {
    if (!project) return;
    const requestId = `daily-review-ai-${Date.now()}`;
    setIsAiReviewLoading(true);
    setAiReviewError(null);
    try {
      const result = await executeAiEnterpriseCapability("daily-review-assistant", {
        input: `Prepare the daily review for ${project.name}. Analyze execution status, blocked work, deadlines, ownership, RAID indicators, and project health.`,
        projectIds: [project.id],
        requestId,
        workspaceId: "daily-review",
        contextSourceData: buildDailyReviewContext(project, members, currentUserId),
      });
      setAiReview(result.structuredResponse ?? null);
    } catch (requestError) {
      setAiReviewError(getErrorMessage(requestError, "Unable to prepare AI Daily Review"));
    } finally {
      setIsAiReviewLoading(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading Daily Review" rows={5} />;

  if (!canAccessDailyReview) {
    return <ErrorState title="Daily Review access required" message="Daily Review is available to project leadership with task update access." />;
  }

  const projectTaskCount = allTasks.filter((task) => task.status !== "done").length;

  return (
    <WorkspaceContent spacing="compact">
      <h1 className="text-xl font-semibold tracking-tight text-slate-950">
        Daily Review
      </h1>

      <WorkspaceSection className="space-y-2" surface="plain" padding="none">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600 sm:max-w-md">
            Project
            <select
              aria-label="Select project"
              className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSelectedProjectId(event.target.value)}
              value={selectedProjectId}
            >
              {projects.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-8 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!project || isProjectLoading || isAiReviewLoading}
            onClick={handleAiDailyReview}
            type="button"
          >
            {isAiReviewLoading ? "Preparing AI Review..." : "AI Daily Review"}
          </button>
          <p className="text-xs text-slate-600">
            Active tasks{" "}
            <span className="font-semibold text-slate-900">
              {projectTaskCount}
            </span>
          </p>
        </div>
      </WorkspaceSection>

      {error ? <ErrorState message={error} /> : null}
      {memberError ? <ErrorState message={memberError} /> : null}
      {isProjectLoading || areMembersLoading ? <LoadingState label="Loading execution queue" rows={4} /> : null}

      {!isProjectLoading && !areMembersLoading && project ? (
        <>
          {aiReviewError ? <ErrorState message={aiReviewError} /> : null}
          {aiReview ? <DailyReviewAiPanel response={aiReview} /> : null}
          <WorkspaceSection
            className="sticky top-0 z-20"
            padding="none"
            surface="plain"
          >
            <ActionToolbar
              className="gap-2 p-2"
              filters={
                <div
                  aria-label="Daily Review filters"
                  className="flex flex-wrap gap-1"
                  role="toolbar"
                >
                  {filterLabels.map((item) => {
                    const count =
                      item.id === "all"
                        ? allTasks.filter((task) => task.status !== "done").length
                        : allTasks.filter((task) =>
                            matchesFilter(task, item.id, currentUserId),
                          ).length;
                    return (
                      <button
                        aria-pressed={filter === item.id}
                        className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
                          filter === item.id
                            ? "border-brand bg-brand text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-brand/40"
                        }`}
                        key={item.id}
                        onClick={() => setFilter(item.id)}
                        type="button"
                      >
                        {item.label} {count}
                      </button>
                    );
                  })}
                </div>
              }
              label="Daily Review toolbar"
              search={
                <input
                  aria-label="Search execution queue"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setTaskSearch(event.target.value)}
                  placeholder="Search tasks"
                  type="search"
                  value={taskSearch}
                />
              }
              secondaryActions={
                <div
                  aria-label="Review progress"
                  className="flex shrink-0 items-center gap-1.5 text-xs text-slate-600"
                >
                  <span className="font-semibold text-slate-900">Reviewed</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-800">
                    {reviewedTaskIds.size} / {allTasks.length}
                  </span>
                </div>
              }
              sticky
            />
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
              tasks={gridTasks}
            />
          ) : (
            <EmptyState title="No tasks in this review queue" description="Choose another filter or select a different project." />
          )}
        </>
      ) : null}
    </WorkspaceContent>
  );
}

function DailyReviewAiPanel({ response }: { response: ApiStructuredAIResponse }) {
  return (
    <WorkspaceSection className="space-y-4" surface="card">
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">AI Daily Review</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{response.summary?.title ?? "Daily execution review"}</h2>
          <p className="mt-1 text-sm text-slate-600">{response.summary?.overview ?? "No structured summary was returned."}</p>
        </div>
        {response.confidence ? <span className="text-xs font-semibold uppercase text-slate-500">Confidence: {response.confidence}</span> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReviewList title="Key Findings" items={response.findings} fields={["title", "description"]} />
        <ReviewList title="Risks" items={response.risks} fields={["title", "description"]} />
        <ReviewList title="Recommendations" items={response.recommendations} fields={["title", "description"]} />
        <ReviewList title="Action Items" items={response.actionItems} fields={["owner", "description"]} />
      </div>
      {response.warnings?.length ? <ReviewStrings title="Warnings" items={response.warnings} /> : null}
      {response.opportunities?.length ? <ReviewStrings title="Opportunities" items={response.opportunities} /> : null}
    </WorkspaceSection>
  );
}

function ReviewList({ title, items, fields }: { title: string; items?: Array<Record<string, unknown>>; fields: string[] }) {
  if (!items?.length) return null;
  return <section><h3 className="text-sm font-semibold text-slate-900">{title}</h3><ul className="mt-2 space-y-2">{items.map((item, index) => <li className="rounded-md border border-slate-200 bg-white p-3 text-sm" key={`${title}-${index}`}><strong>{readReviewValue(item, fields[0])}</strong>{readReviewValue(item, fields[1]) ? <p className="mt-1 text-slate-600">{readReviewValue(item, fields[1])}</p> : null}</li>)}</ul></section>;
}

function ReviewStrings({ title, items }: { title: string; items: string[] }) {
  return <section><h3 className="text-sm font-semibold text-slate-900">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

function readReviewValue(item: Record<string, unknown>, key: string) {
  return typeof item[key] === "string" ? item[key] as string : "";
}

function buildDailyReviewContext(project: ApiProjectDetails, members: ApiProjectDetails["members"], currentUserId: string | null) {
  const tasks = project.tasks ?? [];
  return {
    execution: tasks.flatMap((task) => task.latestExecutionUpdate ? [task.latestExecutionUpdate] : []),
    project: [{ description: project.description, id: project.id, name: project.name, status: project.status }],
    raid: [...(project.risks ?? []), ...(project.issues ?? [])],
    task: tasks.map((task) => ({ assigneeId: task.assigneeId, dueDate: task.dueDate ?? task.plannedEndDate, id: task.id, percentComplete: task.percentComplete, priority: task.priority, projectId: project.id, status: task.status, title: task.title })),
    team: (members ?? []).map((member) => ({ id: member.id, projectId: project.id, role: member.role, userId: member.userId })),
    user: currentUserId ? [{ id: currentUserId }] : [],
    workspace: [{ currentFilters: { projectId: project.id }, currentPage: "daily-review", id: "daily-review", name: "Daily Review" }],
  };
}

function CompletionMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-semibold text-slate-950">{value}</dd></div>;
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
