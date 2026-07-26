"use client";

import React from "react";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectTable } from "@/components/projects/project-table";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import {
  archiveProject,
  createProject,
  getAssignableUsers,
  getProject,
  getProjects,
  purgeProject,
  restoreProject,
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
import { subscribeToApplicationCommandActions } from "@/features/commands";
import {
  createProjectEntityProvider,
  useEntityProvider,
} from "@/features/entity-search";
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

const projectFilterStatuses = [
  ...projectStatuses,
  { label: "Archived", value: "archived" },
];

export default function ProjectsPage() {
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
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLifecycleActionSaving, setIsLifecycleActionSaving] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectPendingArchive, setProjectPendingArchive] =
    useState<ApiProject | null>(null);
  const [projectPendingPurge, setProjectPendingPurge] =
    useState<ApiProject | null>(null);
  const [projectPendingRestore, setProjectPendingRestore] =
    useState<ApiProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(
    null,
  );
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const requestedHealth = searchParams.get("health")?.toUpperCase();
  const healthFilter: "all" | ApiProjectHealthStatus =
    requestedHealth === "GREEN" ||
    requestedHealth === "AMBER" ||
    requestedHealth === "RED"
      ? requestedHealth
      : "all";
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const requestedSort = searchParams.get("sort");
  const sortMode:
    | "created_asc"
    | "created_desc"
    | "health_asc"
    | "health_desc" = isProjectSortMode(requestedSort)
    ? requestedSort
    : "created_desc";
  const hasSession = useMemo(() => Boolean(getStoredAccessToken()), []);
  const canCreateProject = hasPermission(permissionKeys, "project.create");
  const canEditProject = hasPermission(permissionKeys, "project.update");
  const canArchiveProject = hasPermission(permissionKeys, "project.delete");
  const canRestoreProject = hasPermission(permissionKeys, "project.update");
  const canPurgeProject = isPlatformAdmin;
  const projectEntityProvider = useMemo(
    () => createProjectEntityProvider(projects),
    [projects],
  );
  useEntityProvider(projectEntityProvider);

  function syncProjectFilters(nextFilters: {
    health?: "all" | ApiProjectHealthStatus;
    search?: string;
    sort?: "created_asc" | "created_desc" | "health_asc" | "health_desc";
    status?: string;
  }) {
    const nextUrl = buildProjectFiltersUrl(pathname, {
      health: nextFilters.health ?? healthFilter,
      search: nextFilters.search ?? searchTerm,
      sort: nextFilters.sort ?? sortMode,
      status: nextFilters.status ?? statusFilter,
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
      const [projectData, userData, authMe] = await Promise.all([
        getProjects({ archived: statusFilter === "archived" }),
        getAssignableUsers(),
        getAuthMe(),
      ]);
      storeAuthMe(authMe);
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
      setIsPlatformAdmin(
        authMe.roles.some((role) => role.name === "PLATFORM_ADMIN"),
      );
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
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
      .filter((project) =>
        healthFilter === "all"
          ? true
          : (project.health?.status ?? "GREEN") === healthFilter,
      )
      .slice()
      .sort((left, right) => {
        if (sortMode === "health_asc" || sortMode === "health_desc") {
          const leftHealth = healthRank(left.health?.status ?? "GREEN");
          const rightHealth = healthRank(right.health?.status ?? "GREEN");

          return sortMode === "health_desc"
            ? rightHealth - leftHealth
            : leftHealth - rightHealth;
        }

        const leftTime = left.createdAt
          ? new Date(left.createdAt).getTime()
          : 0;
        const rightTime = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;

        return sortMode === "created_desc"
          ? rightTime - leftTime
          : leftTime - rightTime;
      });
  }, [healthFilter, projects, searchTerm, sortMode, statusFilter]);

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

  useEffect(
    () =>
      subscribeToApplicationCommandActions((action) => {
        if (
          action.type === "project.create" &&
          canCreateProject &&
          hasSession
        ) {
          setSelectedProject(null);
          setIsProjectModalOpen(true);
        }
      }),
    [canCreateProject, hasSession],
  );

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

  async function handleArchiveProject() {
    if (!projectPendingArchive) {
      return;
    }

    setError(null);
    setIsLifecycleActionSaving(true);
    try {
      await archiveProject(projectPendingArchive.id);
      setProjectPendingArchive(null);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to archive project",
      );
    } finally {
      setIsLifecycleActionSaving(false);
    }
  }

  async function handleRestoreProject() {
    if (!projectPendingRestore) {
      return;
    }

    setError(null);
    setIsLifecycleActionSaving(true);
    try {
      await restoreProject(projectPendingRestore.id);
      setProjectPendingRestore(null);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to restore project",
      );
    } finally {
      setIsLifecycleActionSaving(false);
    }
  }

  async function handlePurgeProject() {
    if (!projectPendingPurge) {
      return;
    }

    setError(null);
    setIsLifecycleActionSaving(true);
    try {
      await purgeProject(projectPendingPurge.id);
      setProjectPendingPurge(null);
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to permanently purge project",
      );
    } finally {
      setIsLifecycleActionSaving(false);
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

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-[1fr_220px_220px_240px]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Search by project name
          </span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              syncProjectFilters({ search: event.target.value })
            }
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
            onChange={(event) =>
              syncProjectFilters({ status: event.target.value })
            }
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {projectFilterStatuses.map((status) => (
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
              syncProjectFilters({
                sort: event.target.value as
                  | "created_asc"
                  | "created_desc"
                  | "health_asc"
                  | "health_desc",
              })
            }
            value={sortMode}
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="health_desc">Health: Red first</option>
            <option value="health_asc">Health: Green first</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Filter by health
          </span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              syncProjectFilters({
                health: event.target.value as "all" | ApiProjectHealthStatus,
              })
            }
            value={healthFilter}
          >
            <option value="all">All health</option>
            <option value="RED">Red</option>
            <option value="AMBER">Amber</option>
            <option value="GREEN">Green</option>
          </select>
        </label>
      </section>

      <ProjectTable
        canArchiveProjects={canArchiveProject}
        canEditProjects={canEditProject}
        canPurgeProjects={canPurgeProject}
        canRestoreProjects={canRestoreProject}
        emptyMessage={
          projects.length === 0
            ? "No projects have been created yet."
            : "No projects match the current filters."
        }
        isLoading={isLoading}
        onArchiveProject={(project) => setProjectPendingArchive(project)}
        onEditProject={openEditProjectModal}
        onPurgeProject={(project) => setProjectPendingPurge(project)}
        onRestoreProject={(project) => setProjectPendingRestore(project)}
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

      {projectPendingArchive ? (
        <AppModal
          description="This hides the project from normal portfolio lists while preserving delivery history and related records."
          footer={
            <>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setProjectPendingArchive(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLifecycleActionSaving}
                onClick={handleArchiveProject}
                type="button"
              >
                {isLifecycleActionSaving ? "Archiving..." : "Archive project"}
              </button>
            </>
          }
          labelledById="archive-project-title"
          onClose={() => setProjectPendingArchive(null)}
          title="Archive project"
          widthClassName="max-w-md"
        >
          <p className="text-sm text-slate-600">
            Confirm archive of{" "}
            <span className="font-semibold text-slate-950">
              {projectPendingArchive.name}
            </span>
            .
          </p>
        </AppModal>
      ) : null}

      {projectPendingRestore ? (
        <AppModal
          description="This restores the project to normal portfolio visibility without changing its related records."
          footer={
            <>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setProjectPendingRestore(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLifecycleActionSaving}
                onClick={handleRestoreProject}
                type="button"
              >
                {isLifecycleActionSaving ? "Restoring..." : "Restore project"}
              </button>
            </>
          }
          labelledById="restore-project-title"
          onClose={() => setProjectPendingRestore(null)}
          title="Restore project"
          widthClassName="max-w-md"
        >
          <p className="text-sm text-slate-600">
            Confirm restore of{" "}
            <span className="font-semibold text-slate-950">
              {projectPendingRestore.name}
            </span>
            .
          </p>
        </AppModal>
      ) : null}

      {projectPendingPurge ? (
        <AppModal
          description="This permanently removes the project and all project-owned records. This action cannot be undone."
          footer={
            <>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setProjectPendingPurge(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLifecycleActionSaving}
                onClick={handlePurgeProject}
                type="button"
              >
                {isLifecycleActionSaving ? "Purging..." : "Permanent purge"}
              </button>
            </>
          }
          labelledById="purge-project-title"
          onClose={() => setProjectPendingPurge(null)}
          title="Permanent purge"
          widthClassName="max-w-md"
        >
          <p className="text-sm text-slate-600">
            Confirm permanent purge of{" "}
            <span className="font-semibold text-slate-950">
              {projectPendingPurge.name}
            </span>
            .
          </p>
        </AppModal>
      ) : null}
    </div>
  );
}

function PageLoading() {
  return <div className="space-y-6" />;
}

function isProjectSortMode(
  value: string | null,
): value is "created_asc" | "created_desc" | "health_asc" | "health_desc" {
  return (
    value === "created_asc" ||
    value === "created_desc" ||
    value === "health_asc" ||
    value === "health_desc"
  );
}

function buildProjectFiltersUrl(
  pathname: string,
  filters: {
    health: "all" | ApiProjectHealthStatus;
    search: string;
    sort: "created_asc" | "created_desc" | "health_asc" | "health_desc";
    status: string;
  },
) {
  const searchParams = new URLSearchParams();
  const trimmedSearch = filters.search.trim();

  if (trimmedSearch) {
    searchParams.set("search", trimmedSearch);
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status);
  }

  if (filters.sort !== "created_desc") {
    searchParams.set("sort", filters.sort);
  }

  if (filters.health !== "all") {
    searchParams.set("health", filters.health);
  }

  const nextSearch = searchParams.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
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
            <span className="text-sm font-medium text-slate-700">
              Description
            </span>
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
