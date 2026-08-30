import { ProjectRole } from '../enums/project-role.enum';
import { CanonicalCapability } from './canonical-capability.types';

const projectTaskManagementCapabilities = [
  'task.view',
  'task.create',
  'task.edit_plan',
  'task.edit_execution',
  'task.record_update',
  'task.assign',
  'task.reassign',
  'task.complete',
  'task.move',
  'task.delete',
  'forecast.read',
] as const satisfies readonly CanonicalCapability[];

const projectReadCapabilities = [
  'task.view',
  'forecast.read',
] as const satisfies readonly CanonicalCapability[];

export const PROJECT_ROLE_CAPABILITIES: Readonly<
  Record<ProjectRole, ReadonlySet<CanonicalCapability>>
> = Object.freeze({
  [ProjectRole.Owner]: new Set(projectTaskManagementCapabilities),
  [ProjectRole.Manager]: new Set(projectTaskManagementCapabilities),
  [ProjectRole.Contributor]: new Set(projectReadCapabilities),
  [ProjectRole.Viewer]: new Set(projectReadCapabilities),
});

export const CONTRIBUTOR_TASK_EXECUTION_FIELDS = Object.freeze([
  'remarks',
  'percentComplete',
  'status',
] as const);

export const CONTRIBUTOR_EXECUTION_UPDATE_FIELDS = Object.freeze([
  'nextActionOwnerId',
  'nextStep',
  'percentComplete',
  'priority',
  'status',
  'targetCompletionDate',
  'updateNotes',
] as const);

export function projectRoleGrantsCapability(
  role: ProjectRole,
  capability: CanonicalCapability,
): boolean {
  return PROJECT_ROLE_CAPABILITIES[role].has(capability);
}
