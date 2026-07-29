import type { AiErrorPayload, AiRequest } from '../common';
import type { AiPipelineDiagnostics } from '../gateway/pipeline';

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
  contextProviderIds: readonly string[];
  eventNames: readonly string[];
  pipeline?: AiPipelineDiagnostics;
  policySummary: Readonly<Record<string, unknown>>;
  promptCandidateIds: readonly string[];
  providerCandidateIds: readonly string[];
  skillCandidateIds: readonly string[];
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
  policies: AiExecutionPolicies;
  requestId: string;
  selectedContextMetadata: readonly Readonly<Record<string, unknown>>[];
  selectedPrompt?: Readonly<Record<string, unknown>>;
  selectedProvider?: Readonly<Record<string, unknown>>;
  selectedSkill?: Readonly<Record<string, unknown>>;
  stateHistory: readonly AiExecutionTransition[];
  status: AiExecutionResultStatus;
  timing: AiExecutionTiming;
};

export type AiExecutionRequest = {
  executionId?: string;
  policies?: Partial<AiExecutionPolicies>;
  request: AiRequest;
};
