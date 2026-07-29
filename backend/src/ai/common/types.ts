export type AiResponseMode = 'sync' | 'stream';

export type AiLifecycleState =
  | 'received'
  | 'authenticated'
  | 'authorized'
  | 'context_assembled'
  | 'prompt_resolved'
  | 'provider_selected'
  | 'invoked'
  | 'response_processed'
  | 'audited'
  | 'completed'
  | 'rejected'
  | 'failed';

export type AiRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AiScope = {
  actorId?: string;
  clientId?: string;
  projectIds?: string[];
  tenantId?: string;
  workspaceId?: string;
};

export type AiCapability = {
  id: string;
  name: string;
  description?: string;
  requiredPermissions: string[];
  riskLevel: AiRiskLevel;
  version: string;
};

export type AiRequest = {
  capabilityId: string;
  correlationId: string;
  input: unknown;
  metadata?: Record<string, unknown>;
  requestId: string;
  responseMode: AiResponseMode;
  scope: AiScope;
};

export type AiUserIdentity = {
  displayName?: string;
  email?: string;
  userId?: string;
};

export type AiExecutionState = {
  lastTransitionAt: string;
  lifecycleState: AiLifecycleState;
};

export type AiResponse = {
  auditReference?: string;
  citations?: string[];
  content?: unknown;
  errors?: AiErrorPayload[];
  requestId: string;
  status: 'success' | 'rejected' | 'failed';
  telemetryReference?: string;
  warnings?: string[];
};

export type AiErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'context'
  | 'provider'
  | 'timeout'
  | 'governance'
  | 'system';

export type AiErrorPayload = {
  category: AiErrorCategory;
  code: string;
  correlationId?: string;
  message: string;
  retryable: boolean;
  safeDetail?: string;
};
