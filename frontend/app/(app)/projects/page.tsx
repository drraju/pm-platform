"use client";

import React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { AppModal } from "@/components/ui/app-modal";
import {
  createProject,
  getAssignableUsers,
  getProject,
  getProjects,
  type ApiProject,
} from "@/features/projects";
import {
  getAuthMe,
  getStoredAccessToken,
  getStoredPermissionKeys,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import type { ApiAssignableUser, ApiProjectHealthStatus } from "@/lib/api/client";

const projectStatuses = [
  { label: "Active", value: "active" },
  { label: "At risk", value: "at_risk" },
  { label: "Blocked", value: "blocked" },
  { label: "Complete", value: "complete" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [sortMode, setSortMode] = useState<
    "created_asc" | "created_desc" | "health_asc" | "health_desc"
  >("created_desc");
  const hasSession = useMemo(() => Boolean(getStoredAccessToken()), []);
  const canCreateProject = hasPermission(permissionKeys, "project.create");

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [projectData, userData, authMe] = await Promise.all([
        getProjects(),
        getAssignableUsers(),
        getAuthMe(),
      ]);
      storeAuthMe(authMe);
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
      const projectsWithMemberCounts = await Promise.all(
        projectData.map(async (project) => {
          try {
            const details = await getProject(project.id);
            return {
              ...project,
              createdAt: project.createdAt ?? details.createdAt,
              health: details.health ?? project.health,
              issues: details.issues ?? project.issues,
              members: details.members ?? project.members,
              risks: details.risks ?? project.risks,
              tasks: details.tasks ?? project.tasks,
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
        if (sortMode === "health_asc" || sortMode === "health_desc") {
          const leftHealth = healthRank(left.health?.status ?? "GREEN");
          const rightHealth = healthRank(right.health?.status ?? "GREEN");

          return sortMode === "health_desc"
            ? rightHealth - leftHealth
            : leftHealth - rightHealth;
        }

        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;

        return sortMode === "created_desc"
          ? rightTime - leftTime
          : leftTime - rightTime;
      });
  }, [projects, searchTerm, sortMode, statusFilter]);

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
          canCreateProject ? (
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!hasSession}
              onClick={() => setIsCreateModalOpen(true)}
              type="button"
            >
              Create project
            </button>
          ) : null
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

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-[1fr_220px_240px]">
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
            Sort projects
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setSortMode(
                event.target.value as
                  | "created_asc"
                  | "created_desc"
                  | "health_asc"
                  | "health_desc",
              )
            }
            value={sortMode}
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="health_desc">Health: Red first</option>
            <option value="health_asc">Health: Green first</option>
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
        <AppModal
          description="Set the delivery owner, status, and target dates."
          footer={
            <>
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
                form="create-project-form"
                type="submit"
              >
                {isCreating ? "Creating..." : "Create project"}
              </button>
            </>
          }
          labelledById="create-project-title"
          onClose={() => setIsCreateModalOpen(false)}
          title="Create project"
          widthClassName="max-w-2xl"
        >

            <form className="grid gap-4 sm:grid-cols-2" id="create-project-form" onSubmit={handleCreateProject}>
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
            </form>
        </AppModal>
      ) : null}
    </div>
  );
}

function healthRank(status: ApiProjectHealthStatus) {
  switch (status) {
    case "RED":
      return 3;
    case "AMBER":
      return 2;
    case "GREEN":
      return 1;
  }
}
