import { Injectable, Logger } from '@nestjs/common';
import { ProjectRole } from '../enums/project-role.enum';
import { UserRole } from '../enums/user-role.enum';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from './authorization-policy.service';
import {
  CapabilityAudience,
  CanonicalCapability,
  CapabilityDecision,
  CapabilityReasonCode,
  CapabilityResolverInput,
  ShadowCapabilityComparisonInput,
  TaskAssignmentDecision,
  TaskAssignmentOperation,
  TaskAssignmentResolverInput,
  TaskCapabilityResource,
} from './canonical-capability.types';
import { PermissionKey } from './permissions';
import {
  CONTRIBUTOR_EXECUTION_UPDATE_FIELDS,
  CONTRIBUTOR_TASK_EXECUTION_FIELDS,
  projectRoleGrantsCapability,
} from './project-role-capabilities';
import {
  INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE,
  isExternalProjectRoleEligible,
} from './project-role-eligibility';

const contributorContextualCapabilities = new Set([
  'task.edit_execution',
  'task.record_update',
  'task.complete',
  'task.reassign',
]);

const taskCapabilities = new Set([
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
]);

const projectMutationCapabilities: ReadonlySet<CanonicalCapability> = new Set([
  'project.create',
  'project.edit_metadata',
  'project.manage_team',
  'project.archive',
  'project.restore',
  'project.purge',
  'task.create',
  'task.edit_plan',
  'task.edit_execution',
  'task.record_update',
  'task.assign',
  'task.reassign',
  'task.complete',
  'task.move',
  'task.delete',
  'document.create',
  'document.edit',
  'document.approve',
  'document.move',
  'document.delete',
  'raid.create',
  'raid.update',
  'raid.comment',
  'raid.delete',
]);

const summaryTaskRestrictedCapabilities = new Set([
  'task.edit_execution',
  'task.record_update',
  'task.assign',
  'task.reassign',
  'task.complete',
]);

@Injectable()
export class CanonicalCapabilityResolverService {
  private readonly logger = new Logger(CanonicalCapabilityResolverService.name);

  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async resolve(input: CapabilityResolverInput): Promise<CapabilityDecision> {
    const mutationDenied =
      projectMutationCapabilities.has(input.capability) &&
      !(await this.authorizationPolicyService.canMutateProjectDomain(
        input.actor,
      ));
    const audience = await this.resolveAudience(input.actor);

    if (mutationDenied) {
      return this.deny(audience, 'MISSING_PERMISSION');
    }

    if (taskCapabilities.has(input.capability)) {
      return this.resolveTaskCapability(input, audience);
    }

    switch (input.capability) {
      case 'project.view':
        return this.resolveProjectView(input.actor, input.resource, audience);

      case 'project.create':
        return this.permissionDecision(
          input.actor,
          PermissionKey.ProjectCreate,
          audience,
        );

      case 'project.edit_metadata':
        return this.resolveProjectManagement(
          input.actor,
          input.resource,
          audience,
          PermissionKey.ProjectUpdate,
        );

      case 'forecast.read':
        return this.resolveForecastRead(input, audience);

      default:
        return this.deny(audience, 'NOT_YET_MIGRATED');
    }
  }

  async resolveTaskAssignment(
    input: TaskAssignmentResolverInput,
  ): Promise<TaskAssignmentDecision> {
    const operation = classifyTaskAssignment(
      input.resource.assigneeId,
      input.requestedAssigneeId,
    );
    if (operation === 'none') {
      const objectStateRestricted =
        Boolean(input.resource.deletedAt) ||
        input.resource.projectStatus === 'archived';
      const decision = objectStateRestricted
        ? this.deny(
            await this.resolveAudience(input.actor),
            'OBJECT_STATE_RESTRICTED',
          )
        : await this.resolve({
            actor: input.actor,
            capability: 'task.view',
            resource: input.resource,
          });
      return {
        ...decision,
        capability: null,
        operation,
      };
    }

    const capability = operation === 'assign' ? 'task.assign' : 'task.reassign';
    const decision = await this.resolve({
      actor: input.actor,
      capability,
      requestedAssigneeId: input.requestedAssigneeId,
      resource: input.resource,
    });
    return {
      ...decision,
      capability,
      operation,
    };
  }

  /** Shadow comparison never changes the legacy decision. */
  async compareWithLegacy(
    input: ShadowCapabilityComparisonInput,
  ): Promise<boolean> {
    if (input.enabled === false) {
      return input.legacyAllowed;
    }

    try {
      const resolverDecision = await this.resolve(input.resolverInput);

      if (resolverDecision.allowed !== input.legacyAllowed) {
        this.logger.warn({
          capability: input.resolverInput.capability,
          legacyAllowed: input.legacyAllowed,
          resolverAllowed: resolverDecision.allowed,
          reasonCode: resolverDecision.reasonCode,
          audience: resolverDecision.audience,
          event: 'capability_shadow_mismatch',
        });
      }
    } catch (error) {
      this.logger.warn({
        capability: input.resolverInput.capability,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        event: 'capability_shadow_evaluation_failed',
      });
    }

    return input.legacyAllowed;
  }

  private async resolveAudience(
    actor: AuthorizationActor,
  ): Promise<CapabilityAudience> {
    return (await this.authorizationPolicyService.isExternalActor(actor))
      ? 'external'
      : 'internal';
  }

  private async resolveProjectView(
    actor: AuthorizationActor,
    resource: CapabilityResolverInput['resource'],
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision> {
    if (resource.type !== 'project' || !resource.projectId) {
      return this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
    }

    const allowed = await this.authorizationPolicyService.canViewProject(
      resource.projectId,
      actor,
    );

    return allowed
      ? this.grant(audience)
      : this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
  }

  private async resolveProjectManagement(
    actor: AuthorizationActor,
    resource: CapabilityResolverInput['resource'],
    audience: CapabilityAudience,
    permission: PermissionKey,
  ): Promise<CapabilityDecision> {
    if (resource.type !== 'project' || !resource.projectId) {
      return this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
    }

    const hasPermission = await this.authorizationPolicyService.hasPermission(
      actor,
      permission,
    );

    if (!hasPermission) {
      return this.deny(audience, 'MISSING_PERMISSION');
    }

    const allowed = await this.authorizationPolicyService.canManageProject(
      resource.projectId,
      actor,
    );

    return allowed
      ? this.grant(audience)
      : this.deny(audience, 'PROJECT_MANAGEMENT_REQUIRED');
  }

  private async resolveTaskCapability(
    input: CapabilityResolverInput,
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision> {
    const { actor, capability, resource } = input;
    if (resource.type !== 'task') {
      return this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
    }

    const objectRestriction = this.getTaskObjectRestriction(
      capability,
      resource,
    );
    if (objectRestriction) {
      return this.deny(audience, objectRestriction);
    }

    if (
      (capability === 'task.assign' || capability === 'task.reassign') &&
      input.requestedAssigneeId
    ) {
      const targetRole =
        await this.authorizationPolicyService.getProjectMembershipRole(
          resource.projectId,
          input.requestedAssigneeId,
        );
      if (!targetRole) {
        return this.deny(audience, 'TARGET_NOT_PROJECT_MEMBER');
      }
    }

    if (await this.authorizationPolicyService.isPlatformAdministrator(actor)) {
      return (
        this.getDestinationObjectStateRestriction(input, audience) ??
        this.grant(audience)
      );
    }

    if (capability === 'task.view') {
      const executiveDecision = await this.resolveExecutiveProjectReadScope(
        actor,
        resource.projectId,
        audience,
      );
      if (executiveDecision) {
        return executiveDecision;
      }
    }

    const projectRole =
      await this.authorizationPolicyService.getProjectMembershipRole(
        resource.projectId,
        actor.userId,
      );
    if (!projectRole) {
      return this.deny(audience, 'PROJECT_MEMBERSHIP_REQUIRED');
    }

    if (
      audience === 'external' &&
      !isExternalProjectRoleEligible(projectRole)
    ) {
      return this.deny(audience, INVALID_PROJECT_ROLE_FOR_GLOBAL_ROLE);
    }

    if (projectRoleGrantsCapability(projectRole, capability)) {
      return this.resolveDestinationScope(input, audience);
    }

    if (
      projectRole !== ProjectRole.Contributor ||
      !contributorContextualCapabilities.has(capability)
    ) {
      return this.deny(audience, 'MISSING_PERMISSION');
    }

    if (!resource.assigneeId || resource.assigneeId !== actor.userId) {
      return this.deny(audience, 'ASSIGNMENT_REQUIRED');
    }

    if (
      capability === 'task.edit_execution' ||
      capability === 'task.record_update'
    ) {
      const permittedFields =
        capability === 'task.edit_execution'
          ? CONTRIBUTOR_TASK_EXECUTION_FIELDS
          : CONTRIBUTOR_EXECUTION_UPDATE_FIELDS;
      const editableFields = [...permittedFields];
      const permittedFieldSet = new Set<string>(permittedFields);
      const changedFields = input.changedFields ?? [];
      if (changedFields.some((field) => !permittedFieldSet.has(field))) {
        return this.deny(audience, 'FIELD_RESTRICTED');
      }
      return {
        ...this.grant(audience),
        editableFields,
      };
    }

    return this.grant(audience);
  }

  private async resolveForecastRead(
    input: CapabilityResolverInput,
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision> {
    if (input.resource.type !== 'forecast') {
      return this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
    }

    if (
      await this.authorizationPolicyService.isPlatformAdministrator(input.actor)
    ) {
      return this.grant(audience);
    }

    const executiveDecision = await this.resolveExecutiveProjectReadScope(
      input.actor,
      input.resource.projectId,
      audience,
    );
    if (executiveDecision) {
      return executiveDecision;
    }

    const projectRole =
      await this.authorizationPolicyService.getProjectMembershipRole(
        input.resource.projectId,
        input.actor.userId,
      );
    return projectRole &&
      projectRoleGrantsCapability(projectRole, 'forecast.read')
      ? this.grant(audience)
      : this.deny(audience, 'PROJECT_MEMBERSHIP_REQUIRED');
  }

  private async resolveExecutiveProjectReadScope(
    actor: AuthorizationActor,
    projectId: string,
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision | null> {
    if (
      (await this.authorizationPolicyService.getActorRoleName(actor)) !==
      UserRole.Executive
    ) {
      return null;
    }

    return (await this.authorizationPolicyService.canViewProject(
      projectId,
      actor,
    ))
      ? this.grant(audience)
      : this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
  }

  private async resolveDestinationScope(
    input: CapabilityResolverInput,
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision> {
    if (input.capability !== 'task.move' || !input.destinationProjectId) {
      return this.grant(audience);
    }

    const objectStateRestriction = this.getDestinationObjectStateRestriction(
      input,
      audience,
    );
    if (objectStateRestriction) {
      return objectStateRestriction;
    }

    const destinationRole =
      await this.authorizationPolicyService.getProjectMembershipRole(
        input.destinationProjectId,
        input.actor.userId,
      );
    if (
      !destinationRole ||
      !projectRoleGrantsCapability(destinationRole, 'task.move')
    ) {
      return {
        ...this.deny(audience, 'DESTINATION_SCOPE_DENIED'),
        scopeDecisions: [
          { allowed: true, reasonCode: 'GRANTED', scope: 'source' },
          {
            allowed: false,
            reasonCode: 'DESTINATION_SCOPE_DENIED',
            scope: 'destination',
          },
        ],
      };
    }

    return {
      ...this.grant(audience),
      scopeDecisions: [
        { allowed: true, reasonCode: 'GRANTED', scope: 'source' },
        { allowed: true, reasonCode: 'GRANTED', scope: 'destination' },
      ],
    };
  }

  private getDestinationObjectStateRestriction(
    input: CapabilityResolverInput,
    audience: CapabilityAudience,
  ): CapabilityDecision | null {
    if (
      input.capability !== 'task.move' ||
      input.destinationProjectStatus !== 'archived'
    ) {
      return null;
    }

    return {
      ...this.deny(audience, 'OBJECT_STATE_RESTRICTED'),
      scopeDecisions: [
        { allowed: true, reasonCode: 'GRANTED', scope: 'source' },
        {
          allowed: false,
          reasonCode: 'OBJECT_STATE_RESTRICTED',
          scope: 'destination',
        },
      ],
    };
  }

  private getTaskObjectRestriction(
    capability: CapabilityResolverInput['capability'],
    resource: TaskCapabilityResource,
  ): CapabilityReasonCode | null {
    if (capability === 'task.view') {
      return null;
    }

    if (resource.deletedAt || resource.projectStatus === 'archived') {
      return 'OBJECT_STATE_RESTRICTED';
    }

    if (
      resource.taskKind === 'summary' &&
      summaryTaskRestrictedCapabilities.has(capability)
    ) {
      return 'OBJECT_STATE_RESTRICTED';
    }

    return null;
  }

  private async permissionDecision(
    actor: AuthorizationActor,
    permission: PermissionKey,
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision> {
    const allowed = await this.authorizationPolicyService.hasPermission(
      actor,
      permission,
    );

    return allowed
      ? this.grant(audience)
      : this.deny(audience, 'MISSING_PERMISSION');
  }

  private grant(audience: CapabilityAudience): CapabilityDecision {
    return {
      allowed: true,
      audience,
      reasonCode: 'GRANTED',
    };
  }

  private deny(
    audience: CapabilityAudience,
    reasonCode: CapabilityReasonCode,
  ): CapabilityDecision {
    return {
      allowed: false,
      audience,
      reasonCode,
    };
  }
}

export function classifyTaskAssignment(
  currentAssigneeId: string | null | undefined,
  requestedAssigneeId: string | null,
): TaskAssignmentOperation {
  const current = currentAssigneeId ?? null;
  if (current === requestedAssigneeId) {
    return 'none';
  }
  return current === null ? 'assign' : 'reassign';
}
