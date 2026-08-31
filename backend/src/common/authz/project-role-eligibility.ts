import { ProjectRole } from '../enums/project-role.enum';
import { UserRole } from '../enums/user-role.enum';

export const INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE =
  'INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE' as const;

const projectManagementRoles = new Set<ProjectRole>([
  ProjectRole.Owner,
  ProjectRole.Manager,
]);

const externalGlobalRoles = new Set<string>([
  UserRole.Customer,
  UserRole.Partner,
]);

export function isExternalProjectRoleEligible(
  projectRole: ProjectRole,
): boolean {
  return !projectManagementRoles.has(projectRole);
}

export function isProjectRoleEligible(
  globalRole: string | null | undefined,
  projectRole: ProjectRole,
): boolean {
  if (!projectManagementRoles.has(projectRole)) {
    return true;
  }

  return !globalRole || !externalGlobalRoles.has(globalRole);
}
