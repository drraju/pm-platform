"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getMyTasks, updateTask, type ApiTask } from "@/features/tasks";

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [membersByProjectId, setMembersByProjectId] = useState<
    Record<string, ApiProjectMember[]>
  >({});
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTaskId, setIsSavingTaskId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApiTask["status"]>(
    "all",
  );
  const [dueDateSort, setDueDateSort] = useState<"asc" | "desc">("asc");

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [taskData, projectData, authMe] = await Promise.all([
        getMyTasks(),
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
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load tasks",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleUpdateTask(
    taskId: string,
    input: {
      assigneeId?: string;
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
      .toSorted((left, right) => {
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
  }, [dueDateSort, projectFilter, statusFilter, tasks]);
  const canUpdateMyTasks =
    hasPermission(permissionKeys, "task.update") ||
    hasPermission(permissionKeys, "task.comment") ||
    hasPermission(permissionKeys, "task.reassign");

  return (
    <div className="space-y-6">
      <PageHeader
        description="A personal view of assigned work across projects, due dates, and delivery priority."
        eyebrow="My work"
        title="My Tasks"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}
      {toast ? <ToastMessage toast={toast} /> : null}

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Filter by status
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | ApiTask["status"])
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
            onChange={(event) => setProjectFilter(event.target.value)}
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
              setDueDateSort(event.target.value as "asc" | "desc")
            }
            value={dueDateSort}
          >
            <option value="asc">Soonest first</option>
            <option value="desc">Latest first</option>
          </select>
        </label>
      </section>

      <TaskTable
        emptyMessage={
          tasks.length === 0
            ? "No tasks are assigned to you yet."
            : "No tasks match the current filters."
        }
        isLoading={isLoading}
        isSavingTaskId={isSavingTaskId}
        membersByProjectId={membersByProjectId}
        onUpdateTask={canUpdateMyTasks ? handleUpdateTask : undefined}
        tasks={visibleTasks}
      />
    </div>
  );
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
