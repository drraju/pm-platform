"use client";

import React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import {
  createProject,
  deleteProject,
  getAssignableUsers,
  getProject,
  getProjects,
  updateProject,
  type ApiProject,
} from "@/features/projects";
import {
  getAuthMe,
  getStoredAccessToken,
  getStoredPermissionKeys,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import type {
  ApiAssignableUser,
  ApiProjectHealthStatus,
} from "@/lib/api/client";

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
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectPendingDelete, setProjectPendingDelete] =
    useState<ApiProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);
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
  const canEditProject = hasPermission(permissionKeys, "project.update");
  const canDeleteProject = hasPermission(permissionKeys, "project.delete");

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
      const projectsWithWorkspaceContext = await Promise.all(
        projectData.map(async (project) => {
          try {
            const details = await getProject(project.id);
            return {
              ...project,
              businessOwner: details.businessOwner ?? project.businessOwner,
              businessOwnerId:
                details.businessOwnerId ?? project.businessOwnerId,
              createdAt: project.createdAt ?? details.createdAt,
              description: details.description ?? project.description,
              deliveryLead: details.deliveryLead ?? project.deliveryLead,
              deliveryLeadId: details.deliveryLeadId ?? project.deliveryLeadId,
              executiveSponsor:
                details.executiveSponsor ?? project.executiveSponsor,
              executiveSponsorId:
                details.executiveSponsorId ?? project.executiveSponsorId,
              health: details.health ?? project.health,
              issues: details.issues ?? project.issues,
              members: details.members ?? project.members,
              startDate: details.startDate ?? project.startDate,
              owner: details.owner ?? project.owner,
              ownerId: details.ownerId ?? project.ownerId,
              risks: details.risks ?? project.risks,
              targetEndDate: details.targetEndDate ?? project.targetEndDate,
              tasks: details.tasks ?? project.tasks,
            };
          } catch {
            return project;
          }
        }),
      );
      setProjects(projectsWithWorkspaceContext);
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

  function openCreateProjectModal() {
    setSelectedProject(null);
    setIsProjectModalOpen(true);
  }

  function openEditProjectModal(project: ApiProject) {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  }

  function closeProjectModal() {
    setSelectedProject(null);
    setIsProjectModalOpen(false);
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSavingProject(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      status: String(formData.get("status") ?? "active"),
      startDate: String(formData.get("startDate") ?? "") || undefined,
      targetEndDate: String(formData.get("targetEndDate") ?? "") || undefined,
      ownerId: optionalValue(formData.get("ownerId")),
      businessOwnerId: optionalValue(formData.get("businessOwnerId")),
      executiveSponsorId: optionalValue(formData.get("executiveSponsorId")),
      deliveryLeadId: optionalValue(formData.get("deliveryLeadId")),
    };

    try {
      if (selectedProject) {
        await updateProject(selectedProject.id, payload);
      } else {
        await createProject(payload);
      }
      closeProjectModal();
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : selectedProject
            ? "Unable to update project"
            : "Unable to create project",
      );
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDeleteProject() {
    if (!projectPendingDelete) {
      return;
    }

    setError(null);
    setIsDeletingProject(true);
    try {
      await deleteProject(projectPendingDelete.id);
      setProjectPendingDelete(null);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete project",
      );
    } finally {
      setIsDeletingProject(false);
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
              onClick={openCreateProjectModal}
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
        canDeleteProjects={canDeleteProject}
        canEditProjects={canEditProject}
        emptyMessage={
          projects.length === 0
            ? "No projects have been created yet."
            : "No projects match the current filters."
        }
        isLoading={isLoading}
        onDeleteProject={(project) => setProjectPendingDelete(project)}
        onEditProject={openEditProjectModal}
        projects={filteredProjects}
      />

      {isProjectModalOpen ? (
        <AppModal
          description="Set delivery ownership, governance contacts, status, and target dates."
          footer={
            <>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={closeProjectModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSavingProject}
                form="project-form"
                type="submit"
              >
                {isSavingProject
                  ? selectedProject
                    ? "Saving..."
                    : "Creating..."
                  : selectedProject
                    ? "Save changes"
                    : "Create project"}
              </button>
            </>
          }
          labelledById="project-form-title"
          onClose={closeProjectModal}
          title={selectedProject ? "Edit project" : "Create project"}
          widthClassName="max-w-3xl"
        >
          <ProjectForm
            onSubmit={handleProjectSubmit}
            project={selectedProject}
            users={users}
          />
        </AppModal>
      ) : null}

      {projectPendingDelete ? (
        <AppModal
          description="This removes the project workspace and its related delivery data from active use."
          footer={
            <>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setProjectPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isDeletingProject}
                onClick={handleDeleteProject}
                type="button"
              >
                {isDeletingProject ? "Deleting..." : "Delete project"}
              </button>
            </>
          }
          labelledById="delete-project-title"
          onClose={() => setProjectPendingDelete(null)}
          title="Delete project"
          widthClassName="max-w-md"
        >
          <p className="text-sm text-slate-600">
            Confirm deletion of{" "}
            <span className="font-semibold text-slate-950">
              {projectPendingDelete.name}
            </span>
            .
          </p>
        </AppModal>
      ) : null}
    </div>
  );
}

function ProjectForm({
  onSubmit,
  project,
  users,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  project: ApiProject | null;
  users: ApiAssignableUser[];
}) {
  return (
    <ModalForm id="project-form" onSubmit={onSubmit}>
      <ModalFormSection
        description="Keep core project metadata and ownership together so long forms stay easy to navigate on smaller screens."
        title="Project Detail"
      >
        <ModalFormGrid>
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          defaultValue={project?.name ?? ""}
          name="name"
          required
        />
      </label>

      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">Description</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          defaultValue={project?.description ?? ""}
          name="description"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          defaultValue={project?.status ?? "active"}
          name="status"
        >
          {projectStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <ProjectUserSelect
        defaultValue={project?.ownerId ?? ""}
        label="Owner"
        name="ownerId"
        users={users}
      />
      <ProjectUserSelect
        defaultValue={project?.businessOwnerId ?? ""}
        label="Business Owner"
        name="businessOwnerId"
        users={users}
      />
      <ProjectUserSelect
        defaultValue={project?.executiveSponsorId ?? ""}
        label="Executive Sponsor"
        name="executiveSponsorId"
        users={users}
      />
      <ProjectUserSelect
        defaultValue={project?.deliveryLeadId ?? ""}
        label="Delivery Lead"
        name="deliveryLeadId"
        users={users}
      />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Start</span>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          defaultValue={project?.startDate ?? ""}
          name="startDate"
          type="date"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Target</span>
        <input
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          defaultValue={project?.targetEndDate ?? ""}
          name="targetEndDate"
          type="date"
        />
      </label>
        </ModalFormGrid>
      </ModalFormSection>
    </ModalForm>
  );
}

function ProjectUserSelect({
  defaultValue,
  label,
  name,
  users,
}: {
  defaultValue: string;
  label: string;
  name: string;
  users: ApiAssignableUser[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        defaultValue={defaultValue}
        name={name}
      >
        <option value="">Unassigned</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.firstName} {user.lastName}
          </option>
        ))}
      </select>
    </label>
  );
}

function optionalValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "");
  return normalized || undefined;
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
