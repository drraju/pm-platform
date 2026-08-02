import type {
  ApiAuthMe,
  ApiProject,
  ApiProjectMember,
  ApiTask,
} from "@/lib/api/client";
import { hasAnyPermission, hasPermission } from "./permissions";

type CapabilityInput = {
  authMe?: ApiAuthMe | null;
  currentUserId?: string | null;
  members?: ApiProjectMember[];
  permissionKeys?: string[];
  project?: Pick<
    ApiProject,
    "businessOwnerId" | "deliveryLeadId" | "executiveSponsorId" | "ownerId"
  > | null;
  roleNames?: string[];
  task?: Pick<ApiTask, "assigneeId"> | null;
};

export type ProjectUiCapabilities = {
  canAccessDailyReview: boolean;
  canEditExecution: boolean;
  canEditPlanning: boolean;
  canManageDocuments: boolean;
  canManageProjectTasks: boolean;
  canReassignTask: boolean;
  canUpdateTask: boolean;
  canUploadDocuments: boolean;
};

const dailyReviewRoles = new Set([
  "PLATFORM_ADMIN",
  "PORTFOLIO_MANAGER",
  "PROJECT_MANAGER",
  "PROGRAM_MANAGER",
  "SUPER_ADMIN",
]);

const projectManagerMembershipRoles = new Set(["owner", "manager"]);

export function resolveProjectUiCapabilities({
  authMe,
  currentUserId = authMe?.user.id ?? null,
  members = [],
  permissionKeys = authMe?.permissions.map((permission) => permission.key) ?? [],
  project = null,
  roleNames = authMe?.roles.map((role) => role.name) ?? [],
  task = null,
}: CapabilityInput): ProjectUiCapabilities {
  const canReadProject = hasPermission(permissionKeys, "project.read");
  const canUpdateProject = hasPermission(permissionKeys, "project.update");
  const canUpdateTasks = hasAnyPermission(permissionKeys, [
    "task.update",
    "task.comment",
    "task.reassign",
  ]);
  const canReassignTasks = hasPermission(permissionKeys, "task.reassign");
  const hasDailyReviewRole = roleNames.some((roleName) =>
    dailyReviewRoles.has(roleName),
  );
  const canManageProject = canUpdateProject && isProjectGovernorOrManager({
    currentUserId,
    members,
    project,
  });
  const canManageProjectTasks = canUpdateTasks && canManageProject;
  const canUpdateOwnTask =
    canUpdateTasks && Boolean(currentUserId) && task?.assigneeId === currentUserId;
  const canUpdateTask = canManageProjectTasks || canUpdateOwnTask;

  return {
    canAccessDailyReview:
      hasDailyReviewRole &&
      canReadProject &&
      hasPermission(permissionKeys, "task.update"),
    canEditExecution: canUpdateTask,
    canEditPlanning: canManageProjectTasks,
    canManageDocuments: canManageProject,
    canManageProjectTasks,
    canReassignTask:
      (canManageProjectTasks || canUpdateOwnTask) && canReassignTasks,
    canUpdateTask,
    canUploadDocuments: canReadProject,
  };
}

function isProjectGovernorOrManager({
  currentUserId,
  members,
  project,
}: Pick<CapabilityInput, "currentUserId" | "members" | "project">) {
  if (!currentUserId) {
    return false;
  }

  if (
    project?.ownerId === currentUserId ||
    project?.businessOwnerId === currentUserId ||
    project?.deliveryLeadId === currentUserId ||
    project?.executiveSponsorId === currentUserId
  ) {
    return true;
  }

  return (members ?? []).some(
    (member) =>
      member.userId === currentUserId &&
      projectManagerMembershipRoles.has(member.role),
  );
}
