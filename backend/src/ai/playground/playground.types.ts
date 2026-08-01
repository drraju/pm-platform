import type { AIEvent } from '../common';
import type { AiExecutionResult } from '../execution';

export type PlaygroundRequest = {
  actorId?: string;
  capabilityId?: string;
  conversationId?: string;
  correlationId?: string;
  input: unknown;
  projectIds?: readonly string[];
  providerId?: string;
  requestId?: string;
  sessionId?: string;
  tenantId?: string;
  workspaceId?: string;
};

export type PlaygroundRegistrySnapshot = {
  capabilities: readonly Readonly<Record<string, unknown>>[];
  conversations: readonly Readonly<Record<string, unknown>>[];
  providers: readonly Readonly<Record<string, unknown>>[];
  prompts: readonly Readonly<Record<string, unknown>>[];
  sessions: readonly Readonly<Record<string, unknown>>[];
  skills: readonly Readonly<Record<string, unknown>>[];
  enterpriseCapabilities?: readonly Readonly<Record<string, unknown>>[];
};

export type PlaygroundEventTimelineEntry = {
  durationMs?: number;
  eventName: string;
  executionId: string;
  timestamp: string;
};

export type PlaygroundDiagnostics = {
  architectureValidation: {
    externalProviderExecution: false;
    gatewayBoundaryPreserved: true;
    mockProviderOnly: true;
    readOnlyRegistryInspection: true;
  };
  errors: readonly Readonly<Record<string, unknown>>[];
  executionDurationMs?: number;
  pipelineDecisions: readonly Readonly<Record<string, unknown>>[];
  providerResolution: readonly string[];
  registryResolution: {
    contextProviderIds: readonly string[];
    promptCandidateIds: readonly string[];
    providerCandidateIds: readonly string[];
    skillCandidateIds: readonly string[];
  };
  stateHistory: readonly Readonly<Record<string, unknown>>[];
  warnings: readonly string[];
};

export type PlaygroundExecutionTrace = {
  conversationId: string;
  diagnostics: PlaygroundDiagnostics;
  eventBusEvents: readonly AIEvent[];
  eventTimeline: readonly PlaygroundEventTimelineEntry[];
  executionId: string;
  executionStates: readonly Readonly<Record<string, unknown>>[];
  finalResult: AiExecutionResult;
  input: unknown;
  pipelineStages: readonly Readonly<Record<string, unknown>>[];
  registrySnapshot: PlaygroundRegistrySnapshot;
  request: PlaygroundRequest;
  requestId: string;
  selectedCapability: string;
  selectedContextMetadata: readonly Readonly<Record<string, unknown>>[];
  selectedConversation: Readonly<Record<string, unknown>> | null;
  selectedPrompt?: Readonly<Record<string, unknown>>;
  selectedProvider?: Readonly<Record<string, unknown>>;
  selectedSkill?: Readonly<Record<string, unknown>>;
  timing: Readonly<Record<string, unknown>>;
};

export type PlaygroundResponse = {
  trace: PlaygroundExecutionTrace;
};

export type PlaygroundExecutionHistoryItem = {
  capability: string;
  durationMs?: number;
  executionId: string;
  provider?: string;
  request: string;
  requestId: string;
  status: string;
};
