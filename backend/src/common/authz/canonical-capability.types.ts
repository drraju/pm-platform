import { AuthorizationActor } from './authorization-policy.service';

export const CANONICAL_CAPABILITIES = [
  'project.view',
  'project.create',
  'project.edit_metadata',
  'project.manage_team',
  'project.archive',
  'project.restore',
  'project.purge',
  'project.export',
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
  'document.view',
  'document.create',
  'document.edit',
  'document.approve',
  'document.move',
  'document.delete',
  'raid.view',
  'raid.create',
  'raid.update',
  'raid.comment',
  'raid.delete',
  'portfolio.view',
  'ai.execute',
] as const;

export type CanonicalCapability = (typeof CANONICAL_CAPABILITIES)[number];

export type CapabilityReasonCode =
  | 'GRANTED'
  | 'MISSING_PERMISSION'
  | 'PROJECT_MEMBERSHIP_REQUIRED'
  | 'TARGET_NOT_PROJECT_MEMBER'
  | 'OUTSIDE_PROJECT_SCOPE'
  | 'EXTERNAL_RESTRICTED'
  | 'ASSIGNMENT_REQUIRED'
  | 'OWNERSHIP_REQUIRED'
  | 'PROJECT_MANAGEMENT_REQUIRED'
  | 'OBJECT_STATE_RESTRICTED'
  | 'FIELD_RESTRICTED'
  | 'SOURCE_SCOPE_DENIED'
  | 'DESTINATION_SCOPE_DENIED'
  | 'NOT_YET_MIGRATED';

export type CapabilityAudience = 'internal' | 'external';

export type CapabilityResource =
  | { type: 'portfolio' }
  | { type: 'ai'; projectId?: string | null }
  | {
      type: 'project';
      projectId?: string | null;
      status?: string | null;
    }
  | {
      type: 'task';
      projectId: string;
      assigneeId?: string | null;
      deletedAt?: Date | string | null;
      projectStatus?: string | null;
      status?: string | null;
      taskKind?: string | null;
    }
  | {
      type: 'forecast';
      projectId: string;
      projectStatus?: string | null;
    }
  | {
      type: 'document';
      projectId: string;
      approvalStatus?: string | null;
      createdById?: string | null;
      ownerId?: string | null;
    }
  | {
      type: 'raid';
      projectId: string;
      ownerId?: string | null;
    };

export type CapabilityResolverInput = {
  actor: AuthorizationActor;
  capability: CanonicalCapability;
  resource: CapabilityResource;
  changedFields?: readonly string[];
  destinationProjectId?: string | null;
  requestedAssigneeId?: string | null;
};

export type TaskCapabilityResource = Extract<
  CapabilityResource,
  { type: 'task' }
>;

export type TaskAssignmentOperation = 'assign' | 'reassign' | 'none';

export type TaskAssignmentResolverInput = {
  actor: AuthorizationActor;
  resource: TaskCapabilityResource;
  requestedAssigneeId: string | null;
};

export type TaskAssignmentDecision = CapabilityDecision & {
  capability: 'task.assign' | 'task.reassign' | null;
  operation: TaskAssignmentOperation;
};

export type CapabilityScopeDecision = {
  scope: 'source' | 'destination';
  allowed: boolean;
  reasonCode: CapabilityReasonCode;
};

export type CapabilityDecision = {
  allowed: boolean;
  reasonCode: CapabilityReasonCode;
  audience: CapabilityAudience;
  editableFields?: readonly string[];
  projection?: readonly string[];
  scopeDecisions?: readonly CapabilityScopeDecision[];
};

export type ShadowCapabilityComparisonInput = {
  legacyAllowed: boolean;
  resolverInput: CapabilityResolverInput;
  enabled?: boolean;
};
