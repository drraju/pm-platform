"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getProjects, type ApiProject } from "@/features/projects";
import { createTask, getTasks, type ApiTask } from "@/features/tasks";
import { getUsers, type ApiUser } from "@/features/users";

const columns: Array<{ title: string; status: ApiTask["status"] }> = [
  { title: "Backlog", status: "backlog" },
  { title: "To do", status: "todo" },
  { title: "In progress", status: "in_progress" },
  { title: "Blocked", status: "blocked" },
  { title: "Done", status: "done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [taskData, projectData, userData] = await Promise.all([
        getTasks(),
        getProjects(),
        getUsers(),
      ]);
      setTasks(taskData);
      setProjects(projectData);
      setUsers(userData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load tasks");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const assigneeId = String(formData.get("assigneeId") ?? "");

    try {
      await createTask({
        projectId: String(formData.get("projectId") ?? ""),
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        assigneeId: assigneeId || undefined,
        status: String(formData.get("status") ?? "backlog") as ApiTask["status"],
        priority: String(formData.get("priority") ?? "medium"),
        dueDate: String(formData.get("dueDate") ?? "") || undefined,
      });
      form.reset();
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create task");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="A responsive Kanban-style task board for project squads, owners, blockers, and near-term delivery commitments."
        eyebrow="Kanban"
        title="Tasks"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <form
        className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft lg:grid-cols-[1fr_1fr_160px_160px_160px_auto]"
        onSubmit={handleCreateTask}
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Project</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="projectId" required>
            <option value="">Choose project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Task</span>
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="title" required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="status">
            {columns.map((column) => (
              <option key={column.status} value={column.status}>{column.title}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Assignee</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="assigneeId">
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Due</span>
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="dueDate" type="date" />
        </label>
        <button
          className="mt-7 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70"
          disabled={isCreating || projects.length === 0}
          type="submit"
        >
          Add task
        </button>
        <input name="description" type="hidden" value="" />
        <input name="priority" type="hidden" value="medium" />
      </form>

      <section className="grid gap-4 xl:grid-cols-5">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <div className="min-h-72 rounded-md border border-slate-200 bg-white p-4 shadow-soft" key={column.status}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{column.title}</h2>
              <div className="mt-4 space-y-3">
                {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
                {!isLoading && columnTasks.length === 0 ? <p className="text-sm text-slate-400">No tasks</p> : null}
                {columnTasks.map((task) => (
                  <article className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" key={task.id}>
                    <h3 className="font-semibold text-slate-950">{task.title}</h3>
                    <p className="mt-2 text-xs text-slate-500">{task.project?.name ?? "No project"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
