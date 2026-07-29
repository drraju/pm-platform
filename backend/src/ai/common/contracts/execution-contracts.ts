import { AiFeatureFlags } from '../ai-config.service';
import { AiScope, AiUserIdentity } from '../types';

export type ExecutionContextMetadata = {
  auditMetadata: Readonly<Record<string, unknown>>;
  contextReferences: readonly string[];
  correlationId: string;
  effectivePermissions: readonly string[];
  extensionMetadata: Readonly<Record<string, unknown>>;
  featureFlags: AiFeatureFlags;
  organizationId?: string;
  projectId?: string;
  promptMetadata: Readonly<Record<string, unknown>>;
  requestId: string;
  requestMetadata: Readonly<Record<string, unknown>>;
  requestedCapabilityId: string;
  requestedSkillId?: string;
  scope: AiScope;
  selectedProviderId?: string;
  sessionId?: string;
  telemetryMetadata: Readonly<Record<string, unknown>>;
  tenantId?: string;
  timestamp: string;
  traceId: string;
  userIdentity: AiUserIdentity;
  userRoles: readonly string[];
  workspaceId?: string;
};

export type ExecutionRequestMetadata = {
  capabilityId: string;
  correlationId: string;
  requestId: string;
  scope: AiScope;
};
