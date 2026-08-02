"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TaskTable } from "@/components/tasks/task-table";
import {
  getProjectMembers,
  getProjects,
  type ApiProject,
  type ApiProjectMember,
} from "@/features/projects";
import {
  getAuthMe,
  getStoredPermissionKeys,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import { getMyTasks, getTasks, updateTask, type ApiTask } from "@/features/tasks";
import {
  createProjectEntityProvider,
  createTaskEntityProvider,
  useEntityProvider,
} from "@/features/entity-search";

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
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
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTaskId, setIsSavingTaskId] = useState<string | null>(null);
  const scopeFilter: "mine" | "all" =
    searchParams.get("scope") === "all" ? "all" : "mine";
  const projectFilter = searchParams.get("projectId") ?? "all";
  const requestedStatus = searchParams.get("status");
  const statusFilter: "all" | ApiTask["status"] =
    isTaskStatus(requestedStatus) ? requestedStatus : "all";
  const dueDateSort: "asc" | "desc" = searchParams.get("sort") === "desc" ? "desc" : "asc";
  const requestedTiming = searchParams.get("timing");
  const timingFilter: "all" | "overdue" | "upcoming" =
    requestedTiming === "overdue" || requestedTiming === "upcoming"
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
    projectId?: string;
    scope?: "mine" | "all";
    sort?: "asc" | "desc";
    status?: "all" | ApiTask["status"];
    timing?: "all" | "overdue" | "upcoming";
  }) {
    const nextUrl = buildTaskFiltersUrl(pathname, {
      projectId: nextFilters.projectId ?? projectFilter,
      scope: nextFilters.scope ?? scopeFilter,
      sort: nextFilters.sort ?? dueDateSort,
      status: nextFilters.status ?? statusFilter,
      timing: nextFilters.timing ?? timingFilter,
    });

    if (`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}` !== nextUrl) {
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
        uniqueProjectIds.map(async (projectId) => [
          projectId,
          await getProjectMembers(projectId),
        ] as const),
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

  async function handleUpdateTask(
    taskId: string,
    input: {
      assigneeId?: string | null;
      percentComplete?: number;
      remarks?: string;
      status?: ApiTask["status"];
    },
  ) {
    setError(null);
    setIsSavingTaskId(taskId);
    try {
      const updatedTask = await updateTask(taskId, input);
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...updatedTask,
                project: updatedTask.project ?? task.project,
              }
            : task,
        ),
      );
      showToast(setToast, "success", "Task changes saved.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to update task.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update task",
      );
    } finally {
      setIsSavingTaskId(null);
    }
  }

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) =>
        statusFilter === "all" ? true : task.status === statusFilter,
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

        if (timingFilter === "overdue") {
          return dueDate < today;
        }

        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const latestUpcomingDate = formatDateOnly(sevenDaysFromNow);

        return dueDate >= today && dueDate <= latestUpcomingDate;
      })
      .slice()
      .sort((left, right) => {
        const leftTime = left.dueDate
          ? new Date(left.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightTime = right.dueDate
          ? new Date(right.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER;

        return dueDateSort === "asc"
          ? leftTime - rightTime
          : rightTime - leftTime;
      });
  }, [dueDateSort, projectFilter, statusFilter, tasks, timingFilter]);
  const canUpdateMyTasks =
    hasPermission(permissionKeys, "task.update") ||
    hasPermission(permissionKeys, "task.comment") ||
    hasPermission(permissionKeys, "task.reassign");
  const isAllTasksScope = scopeFilter === "all";

  return (
    <div className="space-y-6">
      <PageHeader
        description={
          isAllTasksScope
            ? "A filtered view of visible project work across projects, due dates, and delivery priority."
            : "A personal view of assigned work across projects, due dates, and delivery priority."
        }
        eyebrow="My work"
        title={isAllTasksScope ? "Tasks" : "My Tasks"}
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}
      {toast ? <ToastMessage toast={toast} /> : null}

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Task scope
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              syncTaskFilters({
                scope: event.target.value === "all" ? "all" : "mine",
              })
            }
            value={scopeFilter}
          >
            <option value="mine">Assigned to me</option>
            <option value="all">All visible tasks</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Filter by status
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              syncTaskFilters({
                status: event.target.value as "all" | ApiTask["status"],
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
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Filter by project
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => syncTaskFilters({ projectId: event.target.value })}
            value={projectFilter}
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Sort by due date
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              syncTaskFilters({ sort: event.target.value as "asc" | "desc" })
            }
            value={dueDateSort}
          >
            <option value="asc">Soonest first</option>
            <option value="desc">Latest first</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Filter by timing
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              syncTaskFilters({
                timing: event.target.value as "all" | "overdue" | "upcoming",
              })
            }
            value={timingFilter}
          >
            <option value="all">All tasks</option>
            <option value="upcoming">Upcoming in 7 days</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
      </section>

      <TaskTable
        currentUserId={currentUserId}
        emptyMessage={
          tasks.length === 0
            ? "No tasks are assigned to you yet."
            : "No tasks match the current filters."
        }
        isLoading={isLoading}
        isSavingTaskId={isSavingTaskId}
        membersByProjectId={membersByProjectId}
        onUpdateTask={canUpdateMyTasks ? handleUpdateTask : undefined}
        permissionKeys={permissionKeys}
        roleNames={roleNames}
        tasks={visibleTasks}
      />
    </div>
  );
}

function PageLoading() {
  return <div className="space-y-6" />;
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

function buildTaskFiltersUrl(pathname: string, filters: {
  projectId: string;
  scope: "mine" | "all";
  sort: "asc" | "desc";
  status: "all" | ApiTask["status"];
  timing: "all" | "overdue" | "upcoming";
}) {
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

  if (filters.sort !== "asc") {
    searchParams.set("sort", filters.sort);
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

type ToastState = {
  id: number;
  message: string;
  tone: "error" | "success";
};

function showToast(
  setToast: React.Dispatch<React.SetStateAction<ToastState | null>>,
  tone: ToastState["tone"],
  message: string,
) {
  const id = Date.now();
  setToast({ id, message, tone });
  window.setTimeout(() => {
    setToast((currentToast) => (currentToast?.id === id ? null : currentToast));
  }, 3000);
}

function ToastMessage({ toast }: { toast: ToastState }) {
  return (
    <section
      className={`fixed right-4 top-4 z-50 rounded-md border px-4 py-3 text-sm font-semibold shadow-lg ${
        toast.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
      role="status"
    >
      {toast.message}
    </section>
  );
}
