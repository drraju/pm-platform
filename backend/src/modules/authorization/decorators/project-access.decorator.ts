import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { PermissionKey } from '../permissions';

export type ProjectAccessMode = 'read' | 'manage' | 'owner';

export type ProjectAccessPolicy = {
  mode: ProjectAccessMode;
  param?: string;
  bypassPermissions?: PermissionKey[];
  projectRoles?: ProjectRole[];
};

export const PROJECT_ACCESS_KEY = 'projectAccessPolicy';

export function ProjectAccess(policy: ProjectAccessPolicy) {
  return SetMetadata(PROJECT_ACCESS_KEY, policy);
}

