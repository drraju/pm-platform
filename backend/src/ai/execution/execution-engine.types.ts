import type { AiErrorPayload, AiRequest } from '../common';
import type { AiPipelineDiagnostics } from '../gateway/pipeline';
import type { AiIntent } from '../skills';
import type { StructuredAIResponse } from '../responses';

export type AiExecutionEngineState =
  | 'Created'
  | 'Validated'
  | 'Planned'
  | 'ContextResolved'
  | 'PromptResolved'
  | 'SkillResolved'
  | 'ProviderSelected'
  | 'Executing'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'
  | 'TimedOut';

export type AiExecutionTerminalState = Extract<
  AiExecutionEngineState,
  'Completed' | 'Failed' | 'Cancelled' | 'TimedOut'
>;

export type AiExecutionTransition = {
  at: string;
  from?: AiExecutionEngineState;
  metadata: Readonly<Record<string, unknown>>;
  reason: string;
  sequence: number;
  to: AiExecutionEngineState;
};

export type AiExecutionStateMachineSnapshot = {
  currentState: AiExecutionEngineState;
  executionId: string;
  history: readonly AiExecutionTransition[];
};

export type AiExecutionTimeoutPolicy = {
  enabled: boolean;
  timeoutMs: number;
};

export type AiExecutionRetryPolicy = {
  enabled: boolean;
  maxAttempts: number;
  retryableErrorCategories: readonly string[];
};

export type AiExecutionCancellationPolicy = {
  cancellationToken?: string;
  enabled: boolean;
};

export type AiExecutionConcurrencyPolicy = {
  executionGroup?: string;
  maxConcurrentExecutions: number;
};

export type AiExecutionMode = 'sync' | 'async-metadata';

export type AiExecutionModePolicy = {
  mode: AiExecutionMode;
};

export type AiExecutionPolicies = {
  cancellation: AiExecutionCancellationPolicy;
  concurrency: AiExecutionConcurrencyPolicy;
  executionMode: AiExecutionModePolicy;
  retry: AiExecutionRetryPolicy;
  timeout: AiExecutionTimeoutPolicy;
};

export type AiExecutionDiagnostics = {
  completionStatus?: 'failed' | 'success';
  contextItemCount?: number;
  contextProviderIds: readonly string[];
  contextTokenEstimate?: number;
  eventNames: readonly string[];
  pipeline?: AiPipelineDiagnostics;
  policySummary: Readonly<Record<string, unknown>>;
  promptTokenEstimate?: number;
  promptCandidateIds: readonly string[];
  providerLatencyMs?: number;
  providerCandidateIds: readonly string[];
  skillId?: string;
  skillCandidateIds: readonly string[];
  intentId?: string;
  warnings: readonly string[];
};

export type AiExecutionTiming = {
  completedAt?: string;
  durationMs?: number;
  startedAt: string;
};

export type AiExecutionMockResponsePayload = {
  content: string;
  modelId: string;
  providerId: string;
};

export type AiExecutionStructuredResponse = StructuredAIResponse;

export type AiExecutionAuthorizationInput = {
  allowSensitiveContext?: boolean;
  permissions?: readonly string[];
  roles?: readonly string[];
};

export type AiExecutionResultStatus =
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export type AiExecutionResult = {
  diagnostics: AiExecutionDiagnostics;
  errors: readonly AiErrorPayload[];
  executionId: string;
  mockResponse?: AiExecutionMockResponsePayload;
  intent?: AiIntent;
  policies: AiExecutionPolicies;
  requestId: string;
  selectedContextMetadata: readonly Readonly<Record<string, unknown>>[];
  selectedPrompt?: Readonly<Record<string, unknown>>;
  selectedProvider?: Readonly<Record<string, unknown>>;
  selectedSkill?: Readonly<Record<string, unknown>>;
  structuredResponse?: AiExecutionStructuredResponse;
  stateHistory: readonly AiExecutionTransition[];
  status: AiExecutionResultStatus;
  timing: AiExecutionTiming;
};

export type AiExecutionRequest = {
  authorization?: AiExecutionAuthorizationInput;
  executionId?: string;
  intent?: AiIntent;
  policies?: Partial<AiExecutionPolicies>;
  preferredProviderId?: string;
  request: AiRequest;
  responseFormat?: string;
  skillId?: string;
};
