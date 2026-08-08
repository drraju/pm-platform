import type {
  ApiAuthMe,
  ApiProject,
  ApiProjectDocument,
  ApiProjectMember,
  ApiTask,
} from "@/lib/api/client";
import { hasAnyPermission, hasPermission } from "./permissions";

type CapabilityInput = {
  authMe?: ApiAuthMe | null;
  currentUserId?: string | null;
  document?: Pick<ApiProjectDocument, "createdById" | "ownerId"> | null;
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
  canAccessDelivery: boolean;
  canAccessGovern: boolean;
  canAccessPlanning: boolean;
  /** Same leadership/contributor gate used by Today nav/tabs. */
  canAccessToday: boolean;
  canApproveDocuments: boolean;
  canContributeDocuments: boolean;
  canEditDocument: boolean;
  canEditExecution: boolean;
  canEditPlanning: boolean;
  canExecuteAssignedTask: boolean;
  canManageDocuments: boolean;
  canManageProjectTasks: boolean;
  canManageTeam: boolean;
  canReassignTask: boolean;
  canUpdateTask: boolean;
  canUploadDocuments: boolean;
};

/**
 * Stand-up leadership roles (Daily Review / full project stand-up).
 * Delivery Lead maps to PROJECT_MANAGER in RBAC consolidation.
 */
const standupLeadershipRoles = new Set([
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
  document = null,
  members = [],
  permissionKeys = authMe?.permissions.map((permission) => permission.key) ?? [],
  project = null,
  roleNames = authMe?.roles.map((role) => role.name) ?? [],
  task = null,
}: CapabilityInput): ProjectUiCapabilities {
  const canReadProject = hasPermission(permissionKeys, "project.read");
  const canUpdateProject = hasPermission(permissionKeys, "project.update");
  const canManageTeamPermission = hasPermission(
    permissionKeys,
    "project.team.manage",
  );
  const canUpdateTasks = hasAnyPermission(permissionKeys, [
    "task.update",
    "task.comment",
    "task.reassign",
  ]);
  const canReassignTasks = hasPermission(permissionKeys, "task.reassign");
  const hasStandupLeadershipRole = roleNames.some((roleName) =>
    standupLeadershipRoles.has(normalizeRoleName(roleName)),
  );
  const canManageProject =
    canUpdateProject &&
    isProjectGovernorOrManager({
      currentUserId,
      members,
      project,
    });
  const canManageProjectTasks = canUpdateTasks && canManageProject;
  const canUpdateOwnTask =
    canUpdateTasks &&
    Boolean(currentUserId) &&
    task?.assigneeId === currentUserId;
  const canUpdateTask = canManageProjectTasks || canUpdateOwnTask;
  const canExecuteWork =
    canReadProject && hasPermission(permissionKeys, "task.update");
  const canAccessToday = canExecuteWork;
  const canAccessDailyReview = hasStandupLeadershipRole && canExecuteWork;
  const canAccessDelivery = canExecuteWork;
  // Nav uses permission keys so tabs work before project membership hydrates.
  // Mutation paths still require canManageProject / assigned-task elevation.
  const canAccessPlanning =
    canUpdateProject && canUpdateTasks;
  const canAccessGovern =
    canUpdateProject &&
    hasAnyPermission(permissionKeys, [
      "raid.create",
      "raid.update",
      "raid.delete",
      "raid.read",
    ]);
  const canContributeDocuments = canReadProject;
  const ownsDocument =
    Boolean(currentUserId) &&
    Boolean(document) &&
    (document?.ownerId === currentUserId ||
      document?.createdById === currentUserId);

  return {
    canAccessDailyReview,
    canAccessDelivery,
    canAccessGovern,
    canAccessPlanning,
    canAccessToday,
    canApproveDocuments: canManageProject,
    canContributeDocuments,
    canEditDocument: canManageProject || (canContributeDocuments && ownsDocument),
    canEditExecution: canUpdateTask,
    canEditPlanning: canManageProjectTasks,
    canExecuteAssignedTask: canUpdateOwnTask || canManageProjectTasks,
    canManageDocuments: canManageProject,
    canManageProjectTasks,
    canManageTeam: canManageTeamPermission && canManageProject,
    canReassignTask:
      (canManageProjectTasks || canUpdateOwnTask) && canReassignTasks,
    canUpdateTask,
    canUploadDocuments: canContributeDocuments,
  };
}

function normalizeRoleName(roleName: string) {
  return roleName.trim().toUpperCase().replace(/[\s-]+/g, "_");
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
