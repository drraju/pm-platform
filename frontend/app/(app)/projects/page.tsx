"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import {
  createProject,
  getProject,
  getProjects,
  type ApiProject,
} from "@/features/projects";
import { getUsers, type ApiUser } from "@/features/users";
import { getStoredAccessToken } from "@/features/auth";

const projectStatuses = [
  { label: "Active", value: "active" },
  { label: "At risk", value: "at_risk" },
  { label: "Blocked", value: "blocked" },
  { label: "Complete", value: "complete" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdSort, setCreatedSort] = useState<"asc" | "desc">("desc");
  const hasSession = useMemo(() => Boolean(getStoredAccessToken()), []);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [projectData, userData] = await Promise.all([
        getProjects(),
        getUsers(),
      ]);
      const projectsWithMemberCounts = await Promise.all(
        projectData.map(async (project) => {
          try {
            const details = await getProject(project.id);
            return {
              ...project,
              createdAt: project.createdAt ?? details.createdAt,
              members: details.members ?? project.members,
            };
          } catch {
            return project;
          }
        }),
      );
      setProjects(projectsWithMemberCounts);
      setUsers(userData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load projects",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return projects
      .filter((project) =>
        normalizedSearchTerm
          ? project.name.toLowerCase().includes(normalizedSearchTerm)
          : true,
      )
      .filter((project) =>
        statusFilter === "all" ? true : project.status === statusFilter,
      )
      .toSorted((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;

        return createdSort === "desc"
          ? rightTime - leftTime
          : leftTime - rightTime;
      });
  }, [createdSort, projects, searchTerm, statusFilter]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const ownerId = String(formData.get("ownerId") ?? "");

    try {
      await createProject({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        status: String(formData.get("status") ?? "active"),
        startDate: String(formData.get("startDate") ?? "") || undefined,
        targetEndDate: String(formData.get("targetEndDate") ?? "") || undefined,
        ownerId: ownerId || undefined,
      });
      form.reset();
      setIsCreateModalOpen(false);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create project",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!hasSession}
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            Create project
          </button>
        }
        description="Track delivery ownership, project stage, health, milestones, and integration readiness across the active portfolio."
        eyebrow="Multi-project support"
        title="Projects"
      />

      {!hasSession ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sign in first so the workspace can read and create projects.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-[1fr_220px_220px]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Search by project name
          </span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search projects"
            type="search"
            value={searchTerm}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Filter by status
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {projectStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Sort by created date
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setCreatedSort(event.target.value as "asc" | "desc")
            }
            value={createdSort}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>
      </section>

      <ProjectTable
        emptyMessage={
          projects.length === 0
            ? "No projects have been created yet."
            : "No projects match the current filters."
        }
        isLoading={isLoading}
        projects={filteredProjects}
      />

      {isCreateModalOpen ? (
        <div
          aria-labelledby="create-project-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6"
          role="dialog"
        >
          <section className="w-full max-w-2xl rounded-md border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-semibold text-slate-950"
                  id="create-project-title"
                >
                  Create project
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Set the delivery owner, status, and target dates.
                </p>
              </div>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setIsCreateModalOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleCreateProject}>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  name="name"
                  required
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Description
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  name="description"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                  name="startDate"
                  type="date"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Target</span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  name="targetEndDate"
                  type="date"
                />
              </label>

              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
