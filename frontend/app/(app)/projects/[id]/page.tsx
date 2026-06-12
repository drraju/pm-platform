"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectHealthCard } from "@/components/projects/project-health-card";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  formatRaidDate,
  formatRaidLabel,
  formatRaidOwner,
  ProjectWorkspaceRegisterSection,
} from "@/components/projects/project-workspace-register-section";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import {
  getAuthMe,
  getStoredPermissionKeys,
  getStoredSessionUser,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import {
  addProjectMember,
  createProjectTask,
  deleteProjectTask,
  getAssignableUsers,
  getProject,
  removeProjectMember,
  updateProjectTask,
  updateProjectMember,
  type ApiProjectDetails,
  type ApiProjectMember,
} from "@/features/projects";
import type { ApiAssignableUser, ApiTask } from "@/lib/api/client";

type WorkspaceTab = "tasks" | "team";

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<WorkspaceTab>("tasks");
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [projectDetails, userData, authMe] = await Promise.all([
          getProject(projectId),
          getAssignableUsers(),
          getAuthMe(),
        ]);
        storeAuthMe(authMe);
        setProject(projectDetails);
        setUsers(userData);
        setPermissionKeys(authMe.permissions.map((permission) => permission.key));
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

    void loadProject();
  }, [projectId]);

  async function handleAddMember(input: { role: string; userId: string }) {
    setError(null);
    setIsSavingTeam(true);
    try {
      const member = await addProjectMember(projectId, input);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              members: [...(currentProject.members ?? []), member],
            }
          : currentProject,
      );
      showToast(setToast, "success", "Team member added.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to add member.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add member",
      );
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function handleUpdateMember(
    memberId: string,
    input: { role: string },
  ) {
    setError(null);
    setIsSavingTeam(true);
    try {
      const updatedMember = await updateProjectMember(projectId, memberId, input);
      setProject((currentProject) =>
        replaceMember(currentProject, updatedMember),
      );
      showToast(setToast, "success", "Team member role updated.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to update member.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update member",
      );
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setError(null);
    setIsSavingTeam(true);
    try {
      await removeProjectMember(projectId, memberId);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              members: (currentProject.members ?? []).filter(
                (member) => member.id !== memberId,
              ),
            }
          : currentProject,
      );
      showToast(setToast, "success", "Team member removed.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to remove member.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove member",
      );
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function handleCreateTask(input: {
    assigneeId?: string;
    description?: string;
    dueDate?: string;
    percentComplete?: number;
    plannedEndDate?: string;
    plannedStartDate?: string;
    priority?: string;
    remarks?: string;
    status?: ApiTask["status"];
    title: string;
  }) {
    setError(null);
    setIsSavingTask(true);
    try {
      const task = await createProjectTask(projectId, input);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              tasks: [
                ...(currentProject.tasks ?? []),
                hydrateTask(task, currentProject, users),
              ],
            }
          : currentProject,
      );
      showToast(setToast, "success", "Task created.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to create task.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUpdateTask(
    taskId: string,
    input: {
      assigneeId?: string;
      description?: string;
      dueDate?: string;
      percentComplete?: number;
      plannedEndDate?: string;
      plannedStartDate?: string;
      priority?: string;
      remarks?: string;
      status?: ApiTask["status"];
      title?: string;
    },
  ) {
    setError(null);
    setIsSavingTask(true);
    try {
      const task = await updateProjectTask(projectId, taskId, input);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              tasks: (currentProject.tasks ?? []).map((currentTask) =>
                currentTask.id === taskId
                  ? hydrateTask({ ...currentTask, ...task }, currentProject, users)
                  : currentTask,
              ),
            }
          : currentProject,
      );
      showToast(setToast, "success", "Task updated.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to update task.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    setError(null);
    setIsSavingTask(true);
    try {
      await deleteProjectTask(projectId, taskId);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              tasks: (currentProject.tasks ?? []).filter(
                (task) => task.id !== taskId,
              ),
            }
          : currentProject,
      );
      showToast(setToast, "success", "Task deleted.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to delete task.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete task",
      );
    } finally {
      setIsSavingTask(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Loading project workspace details."
          eyebrow="Project workspace"
          title="Project"
        />
        <ProjectWorkspaceLoadingState />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="The requested project workspace could not be loaded."
          eyebrow="Project workspace"
          title="Project not found"
        />
        {error ? <ErrorMessage message={error} /> : null}
        <Link className="text-sm font-semibold text-brand" href="/projects">
          Back to projects
        </Link>
      </div>
    );
  }

  const members = project.members ?? [];
  const tasks = project.tasks ?? [];
  const risks = project.risks ?? [];
  const issues = project.issues ?? [];
  const assumptions = project.assumptions ?? [];
  const dependencies = project.dependencies ?? [];
  const sessionUser = getStoredSessionUser();
  const permissions = getProjectWorkspacePermissions({
    permissionKeys,
  });
  const health = project.health ?? {
    reasons: ['No critical issues, high risks, or overdue task threshold breaches'],
    status: "GREEN" as const,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description={project.description || "No project description has been added."}
        eyebrow="Project workspace"
        title={project.name}
      />

      {error ? <ErrorMessage message={error} /> : null}
      {toast ? <ToastMessage toast={toast} /> : null}

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <ProjectWorkspaceOverview project={project} />
        <ProjectHealthCard health={health} />
      </section>

      <ProjectWorkspaceSummary tasks={tasks} />

      <section className="rounded-md border border-slate-200 bg-white p-2 shadow-soft">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
          <WorkspaceTabButton
            active={activeWorkspaceTab === "tasks"}
            count={tasks.length}
            label="Tasks"
            onClick={() => setActiveWorkspaceTab("tasks")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "team"}
            count={members.length}
            label="Project Team"
            onClick={() => setActiveWorkspaceTab("team")}
          />
        </div>
        <div className="p-3">
          {activeWorkspaceTab === "tasks" ? (
            <ProjectWorkspaceTasks
              canCreateTasks={permissions.canCreateTasks}
              canDeleteTasks={permissions.canDeleteTasks}
              canEditTasks={permissions.canEditTasks}
              canReassignTasks={permissions.canReassignTasks}
              currentUserId={sessionUser?.userId}
              isSaving={isSavingTask}
              members={members}
              onCreateTask={
                permissions.canCreateTasks ? handleCreateTask : undefined
              }
              onDeleteTask={
                permissions.canDeleteTasks ? handleDeleteTask : undefined
              }
              onUpdateTask={
                permissions.canEditTasks ||
                permissions.canReassignTasks ||
                permissions.canUpdateAssignedTasks
                  ? handleUpdateTask
                  : undefined
              }
              tasks={tasks}
            />
          ) : (
            <ProjectWorkspaceTeam
              availableUsers={users}
              isSaving={isSavingTeam}
              members={members}
              onAddMember={
                permissions.canManageTeam ? handleAddMember : undefined
              }
              onRemoveMember={
                permissions.canManageTeam ? handleRemoveMember : undefined
              }
              onUpdateMember={
                permissions.canManageTeam ? handleUpdateMember : undefined
              }
            />
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (risk) => risk.title },
            { header: "Status", render: (risk) => formatRaidLabel(risk.status) },
            {
              header: "Probability",
              render: (risk) => formatRaidLabel(risk.probability),
            },
            { header: "Impact", render: (risk) => formatRaidLabel(risk.impact) },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Project risks with ownership and current status."
          emptyMessage="No risks yet."
          items={risks}
          title="Risks"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (issue) => issue.title },
            {
              header: "Status",
              render: (issue) => formatRaidLabel(issue.status),
            },
            {
              header: "Severity",
              render: (issue) => formatRaidLabel(issue.severity),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Open and tracked issues affecting delivery."
          emptyMessage="No issues yet."
          items={issues}
          title="Issues"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (assumption) => assumption.title },
            {
              header: "Status",
              render: (assumption) => formatRaidLabel(assumption.status),
            },
            {
              header: "Validation Status",
              render: (assumption) => formatRaidLabel(assumption.validationStatus),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Delivery assumptions and their validation state."
          emptyMessage="No assumptions yet."
          items={assumptions}
          title="Assumptions"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (dependency) => dependency.title },
            {
              header: "Status",
              render: (dependency) => formatRaidLabel(dependency.status),
            },
            {
              header: "Depends On",
              render: (dependency) => dependency.dependsOn ?? "Not set",
            },
            {
              header: "Due Date",
              render: (dependency) => formatRaidDate(dependency.dueDate),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Internal and external dependencies for the project."
          emptyMessage="No dependencies yet."
          items={dependencies}
          title="Dependencies"
        />
      </section>
    </div>
  );
}

function WorkspaceTabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-brand text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label} <span className="ml-1 opacity-80">{count}</span>
    </button>
  );
}

function getProjectWorkspacePermissions({
  permissionKeys,
}: {
  permissionKeys: string[];
}) {
  const canCreateTasks = hasPermission(permissionKeys, "task.create");
  const canDeleteTasks = hasPermission(permissionKeys, "task.delete");
  const canEditTasks = hasPermission(permissionKeys, "task.update");
  const canReassignTasks = hasPermission(permissionKeys, "task.reassign");
  const canManageTeam = hasPermission(permissionKeys, "project.team.manage");

  return {
    canCreateTasks,
    canDeleteTasks,
    canEditTasks,
    canReassignTasks,
    canManageTeam,
    canUpdateAssignedTasks:
      hasPermission(permissionKeys, "task.update") ||
      hasPermission(permissionKeys, "task.comment"),
  };
}

function hydrateTask(
  task: ApiTask,
  project: ApiProjectDetails,
  users: ApiAssignableUser[],
): ApiTask {
  const assignee = task.assigneeId
    ? users.find((user) => user.id === task.assigneeId) ?? task.assignee
    : null;

  return {
    ...task,
    assignee,
    project,
  };
}

function replaceMember(
  project: ApiProjectDetails | null,
  updatedMember: ApiProjectMember,
) {
  if (!project) {
    return project;
  }

  return {
    ...project,
    members: (project.members ?? []).map((member) =>
      member.id === updatedMember.id ? updatedMember : member,
    ),
  };
}

function ProjectWorkspaceLoadingState() {
  return (
    <div className="space-y-6">
      <section className="h-40 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
        <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
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
