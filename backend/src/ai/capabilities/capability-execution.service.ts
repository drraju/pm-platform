import { Inject, Injectable } from '@nestjs/common';
import { AI_EXECUTION_ENGINE, AiPlatformError } from '../common';
import { AiSkillRegistryService } from '../skills';
import {
  CapabilityExecutionRequest,
  EnterpriseCapabilityMetadata,
  EnterpriseCapabilityResponseType,
} from './enterprise-capability.types';
import { EnterpriseCapabilityRegistryService } from './enterprise-capability-registry.service';

@Injectable()
export class CapabilityExecutionService {
  constructor(
    private readonly capabilityRegistry: EnterpriseCapabilityRegistryService,
    @Inject(AI_EXECUTION_ENGINE)
    private readonly executionEngine: CapabilityExecutionRunner,
    private readonly skillRegistry: AiSkillRegistryService,
  ) {}

  async execute(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const capability = this.capabilityRegistry.findById(request.capabilityId);
    if (!capability) {
      throw new AiPlatformError({
        category: 'validation',
        code: 'AI_CAPABILITY_NOT_FOUND',
        correlationId: request.correlationId,
        message: 'The requested enterprise AI capability is not registered.',
        retryable: false,
        safeDetail: request.capabilityId,
      });
    }

    const skillId = this.resolveSkill(capability);
    const missingPermissions = capability.permissions.filter(
      (permission) => !(request.permissions ?? []).includes(permission),
    );
    const missingRole =
      capability.allowedRoles.length > 0 &&
      !capability.allowedRoles.some((role) => (request.roles ?? []).includes(role));
    if (missingPermissions.length > 0 || missingRole) {
      throw new AiPlatformError({
        category: 'authorization',
        code: 'AI_CAPABILITY_UNAUTHORIZED',
        correlationId: request.correlationId,
        message: 'The actor is not authorized to execute this capability.',
        retryable: false,
        safeDetail: [...missingPermissions, ...(missingRole ? ['allowed role'] : [])].join(', '),
      });
    }

    return this.executionEngine.execute({
      authorization: {
        permissions: request.permissions,
        roles: request.roles,
      },
      intent: {
        id: capability.id.toUpperCase().replace(/-/g, '_'),
        skillId,
      },
      preferredProviderId: request.preferredProviderId,
      request: {
        capabilityId: capability.executionCapabilityId,
        correlationId: request.correlationId,
        input: request.input,
        metadata: request.contextSourceData
          ? { enterpriseContext: { sourceData: request.contextSourceData } }
          : undefined,
        requestId: request.requestId,
        responseMode: 'sync',
        scope: {
          actorId: request.actorId,
          projectIds: request.projectIds ? [...request.projectIds] : undefined,
          tenantId: request.tenantId,
          workspaceId: request.workspaceId,
        },
      },
      responseFormat: responseFormatFor(capability.responseType),
      skillId,
    });
  }

  private resolveSkill(capability: EnterpriseCapabilityMetadata): string {
    const skillId = capability.supportedSkills.find((candidate) => Boolean(this.skillRegistry.findSkill(candidate)));
    if (!skillId) {
      throw new AiPlatformError({
        category: 'validation',
        code: 'AI_CAPABILITY_SKILL_UNAVAILABLE',
        message: 'No registered skill supports the requested capability.',
        retryable: false,
        safeDetail: capability.id,
      });
    }
    return skillId;
  }
}

type CapabilityExecutionRunner = {
  execute(request: unknown): Promise<CapabilityExecutionResult>;
};

export type CapabilityExecutionResult = {
  status: string;
  structuredResponse?: unknown;
  [key: string]: unknown;
};

function responseFormatFor(responseType: EnterpriseCapabilityResponseType): string {
  switch (responseType) {
    case 'executive-summary':
      return 'executive-summary';
    case 'recommendations':
      return 'bullet-summary';
    case 'action-plan':
      return 'implementation-guidance';
    case 'structured-report':
      return 'json';
    default:
      return 'markdown';
  }
}
