export type AiProviderCapabilityId =
  | 'chat'
  | 'reasoning'
  | 'embeddings'
  | 'vision'
  | 'image-generation'
  | 'speech-to-text'
  | 'text-to-speech'
  | 'tool-calling'
  | 'structured-output'
  | 'streaming'
  | (string & {});

export type AiProviderAuthenticationType =
  | 'none'
  | 'api-key'
  | 'oauth'
  | 'managed-identity'
  | 'local';

export type AiProviderHealthStatus =
  | 'unknown'
  | 'healthy'
  | 'degraded'
  | 'unavailable';

export type AiProviderAvailability = 'available' | 'disabled' | 'unavailable';

export type AiProviderModelMetadata = {
  capabilities: AiProviderCapabilityId[];
  contextWindowTokens?: number;
  id: string;
  name: string;
};

export type AiProviderCostMetadata = {
  currency?: string;
  inputTokenCostPerMillion?: number;
  outputTokenCostPerMillion?: number;
};

export type AiProviderRateLimitMetadata = {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
};

export type AiProviderConfigurationField = {
  description?: string;
  name: string;
  required: boolean;
  secret: boolean;
};

export type AiProviderHealthDiagnostics = {
  authenticated?: boolean;
  availableModels?: readonly string[];
  checkedAt?: string;
  configured?: boolean;
  latencyMs?: number;
  message?: string;
  providerVersion?: string;
  reachable?: boolean;
  status: AiProviderHealthStatus;
};

export type AiProviderMetadata = {
  authenticationType: AiProviderAuthenticationType;
  availability: AiProviderAvailability;
  configurationSchema: AiProviderConfigurationField[];
  cost: AiProviderCostMetadata;
  health: AiProviderHealthDiagnostics;
  id: string;
  name: string;
  priority: number;
  rateLimits: AiProviderRateLimitMetadata;
  supportedCapabilities: AiProviderCapabilityId[];
  supportedModels: AiProviderModelMetadata[];
  version: string;
};

export type AiProviderRoutePolicy = {
  capabilityId: string;
  futureFailoverEnabled: boolean;
  futureLoadBalancingEnabled: boolean;
  priorityOrderedProviderIds: string[];
};

export type AiProviderExecutionRequest = {
  capabilityId: string;
  contextMetadataIds: readonly string[];
  executionId: string;
  input: unknown;
  promptId?: string;
  providerId: string;
  requestId: string;
  skillId?: string;
};

export type AiProviderExecutionResult = {
  content: string;
  modelId: string;
  providerId: string;
};
