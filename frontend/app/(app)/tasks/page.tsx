"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TaskTable } from "@/components/tasks/task-table";
import { getProjects, type ApiProject } from "@/features/projects";
import { getMyTasks, type ApiTask } from "@/features/tasks";

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApiTask["status"]>(
    "all",
  );
  const [dueDateSort, setDueDateSort] = useState<"asc" | "desc">("asc");

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [taskData, projectData] = await Promise.all([
        getMyTasks(),
        getProjects(),
      ]);
      setTasks(taskData);
      setProjects(projectData);
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
        tasks={visibleTasks}
      />
    </div>
  );
}
