import { AiErrorPayload } from '../../common';
import { AiExecutionContext } from '../ai-execution-context';

export type AiPipelineStageResultStatus = 'success' | 'skipped' | 'failed';

export type AiPipelineStageName =
  | 'request_validation'
  | 'authentication_hook'
  | 'authorization_hook'
  | 'execution_context_enrichment'
  | 'capability_resolution'
  | 'context_assembly_placeholder'
  | 'prompt_resolution_placeholder'
  | 'provider_dispatch_placeholder'
  | 'response_normalization'
  | 'telemetry'
  | 'audit';

export type AiPipelineContext = {
  context: AiExecutionContext;
  diagnostics: AiPipelineDiagnostics;
};

export type AiPipelineStageDiagnostic = {
  durationMs: number;
  endTime: string;
  failureReason?: string;
  result: AiPipelineStageResultStatus;
  stageName: AiPipelineStageName;
  startTime: string;
};

export type AiPipelineDiagnostics = {
  completedAt?: string;
  failedStageName?: AiPipelineStageName;
  stages: AiPipelineStageDiagnostic[];
  startedAt: string;
};

export type AiPipelineResult = {
  context: AiExecutionContext;
  diagnostics: AiPipelineDiagnostics;
  error?: AiErrorPayload;
  status: 'success' | 'failed';
};

export type AiPipelineStageResult = {
  context: AiExecutionContext;
  error?: AiErrorPayload;
  status: AiPipelineStageResultStatus;
};

export type AiPipelineStageMetadata = {
  description: string;
  enabled: boolean;
  name: AiPipelineStageName;
  order: number;
};
