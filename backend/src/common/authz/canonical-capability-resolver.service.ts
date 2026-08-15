import { Injectable, Logger } from '@nestjs/common';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from './authorization-policy.service';
import {
  CapabilityAudience,
  CapabilityDecision,
  CapabilityReasonCode,
  CapabilityResolverInput,
  ShadowCapabilityComparisonInput,
} from './canonical-capability.types';
import { PermissionKey } from './permissions';

@Injectable()
export class CanonicalCapabilityResolverService {
  private readonly logger = new Logger(
    CanonicalCapabilityResolverService.name,
  );

  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  /**
   * Canonical capability adapter.
   *
   * P1 Slice 1 deliberately delegates to the existing authorization policy
   * without changing or redefining existing authorization semantics.
   *
   * Later P1 slices will progressively migrate individual capability domains.
   */
  async resolve(
    input: CapabilityResolverInput,
  ): Promise<CapabilityDecision> {
    const audience = await this.resolveAudience(input.actor);

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

      case 'task.view':
        return this.resolveTaskView(input.actor, input.resource, audience);

      case 'task.create':
        return this.resolveTaskManagement(
          input.actor,
          input.resource,
          audience,
          PermissionKey.TaskCreate,
        );

      case 'task.delete':
        return this.resolveTaskManagement(
          input.actor,
          input.resource,
          audience,
          PermissionKey.TaskDelete,
        );

      case 'task.reassign':
        return this.resolveTaskManagement(
          input.actor,
          input.resource,
          audience,
          PermissionKey.TaskReassign,
        );

      default:
        /*
         * Capabilities not yet migrated to the canonical resolver must not
         * acquire invented authorization semantics.
         *
         * Later P1 slices will add these mappings deliberately.
         */
        return this.deny(audience, 'NOT_YET_MIGRATED');
    }
  }

  /**
   * Shadow comparison never changes the legacy decision.
   */
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

  private async resolveTaskView(
    actor: AuthorizationActor,
    resource: CapabilityResolverInput['resource'],
    audience: CapabilityAudience,
  ): Promise<CapabilityDecision> {
    if (resource.type !== 'task') {
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

  private async resolveTaskManagement(
    actor: AuthorizationActor,
    resource: CapabilityResolverInput['resource'],
    audience: CapabilityAudience,
    permission: PermissionKey,
  ): Promise<CapabilityDecision> {
    if (resource.type !== 'task') {
      return this.deny(audience, 'OUTSIDE_PROJECT_SCOPE');
    }

    const hasPermission = await this.authorizationPolicyService.hasPermission(
      actor,
      permission,
    );

    if (!hasPermission) {
      return this.deny(audience, 'MISSING_PERMISSION');
    }

    const allowed = await this.authorizationPolicyService.canManageTask(
      resource.projectId,
      actor,
    );

    return allowed
      ? this.grant(audience)
      : this.deny(audience, 'PROJECT_MANAGEMENT_REQUIRED');
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