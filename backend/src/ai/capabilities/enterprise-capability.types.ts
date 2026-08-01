import type { ContextType } from '../common';

export type EnterpriseCapabilityCategory =
  | 'delivery'
  | 'governance'
  | 'meetings'
  | 'portfolio'
  | 'project';

export type EnterpriseCapabilityResponseType =
  | 'action-plan'
  | 'analysis'
  | 'checklist'
  | 'executive-summary'
  | 'recommendations'
  | 'review'
  | 'structured-report';

export type EnterpriseCapabilityVisibility = 'internal' | 'private' | 'public';

export type EnterpriseCapabilityMetadata = {
  allowedRoles: readonly string[];
  category: EnterpriseCapabilityCategory;
  description: string;
  displayName: string;
  executionCapabilityId: string;
  icon: string;
  id: string;
  permissions: readonly string[];
  requiredContext: readonly ContextType[];
  responseType: EnterpriseCapabilityResponseType;
  supportedSkills: readonly string[];
  version: string;
  visibility: EnterpriseCapabilityVisibility;
};

export type EnterpriseCapabilityRegistryDiagnostics = {
  capabilityCount: number;
  disabledCapabilityIds: readonly string[];
  enabledCapabilityIds: readonly string[];
};

export type CapabilityExecutionRequest = {
  actorId?: string;
  capabilityId: string;
  correlationId: string;
  contextSourceData?: unknown;
  input: unknown;
  permissions?: readonly string[];
  preferredProviderId?: string;
  projectIds?: readonly string[];
  requestId: string;
  roles?: readonly string[];
  tenantId?: string;
  workspaceId?: string;
};
