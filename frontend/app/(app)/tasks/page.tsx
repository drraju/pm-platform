"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildExecutionUpdatePayload } from "@/components/projects/execution-update-payload";
import {
  compareTaskPriority,
  TaskTable,
} from "@/components/tasks/task-table";
import {
  getProjectMembers,
  getProjects,
  recordProjectTaskExecutionUpdate,
  type ApiProject,
  type ApiProjectMember,
} from "@/features/projects";
import {
  getAuthMe,
  getStoredPermissionKeys,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import { getMyTasks, getTasks, type ApiTask } from "@/features/tasks";
import {
  createProjectEntityProvider,
  createTaskEntityProvider,
  useEntityProvider,
} from "@/features/entity-search";
import { includeTaskAncestors } from "@/lib/tasks/include-task-ancestors";
import { includePersonalWorkContext } from "@/lib/tasks/personal-work-context";

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

type SortMode = "priority" | "due-asc" | "due-desc";
type TimingFilter = "all" | "today" | "overdue" | "upcoming";

const timingFilters: Array<{ label: string; value: TimingFilter }> = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Overdue", value: "overdue" },
];

export default function TasksPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [membersByProjectId, setMembersByProjectId] = useState<
    Record<string, ApiProjectMember[]>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTaskId, setIsSavingTaskId] = useState<string | null>(null);
  const [saveStateByTaskId, setSaveStateByTaskId] = useState<
    Record<string, "saving" | "saved" | "error">
  >({});
  const scopeFilter: "mine" | "all" =
    searchParams.get("scope") === "all" ? "all" : "mine";
  const projectFilter = searchParams.get("projectId") ?? "all";
  const requestedStatus = searchParams.get("status");
  const statusFilter: "all" | ApiTask["status"] =
    isTaskStatus(requestedStatus) ? requestedStatus : "all";
  const requestedPriority = searchParams.get("priority");
  const priorityFilter: "all" | ApiTask["priority"] =
    isTaskPriority(requestedPriority) ? requestedPriority : "all";
  const sortFilter = parseSortMode(searchParams.get("sort"));
  const requestedTiming = searchParams.get("timing");
  const timingFilter: TimingFilter =
    requestedTiming === "overdue" ||
    requestedTiming === "upcoming" ||
    requestedTiming === "today"
      ? requestedTiming
      : "all";
  const projectEntityProvider = useMemo(
    () => createProjectEntityProvider(projects),
    [projects],
  );
  const taskEntityProvider = useMemo(
    () => createTaskEntityProvider(tasks),
    [tasks],
  );
  useEntityProvider(projectEntityProvider);
  useEntityProvider(taskEntityProvider);

  function syncTaskFilters(nextFilters: {
    priority?: "all" | ApiTask["priority"];
    projectId?: string;
    scope?: "mine" | "all";
    sort?: SortMode;
    status?: "all" | ApiTask["status"];
    timing?: TimingFilter;
  }) {
    const nextUrl = buildTaskFiltersUrl(pathname, {
      priority: nextFilters.priority ?? priorityFilter,
      projectId: nextFilters.projectId ?? projectFilter,
      scope: nextFilters.scope ?? scopeFilter,
      sort: nextFilters.sort ?? sortFilter,
      status: nextFilters.status ?? statusFilter,
      timing: nextFilters.timing ?? timingFilter,
    });

    if (
      `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}` !==
      nextUrl
    ) {
      router.replace(nextUrl);
    }
  }

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const [taskData, projectData, authMe] = await Promise.all([
        scopeFilter === "all" ? getTasks() : getMyTasks(),
        getProjects(),
        getAuthMe(),
      ]);
      storeAuthMe(authMe);
      const uniqueProjectIds = Array.from(
        new Set(taskData.map((task) => task.projectId)),
      );
      const memberEntries = await Promise.all(
        uniqueProjectIds.map(
          async (projectId) =>
            [projectId, await getProjectMembers(projectId)] as const,
        ),
      );
      setTasks(taskData);
      setProjects(projectData);
      setMembersByProjectId(Object.fromEntries(memberEntries));
      setCurrentUserId(authMe.user.id);
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
      setRoleNames(authMe.roles.map((role) => role.name));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load tasks",
      );
    } finally {
      setIsLoading(false);
    }
  }, [scopeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleRecordExecutionUpdate(
    task: ApiTask,
    input: ReturnType<typeof buildExecutionUpdatePayload>,
  ) {
    setError(null);
    setIsSavingTaskId(task.id);
    setSaveStateByTaskId((current) => ({ ...current, [task.id]: "saving" }));
    try {
      const updatedTask = await recordProjectTaskExecutionUpdate(
        task.projectId,
        task.id,
        input,
      );
      setTasks((currentTasks) =>
        currentTasks.map((candidate) =>
          candidate.id === task.id
            ? {
                ...candidate,
                ...updatedTask,
                project: updatedTask.project ?? candidate.project,
              }
            : candidate,
        ),
      );
      setSaveStateByTaskId((current) => ({ ...current, [task.id]: "saved" }));
      window.setTimeout(() => {
        setSaveStateByTaskId((current) => {
          if (current[task.id] !== "saved") {
            return current;
          }
          const next = { ...current };
          delete next[task.id];
          return next;
        });
      }, 1200);
    } catch (requestError) {
      setSaveStateByTaskId((current) => ({ ...current, [task.id]: "error" }));
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update task",
      );
    } finally {
      setIsSavingTaskId(null);
    }
  }

  const directFilteredTasks = useMemo(() => {
    const candidateTasks =
      scopeFilter === "all"
        ? tasks
        : tasks.filter(
            (task) =>
              task.taskKind !== "summary" &&
              task.assigneeId === currentUserId,
          );

    return candidateTasks
      .filter((task) =>
        statusFilter === "all" ? true : task.status === statusFilter,
      )
      .filter((task) =>
        priorityFilter === "all" ? true : task.priority === priorityFilter,
      )
      .filter((task) =>
        projectFilter === "all" ? true : task.projectId === projectFilter,
      )
      .filter((task) => {
        if (timingFilter === "all") {
          return true;
        }

        if (!task.dueDate || task.status === "done") {
          return false;
        }

        const today = formatDateOnly(new Date());
        const dueDate = task.dueDate.slice(0, 10);

        if (timingFilter === "today") {
          return dueDate === today;
        }

        if (timingFilter === "overdue") {
          return dueDate < today;
        }

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const latestUpcomingDate = formatDateOnly(sevenDaysFromNow);

        return dueDate > today && dueDate <= latestUpcomingDate;
      })
      .slice()
      .sort((left, right) => {
        if (sortFilter === "priority") {
          const byPriority = compareTaskPriority(left, right);
          if (byPriority !== 0) {
            return byPriority;
          }
        }

        const leftTime = left.dueDate
          ? new Date(left.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDate
          ? new Date(right.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;

        if (sortFilter === "due-desc") {
          return rightTime - leftTime;
        }

        return leftTime - rightTime;
      });
  }, [
    currentUserId,
    priorityFilter,
    projectFilter,
    scopeFilter,
    sortFilter,
    statusFilter,
    tasks,
    timingFilter,
  ]);
  const visibleTasks = useMemo(() => {
    if (scopeFilter === "all") {
      return directFilteredTasks;
    }
    return includeTaskAncestors(
      tasks,
      includePersonalWorkContext(tasks, directFilteredTasks, currentUserId),
      { preserveTaskOrder: true },
    );
  }, [currentUserId, directFilteredTasks, scopeFilter, tasks]);
  const directTaskCount = directFilteredTasks.length;
  const canUpdateMyTasks =
    hasPermission(permissionKeys, "task.update") ||
    hasPermission(permissionKeys, "task.comment") ||
    hasPermission(permissionKeys, "task.reassign");

  return (
    <div className="space-y-2">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">
          My Tasks
        </h1>
        <p className="text-sm text-slate-500">
          Your assigned work across projects.
        </p>
      </header>

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section
        aria-label="My Tasks filters"
        className="space-y-2 rounded-md border border-slate-200 bg-white px-2.5 py-2"
      >
        <div aria-label="Timing filters" className="flex flex-wrap gap-1">
          {timingFilters.map((filter) => (
            <button
              aria-pressed={timingFilter === filter.value}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                timingFilter === filter.value
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              key={filter.value}
              onClick={() => syncTaskFilters({ timing: filter.value })}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Project"
            onChange={(value) => syncTaskFilters({ projectId: value })}
            value={projectFilter}
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Status"
            onChange={(value) =>
              syncTaskFilters({
                status: value as "all" | ApiTask["status"],
              })
            }
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {taskStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Priority"
            onChange={(value) =>
              syncTaskFilters({
                priority: value as "all" | ApiTask["priority"],
              })
            }
            value={priorityFilter}
          >
            <option value="all">All priorities</option>
            {taskPriorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Sort"
            onChange={(value) => syncTaskFilters({ sort: value as SortMode })}
            value={sortFilter}
          >
            <option value="priority">Priority, then due</option>
            <option value="due-asc">Due soonest</option>
            <option value="due-desc">Due latest</option>
          </FilterSelect>
        </div>
      </section>

      <TaskTable
        currentUserId={currentUserId}
        directTaskCount={directTaskCount}
        emptyMessage={
          tasks.length === 0
            ? "No tasks are assigned to you yet."
            : getEmptyMessage(timingFilter)
        }
        filterLabel={getTimingFilterLabel(timingFilter)}
        isLoading={isLoading}
        isSavingTaskId={isSavingTaskId}
        membersByProjectId={membersByProjectId}
        onRecordExecutionUpdate={
          canUpdateMyTasks ? handleRecordExecutionUpdate : undefined
        }
        permissionKeys={permissionKeys}
        roleNames={roleNames}
        saveStateByTaskId={saveStateByTaskId}
        tasks={visibleTasks}
      />
    </div>
  );
}

function FilterSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      {label}
      <select
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function PageLoading() {
  return <div className="space-y-2" />;
}

function isTaskStatus(value: string | null): value is ApiTask["status"] {
  return (
    value === "backlog" ||
    value === "todo" ||
    value === "in_progress" ||
    value === "blocked" ||
    value === "done"
  );
}

function isTaskPriority(value: string | null): value is ApiTask["priority"] {
  return (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}

function parseSortMode(value: string | null): SortMode {
  if (value === "desc" || value === "due-desc") {
    return "due-desc";
  }
  if (value === "asc" || value === "due-asc") {
    return "due-asc";
  }
  return "priority";
}

function buildTaskFiltersUrl(
  pathname: string,
  filters: {
    priority: "all" | ApiTask["priority"];
    projectId: string;
    scope: "mine" | "all";
    sort: SortMode;
    status: "all" | ApiTask["status"];
    timing: TimingFilter;
  },
) {
  const searchParams = new URLSearchParams();

  if (filters.scope !== "mine") {
    searchParams.set("scope", filters.scope);
  }

  if (filters.projectId !== "all") {
    searchParams.set("projectId", filters.projectId);
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  if (filters.priority !== "all") {
    searchParams.set("priority", filters.priority);
  }

  if (filters.sort === "due-asc") {
    searchParams.set("sort", "asc");
  } else if (filters.sort === "due-desc") {
    searchParams.set("sort", "desc");
  }

  if (filters.timing !== "all") {
    searchParams.set("timing", filters.timing);
  }

  const nextSearch = searchParams.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getTimingFilterLabel(filter: TimingFilter) {
  return timingFilters.find((item) => item.value === filter)?.label ?? "All";
}

function getEmptyMessage(filter: TimingFilter) {
  if (filter === "today") {
    return "Nothing requires your attention today.";
  }
  if (filter === "upcoming") {
    return "No upcoming tasks.";
  }
  if (filter === "overdue") {
    return "You're up to date.";
  }
  return "No tasks match the current filters.";
}
