"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { PageHeader } from "@/components/layout/page-header";
import {
  addProjectMember,
  createProjectTask,
  getProject,
  removeProjectMember,
  updateProjectTask,
  type ApiProjectDetails,
  type ApiProjectMember,
  type ApiTask,
} from "@/features/projects";
import { getUsers, type ApiUser } from "@/features/users";

const memberRoles = [
  { label: "Owner", value: "owner" },
  { label: "Manager", value: "manager" },
  { label: "Contributor", value: "contributor" },
  { label: "Viewer", value: "viewer" },
];

const taskStatuses: Array<{ label: string; value: ApiTask["status"] }> = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [projectData, userData] = await Promise.all([
        getProject(projectId),
        getUsers(),
      ]);
      setProject(projectData);
      setUsers(userData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load project",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const tasks = project?.tasks ?? [];
  const members = project?.members ?? [];

  const summary = useMemo(
    () => ({
      blocked: tasks.filter((task) => task.status === "blocked").length,
      completed: tasks.filter((task) => task.status === "done").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      total: tasks.length,
    }),
    [tasks],
  );

  const memberUserIds = useMemo(
    () => new Set(members.map((member) => member.userId)),
    [members],
  );

  const availableUsers = users.filter((user) => !memberUserIds.has(user.id));

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsAddingMember(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await addProjectMember(projectId, {
        userId: String(formData.get("userId") ?? ""),
        role: String(formData.get("role") ?? "contributor"),
      });
      form.reset();
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add member",
      );
    } finally {
      setIsAddingMember(false);
    }
  }

  async function handleRemoveMember(member: ApiProjectMember) {
    const displayName = member.user
      ? `${member.user.firstName} ${member.user.lastName}`
      : "this member";
    if (!window.confirm(`Remove ${displayName} from this project?`)) {
      return;
    }

    setError(null);
    setRemovingUserId(member.userId);
    try {
      await removeProjectMember(projectId, member.userId);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove member",
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreatingTask(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const assigneeId = String(formData.get("assigneeId") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");

    try {
      await createProjectTask(projectId, {
        title: String(formData.get("title") ?? ""),
        assigneeId: assigneeId || undefined,
        status: String(formData.get("status") ?? "todo") as ApiTask["status"],
        priority: String(formData.get("priority") ?? "medium"),
        dueDate: dueDate || undefined,
      });
      form.reset();
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create task",
      );
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleUpdateTaskStatus(
    task: ApiTask,
    status: ApiTask["status"],
  ) {
    setError(null);
    setUpdatingTaskId(task.id);
    try {
      await updateProjectTask(projectId, task.id, { status });
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update task status",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Loading project delivery details."
          eyebrow="Project details"
          title="Project"
        />
        <section className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-soft">
          Loading project...
        </section>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="The requested project could not be loaded."
          eyebrow="Project details"
          title="Project not found"
        />
        {error ? <ErrorMessage message={error} /> : null}
        <Link className="text-sm font-semibold text-brand" href="/projects">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={project.description || "No project description has been added."}
        eyebrow="Project details"
        title={project.name}
      />

      {error ? <ErrorMessage message={error} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Tasks" value={summary.total} />
        <SummaryCard label="Completed" value={summary.completed} tone="success" />
        <SummaryCard
          label="In Progress"
          value={summary.inProgress}
          tone="warning"
        />
        <SummaryCard label="Blocked" value={summary.blocked} tone="danger" />
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-950">
          Project Overview
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewItem label="Name" value={project.name} />
          <OverviewItem
            label="Description"
            value={project.description || "No description"}
          />
          <OverviewItem label="Status" value={formatLabel(project.status)} />
          <OverviewItem
            label="Owner"
            value={
              project.owner
                ? `${project.owner.firstName} ${project.owner.lastName}`
                : "Unassigned"
            }
          />
        </dl>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Team Members
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Display members and their project role.
              </p>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {members.length}
            </span>
          </div>

          <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_auto]" onSubmit={handleAddMember}>
            <label className="block">
              <span className="sr-only">Member</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                disabled={availableUsers.length === 0}
                name="userId"
                required
              >
                <option value="">Add member</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Project role</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="role"
              >
                {memberRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isAddingMember || availableUsers.length === 0}
              type="submit"
            >
              {isAddingMember ? "Adding..." : "Add"}
            </button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <div className="hidden grid-cols-[1fr_1.2fr_0.8fr_120px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Name</span>
              <span>Email</span>
              <span>Project Role</span>
              <span>Action</span>
            </div>
            {members.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No members yet.</p>
            ) : null}
            {members.map((member) => (
              <article
                className="grid gap-3 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_1.2fr_0.8fr_120px] md:items-center"
                key={member.id}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                    Name
                  </p>
                  <h3 className="font-semibold text-slate-950">
                    {member.user
                      ? `${member.user.firstName} ${member.user.lastName}`
                      : "Unknown user"}
                  </h3>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                    Email
                  </p>
                  <p className="mt-1 text-slate-500">
                    {member.user?.email ?? "No email"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                    Project Role
                  </p>
                  <span className="capitalize text-slate-600">
                    {formatLabel(member.role)}
                  </span>
                </div>
                <div>
                  <button
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={removingUserId === member.userId}
                    onClick={() => void handleRemoveMember(member)}
                    type="button"
                  >
                    {removingUserId === member.userId ? "Removing..." : "Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Tasks</h2>
              <p className="mt-1 text-sm text-slate-500">
                Display tasks for this project and update delivery status.
              </p>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {tasks.length}
            </span>
          </div>

          <form className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_150px_130px_130px_auto]" onSubmit={handleCreateTask}>
            <label className="block">
              <span className="sr-only">Task</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="title"
                placeholder="Create task"
                required
              />
            </label>
            <label className="block">
              <span className="sr-only">Assignee</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="assigneeId"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user
                      ? `${member.user.firstName} ${member.user.lastName}`
                      : member.userId}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Status</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="status"
              >
                {taskStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Priority</span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Due Date</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="dueDate"
                type="date"
              />
            </label>
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isCreatingTask}
              type="submit"
            >
              {isCreatingTask ? "Creating..." : "Create"}
            </button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Title</th>
                  <th className="px-3 py-3">Assignee</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <tr>
                    <td className="px-3 py-5 text-slate-500" colSpan={4}>
                      No tasks yet.
                    </td>
                  </tr>
                ) : null}
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-3 py-3 font-semibold text-slate-950">
                      {task.title}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {task.assignee
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm capitalize outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={updatingTaskId === task.id}
                        onChange={(event) =>
                          void handleUpdateTaskStatus(
                            task,
                            event.target.value as ApiTask["status"],
                          )
                        }
                        value={task.status}
                      >
                        {taskStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
