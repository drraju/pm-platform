"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  deleteProject,
  getProject,
  updateProject,
  type ApiProjectDetails,
} from "@/features/projects";
import { getUsers, type ApiUser } from "@/features/users";

const projectStatuses = [
  { label: "Active", value: "active" },
  { label: "At risk", value: "at_risk" },
  { label: "Blocked", value: "blocked" },
  { label: "Complete", value: "complete" },
];

export default function ProjectDetailsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const raidCount = useMemo(() => {
    if (!project) {
      return 0;
    }

    return (
      (project.risks?.length ?? 0) +
      (project.issues?.length ?? 0) +
      (project.assumptions?.length ?? 0) +
      (project.dependencies?.length ?? 0)
    );
  }, [project]);

  async function handleUpdateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const ownerId = String(formData.get("ownerId") ?? "");

    try {
      const updatedProject = await updateProject(projectId, {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        status: String(formData.get("status") ?? "active"),
        startDate: String(formData.get("startDate") ?? "") || undefined,
        targetEndDate: String(formData.get("targetEndDate") ?? "") || undefined,
        ownerId: ownerId || undefined,
      });
      setProject(updatedProject);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update project",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteProject() {
    const shouldDelete = window.confirm(
      "Delete this project? This action cannot be undone.",
    );
    if (!shouldDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      router.push("/projects");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete project",
      );
      setIsDeleting(false);
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
        {error ? (
          <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}
        <Link className="text-sm font-semibold text-brand" href="/projects">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <button
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isDeleting}
            onClick={handleDeleteProject}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete project"}
          </button>
        }
        description={project.description || "No project description has been added."}
        eyebrow="Project details"
        title={project.name}
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Status", value: project.status.replaceAll("_", " ") },
          {
            label: "Owner",
            value: project.owner
              ? `${project.owner.firstName} ${project.owner.lastName}`
              : "Unassigned",
          },
          { label: "Tasks", value: String(project.tasks?.length ?? 0) },
          { label: "RAID items", value: String(raidCount) },
        ].map((item) => (
          <section
            className="rounded-md border border-slate-200 bg-white p-5 shadow-soft"
            key={item.label}
          >
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold capitalize text-slate-950">
              {item.value}
            </p>
          </section>
        ))}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-950">Project settings</h2>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdateProject}>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              defaultValue={project.name}
              name="name"
              required
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              defaultValue={project.description ?? ""}
              name="description"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              defaultValue={project.status}
              name="status"
            >
              {projectStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Owner</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              defaultValue={project.ownerId ?? ""}
              name="ownerId"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Start</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              defaultValue={project.startDate ?? ""}
              name="startDate"
              type="date"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Target</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              defaultValue={project.targetEndDate ?? ""}
              name="targetEndDate"
              type="date"
            />
          </label>

          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <Link className="text-sm font-semibold text-brand" href="/projects">
              Back to projects
            </Link>
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-950">Recent tasks</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(project.tasks ?? []).slice(0, 6).map((task) => (
              <article className="py-3 text-sm" key={task.id}>
                <h3 className="font-semibold text-slate-950">{task.title}</h3>
                <p className="mt-1 capitalize text-slate-600">
                  {task.status.replaceAll("_", " ")}
                </p>
              </article>
            ))}
            {(project.tasks?.length ?? 0) === 0 ? (
              <p className="py-3 text-sm text-slate-500">No tasks yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-950">Project team</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(project.members ?? []).map((member) => (
              <article className="py-3 text-sm" key={member.id}>
                <h3 className="font-semibold text-slate-950">
                  {member.user
                    ? `${member.user.firstName} ${member.user.lastName}`
                    : "Unknown user"}
                </h3>
                <p className="mt-1 capitalize text-slate-600">
                  {member.role.replaceAll("_", " ")}
                </p>
              </article>
            ))}
            {(project.members?.length ?? 0) === 0 ? (
              <p className="py-3 text-sm text-slate-500">No members yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
