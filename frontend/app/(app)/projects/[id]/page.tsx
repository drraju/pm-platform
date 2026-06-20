"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectHealthCard } from "@/components/projects/project-health-card";
import { ProjectWorkspaceBaselines } from "@/components/projects/project-workspace-baselines";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  RaidManagement,
  type RaidMutationInput,
  type RaidType,
} from "@/components/raid/raid-management";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import {
  type ApiAuthMe,
  getAuthMe,
  getStoredPermissionKeys,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import {
  addProjectMember,
  captureProjectBaseline,
  createProjectTask,
  createProjectTaskDependency,
  deleteProjectTask,
  deleteProjectTaskDependency,
  getAssignableUsers,
  getProjectBaseline,
  getProjectBaselines,
  getProject,
  getProjectTaskDependencies,
  removeProjectMember,
  updateProjectTask,
  updateProjectTaskDependency,
  updateProjectMember,
  type ApiProjectBaseline,
  type ApiProjectDetails,
  type ApiProjectMember,
  type ApiTaskDependency,
} from "@/features/projects";
import {
  addRaidComment,
  createRaidItem,
  deleteRaidItem,
  updateRaidItem,
} from "@/features/raid";
import { getRaidPermissions } from "@/features/raid/permissions";
import type { ApiAssignableUser, ApiRaidItem, ApiTask } from "@/lib/api/client";

type WorkspaceTab = "plan" | "baselines" | "team" | RaidType;

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [sessionProfile, setSessionProfile] = useState<ApiAuthMe | null>(null);
  const [taskDependencies, setTaskDependencies] = useState<ApiTaskDependency[]>([]);
  const [projectBaselines, setProjectBaselines] = useState<ApiProjectBaseline[]>([]);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingDependency, setIsSavingDependency] = useState(false);
  const [isSavingBaseline, setIsSavingBaseline] = useState(false);
  const [isSavingRaid, setIsSavingRaid] = useState(false);
  const [planStatusFilter, setPlanStatusFilter] = useState<"all" | ApiTask["status"]>("all");
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<WorkspaceTab>("plan");
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [
          projectDetails,
          userData,
          authMe,
          dependencyData,
          baselineHeaders,
        ] = await Promise.all([
          getProject(projectId),
          getAssignableUsers(),
          getAuthMe(),
          getProjectTaskDependencies(projectId),
          getProjectBaselines(projectId),
        ]);
        const baselineData = await Promise.all(
          baselineHeaders.map(async (baseline) =>
            getProjectBaseline(projectId, baseline.id).catch(() => baseline),
          ),
        );
        storeAuthMe(authMe);
        setProject(projectDetails);
        setSessionProfile(authMe);
        setTaskDependencies(
          dependencyData.map((dependency) =>
            hydrateTaskDependency(dependency, projectDetails.tasks ?? []),
          ),
        );
        setProjectBaselines(baselineData);
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
    actualEndDate?: string | null;
    actualStartDate?: string | null;
    assigneeId?: string | null;
    description?: string | null;
    estimatedHours?: number | null;
    parentTaskId?: string | null;
    percentComplete?: number;
    plannedEndDate?: string | null;
    plannedStartDate?: string | null;
    priority?: string;
    remainingHours?: number | null;
    remarks?: string | null;
    sequenceNumber?: number | null;
    status?: ApiTask["status"];
    taskKind?: ApiTask["taskKind"];
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
      setTaskDependencies((currentDependencies) =>
        currentDependencies.map((dependency) =>
          hydrateTaskDependency(dependency, [
            ...(project?.tasks ?? []),
            hydrateTask(task, project ?? ({ id: projectId } as ApiProjectDetails), users),
          ]),
        ),
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
      actualEndDate?: string | null;
      actualStartDate?: string | null;
      assigneeId?: string | null;
      description?: string | null;
      estimatedHours?: number | null;
      parentTaskId?: string | null;
      percentComplete?: number;
      plannedEndDate?: string | null;
      plannedStartDate?: string | null;
      priority?: string;
      remainingHours?: number | null;
      remarks?: string | null;
      sequenceNumber?: number | null;
      status?: ApiTask["status"];
      taskKind?: ApiTask["taskKind"];
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
      setTaskDependencies((currentDependencies) =>
        currentDependencies.map((dependency) =>
          hydrateTaskDependency(dependency, (project?.tasks ?? []).map((currentTask) =>
            currentTask.id === taskId ? { ...currentTask, ...task } : currentTask,
          )),
        ),
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
      setTaskDependencies((currentDependencies) =>
        currentDependencies.filter(
          (dependency) =>
            dependency.predecessorTaskId !== taskId &&
            dependency.successorTaskId !== taskId,
        ),
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

  async function handleCreateDependency(input: {
    dependencyType: ApiTaskDependency["dependencyType"];
    lagDays?: number;
    predecessorTaskId: string;
    successorTaskId: string;
  }) {
    setError(null);
    setIsSavingDependency(true);
    try {
      const dependency = await createProjectTaskDependency(projectId, input);
      setTaskDependencies((currentDependencies) => [
        ...currentDependencies,
        hydrateTaskDependency(dependency, project?.tasks ?? []),
      ]);
      showToast(setToast, "success", "Dependency created.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to create dependency.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create dependency",
      );
    } finally {
      setIsSavingDependency(false);
    }
  }

  async function handleUpdateDependency(
    dependencyId: string,
    input: {
      dependencyType: ApiTaskDependency["dependencyType"];
      lagDays?: number;
      predecessorTaskId: string;
      successorTaskId: string;
    },
  ) {
    setError(null);
    setIsSavingDependency(true);
    try {
      const dependency = await updateProjectTaskDependency(projectId, dependencyId, input);
      setTaskDependencies((currentDependencies) =>
        currentDependencies.map((currentDependency) =>
          currentDependency.id === dependencyId
            ? hydrateTaskDependency(
                { ...currentDependency, ...dependency },
                project?.tasks ?? [],
              )
            : currentDependency,
        ),
      );
      showToast(setToast, "success", "Dependency updated.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to update dependency.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update dependency",
      );
    } finally {
      setIsSavingDependency(false);
    }
  }

  async function handleDeleteDependency(dependencyId: string) {
    setError(null);
    setIsSavingDependency(true);
    try {
      await deleteProjectTaskDependency(projectId, dependencyId);
      setTaskDependencies((currentDependencies) =>
        currentDependencies.filter(
          (currentDependency) => currentDependency.id !== dependencyId,
        ),
      );
      showToast(setToast, "success", "Dependency deleted.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to delete dependency.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete dependency",
      );
    } finally {
      setIsSavingDependency(false);
    }
  }

  async function handleCaptureBaseline(input: {
    name: string;
    setAsCurrent?: boolean;
    status?: string;
  }) {
    setError(null);
    setIsSavingBaseline(true);
    try {
      const baseline = await captureProjectBaseline(projectId, input);
      const baselineDetail = await getProjectBaseline(projectId, baseline.id);
      setProjectBaselines((currentBaselines) => {
        const nextBaselines = input.setAsCurrent
          ? currentBaselines.map((currentBaseline) => ({
              ...currentBaseline,
              isCurrent: false,
              status:
                currentBaseline.isCurrent && currentBaseline.status === "approved"
                  ? "superseded"
                  : currentBaseline.status,
            }))
          : currentBaselines;

        return [baselineDetail, ...nextBaselines];
      });
      setActiveWorkspaceTab("baselines");
      showToast(setToast, "success", "Baseline captured.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to capture baseline.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to capture baseline",
      );
    } finally {
      setIsSavingBaseline(false);
    }
  }

  async function handleCreateRaidItem(input: RaidMutationInput) {
    setError(null);
    setIsSavingRaid(true);
    try {
      const item = await createRaidItem({ ...input, projectId });
      setProject((currentProject) =>
        currentProject ? appendRaidItem(currentProject, hydrateRaidItem(item)) : currentProject,
      );
      showToast(setToast, "success", "RAID item created.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to create RAID item.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create RAID item",
      );
    } finally {
      setIsSavingRaid(false);
    }
  }

  async function handleUpdateRaidItem(
    itemId: string,
    input: Partial<RaidMutationInput>,
  ) {
    setError(null);
    setIsSavingRaid(true);
    try {
      const item = await updateRaidItem(itemId, input);
      setProject((currentProject) =>
        currentProject
          ? replaceRaidItem(currentProject, hydrateRaidItem(item))
          : currentProject,
      );
      showToast(setToast, "success", "RAID item updated.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to update RAID item.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update RAID item",
      );
    } finally {
      setIsSavingRaid(false);
    }
  }

  async function handleDeleteRaidItem(itemId: string) {
    setError(null);
    setIsSavingRaid(true);
    try {
      await deleteRaidItem(itemId);
      setProject((currentProject) =>
        currentProject ? removeRaidItem(currentProject, itemId) : currentProject,
      );
      showToast(setToast, "success", "RAID item deleted.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to delete RAID item.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete RAID item",
      );
    } finally {
      setIsSavingRaid(false);
    }
  }

  async function handleAddRaidComment(itemId: string, body: string) {
    setError(null);
    setIsSavingRaid(true);
    try {
      const item = await addRaidComment(itemId, { body });
      setProject((currentProject) =>
        currentProject
          ? replaceRaidItem(currentProject, hydrateRaidItem(item))
          : currentProject,
      );
      showToast(setToast, "success", "RAID comment added.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to add RAID comment.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add RAID comment",
      );
    } finally {
      setIsSavingRaid(false);
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
  const permissions = getProjectWorkspacePermissions({
    authMe: sessionProfile,
    permissionKeys,
    project,
  });
  const raidPermissions = getRaidPermissions(permissionKeys, sessionProfile?.user.id);
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

      <ProjectWorkspaceSummary
        onSelectMetric={(status) => {
          setActiveWorkspaceTab("plan");
          setPlanStatusFilter(status);
        }}
        tasks={tasks}
      />

      <section className="rounded-md border border-slate-200 bg-white p-2 shadow-soft">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
          <WorkspaceTabButton
            active={activeWorkspaceTab === "plan"}
            count={tasks.length}
            label="Plan"
            onClick={() => setActiveWorkspaceTab("plan")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "baselines"}
            count={projectBaselines.length}
            label="Baselines"
            onClick={() => setActiveWorkspaceTab("baselines")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "team"}
            count={members.length}
            label="Project Team"
            onClick={() => setActiveWorkspaceTab("team")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "risk"}
            count={risks.length}
            label="Risks"
            onClick={() => setActiveWorkspaceTab("risk")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "issue"}
            count={issues.length}
            label="Issues"
            onClick={() => setActiveWorkspaceTab("issue")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "assumption"}
            count={assumptions.length}
            label="Assumptions"
            onClick={() => setActiveWorkspaceTab("assumption")}
          />
          <WorkspaceTabButton
            active={activeWorkspaceTab === "dependency"}
            count={dependencies.length}
            label="Dependencies"
            onClick={() => setActiveWorkspaceTab("dependency")}
          />
        </div>
        <div className="p-3">
          {activeWorkspaceTab === "plan" ? (
            <ProjectWorkspaceTasks
              canManageDependencies={permissions.canManageDependencies}
              canCreateTasks={permissions.canCreateTasks}
              canDeleteTasks={permissions.canDeleteTasks}
              canEditTasks={permissions.canEditTasks}
              canManageTasks={permissions.canEditTasks}
              canReassignTasks={permissions.canReassignTasks}
              currentUserId={sessionProfile?.user.id ?? null}
              dependencies={taskDependencies}
              isSaving={isSavingTask || isSavingDependency}
              members={members}
              onCreateDependency={
                permissions.canManageDependencies ? handleCreateDependency : undefined
              }
              onCreateTask={
                permissions.canCreateTasks ? handleCreateTask : undefined
              }
              onDeleteDependency={
                permissions.canManageDependencies ? handleDeleteDependency : undefined
              }
              onDeleteTask={
                permissions.canDeleteTasks ? handleDeleteTask : undefined
              }
              onUpdateDependency={
                permissions.canManageDependencies ? handleUpdateDependency : undefined
              }
              onUpdateTask={
                permissions.canEditTasks ||
                permissions.canReassignTasks ||
                permissions.canUpdateAssignedTasks
                  ? handleUpdateTask
                  : undefined
              }
              statusFilter={planStatusFilter}
              tasks={tasks}
            />
          ) : null}
          {activeWorkspaceTab === "baselines" ? (
            <ProjectWorkspaceBaselines
              baselines={projectBaselines}
              canCaptureBaseline={permissions.canCaptureBaseline}
              currentTasks={tasks}
              isSaving={isSavingBaseline}
              onCaptureBaseline={
                permissions.canCaptureBaseline ? handleCaptureBaseline : undefined
              }
            />
          ) : null}
          {activeWorkspaceTab === "team" ? (
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
          ) : null}
          {activeWorkspaceTab === "risk" ? (
            <RaidManagement
              emptyMessage="No risks yet."
              fixedProjectId={projectId}
              fixedType="risk"
              isSaving={isSavingRaid}
              items={risks}
              onAddComment={
                raidPermissions.canUpdate ? handleAddRaidComment : undefined
              }
              onCreate={raidPermissions.canCreate ? handleCreateRaidItem : undefined}
              onDelete={raidPermissions.canDelete ? handleDeleteRaidItem : undefined}
              onUpdate={raidPermissions.canUpdate ? handleUpdateRaidItem : undefined}
              permissions={raidPermissions}
              projects={[project]}
              title="Risks"
              users={users}
            />
          ) : null}
          {activeWorkspaceTab === "issue" ? (
            <RaidManagement
              emptyMessage="No issues yet."
              fixedProjectId={projectId}
              fixedType="issue"
              isSaving={isSavingRaid}
              items={issues}
              onAddComment={
                raidPermissions.canUpdate ? handleAddRaidComment : undefined
              }
              onCreate={raidPermissions.canCreate ? handleCreateRaidItem : undefined}
              onDelete={raidPermissions.canDelete ? handleDeleteRaidItem : undefined}
              onUpdate={raidPermissions.canUpdate ? handleUpdateRaidItem : undefined}
              permissions={raidPermissions}
              projects={[project]}
              title="Issues"
              users={users}
            />
          ) : null}
          {activeWorkspaceTab === "assumption" ? (
            <RaidManagement
              emptyMessage="No assumptions yet."
              fixedProjectId={projectId}
              fixedType="assumption"
              isSaving={isSavingRaid}
              items={assumptions}
              onAddComment={
                raidPermissions.canUpdate ? handleAddRaidComment : undefined
              }
              onCreate={raidPermissions.canCreate ? handleCreateRaidItem : undefined}
              onDelete={raidPermissions.canDelete ? handleDeleteRaidItem : undefined}
              onUpdate={raidPermissions.canUpdate ? handleUpdateRaidItem : undefined}
              permissions={raidPermissions}
              projects={[project]}
              title="Assumptions"
              users={users}
            />
          ) : null}
          {activeWorkspaceTab === "dependency" ? (
            <RaidManagement
              emptyMessage="No dependencies yet."
              fixedProjectId={projectId}
              fixedType="dependency"
              isSaving={isSavingRaid}
              items={dependencies}
              onAddComment={
                raidPermissions.canUpdate ? handleAddRaidComment : undefined
              }
              onCreate={raidPermissions.canCreate ? handleCreateRaidItem : undefined}
              onDelete={raidPermissions.canDelete ? handleDeleteRaidItem : undefined}
              onUpdate={raidPermissions.canUpdate ? handleUpdateRaidItem : undefined}
              permissions={raidPermissions}
              projects={[project]}
              title="Dependencies"
              users={users}
            />
          ) : null}
        </div>
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
  authMe,
  permissionKeys,
  project,
}: {
  authMe: ApiAuthMe | null;
  permissionKeys: string[];
  project: ApiProjectDetails;
}) {
  const roleNames = new Set(
    authMe?.roles.map((role) => role.name).filter(Boolean) ?? [],
  );
  const isPlanningManager =
    roleNames.has("Program Manager") ||
    roleNames.has("Project Manager") ||
    roleNames.has("Delivery Lead") ||
    authMe?.user.id === project.ownerId ||
    authMe?.user.id === project.deliveryLeadId;
  const canCreateTasks =
    hasPermission(permissionKeys, "task.create") && isPlanningManager;
  const canDeleteTasks =
    hasPermission(permissionKeys, "task.delete") && isPlanningManager;
  const canEditTasks =
    hasPermission(permissionKeys, "task.update") && isPlanningManager;
  const canReassignTasks =
    hasPermission(permissionKeys, "task.reassign") && isPlanningManager;
  const canManageDependencies =
    hasPermission(permissionKeys, "task.update") && isPlanningManager;
  const canCaptureBaseline =
    hasPermission(permissionKeys, "project.update") && isPlanningManager;
  const canManageTeam = hasPermission(permissionKeys, "project.team.manage");

  return {
    canCaptureBaseline,
    canCreateTasks,
    canDeleteTasks,
    canEditTasks,
    canManageDependencies,
    canReassignTasks,
    canManageTeam,
    canUpdateAssignedTasks:
      hasPermission(permissionKeys, "task.update") ||
      hasPermission(permissionKeys, "task.comment"),
  };
}

function hydrateTaskDependency(
  dependency: ApiTaskDependency,
  tasks: ApiTask[],
): ApiTaskDependency {
  return {
    ...dependency,
    predecessorTask:
      tasks.find((task) => task.id === dependency.predecessorTaskId) ??
      dependency.predecessorTask,
    successorTask:
      tasks.find((task) => task.id === dependency.successorTaskId) ??
      dependency.successorTask,
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

function hydrateRaidItem(item: ApiRaidItem): ApiRaidItem {
  return item;
}

function appendRaidItem(project: ApiProjectDetails, item: ApiRaidItem) {
  const collectionKey = getRaidCollectionKey(item.type);
  return {
    ...project,
    [collectionKey]: [...(project[collectionKey] ?? []), item],
  };
}

function replaceRaidItem(project: ApiProjectDetails, item: ApiRaidItem) {
  const collectionKey = getRaidCollectionKey(item.type);
  return {
    ...project,
    [collectionKey]: (project[collectionKey] ?? []).map((currentItem) =>
      currentItem.id === item.id ? { ...currentItem, ...item } : currentItem,
    ),
  };
}

function removeRaidItem(project: ApiProjectDetails, itemId: string) {
  return {
    ...project,
    risks: (project.risks ?? []).filter((item) => item.id !== itemId),
    issues: (project.issues ?? []).filter((item) => item.id !== itemId),
    assumptions: (project.assumptions ?? []).filter((item) => item.id !== itemId),
    dependencies: (project.dependencies ?? []).filter((item) => item.id !== itemId),
  };
}

function getRaidCollectionKey(type: RaidType) {
  switch (type) {
    case "risk":
      return "risks";
    case "issue":
      return "issues";
    case "assumption":
      return "assumptions";
    case "dependency":
      return "dependencies";
  }
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
