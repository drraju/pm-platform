import {
  ContextType,
  ExecutionContextMetadata,
  ResourceReferenceType,
} from '../common';
import { AiScope } from '../common/types';

export type AiContextProviderLifecycleState =
  | 'registered'
  | 'enabled'
  | 'disabled'
  | 'degraded';

export type AiContextType = ContextType;

export type AiContextResourceType = ResourceReferenceType;

export type AiContextClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export type AiContextSensitivity =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'regulated';

export type AiContextFreshness = 'live' | 'recent' | 'stale' | 'unknown';

export type AiContextSource = {
  providerId: string;
  providerName: string;
  resourceId?: string;
  resourceType: AiContextResourceType;
};

export type AiContextMetadata = {
  classification: AiContextClassification;
  confidence: number;
  contextType: AiContextType;
  estimatedTokenSize: number;
  freshness: AiContextFreshness;
  generatedAt: string;
  id: string;
  priority: number;
  sensitivity: AiContextSensitivity;
  source: AiContextSource;
};

export type AiContextProviderDescriptor = {
  contextType: AiContextType;
  dependencies: readonly string[];
  id: string;
  lifecycleState: AiContextProviderLifecycleState;
  name: string;
  priority: number;
  supportedCapabilities: readonly string[];
  supportedResources: readonly AiContextResourceType[];
  version: string;
};

export type AiContextRequestedResource = {
  id?: string;
  type: AiContextResourceType;
};

export type AiContextSelectionRequest = {
  capabilityId: string;
  executionContext: ExecutionContextMetadata;
  requestedResources?: readonly AiContextRequestedResource[];
  scope: AiScope;
};

export type AiContextProviderSelection = {
  metadata: readonly AiContextMetadata[];
  provider: AiContextProviderDescriptor;
};

export type AiContextRegistryDiagnostic = {
  disabledProviderIds: readonly string[];
  enabledProviderIds: readonly string[];
  providerCount: number;
  providerLifecycle: readonly {
    lifecycleState: AiContextProviderLifecycleState;
    providerId: string;
  }[];
};

export type AiContextAggregationDiagnostic = {
  duplicateDetectionApplied: boolean;
  mergeStrategy: AiContextMergeStrategyName;
  omittedProviderIds: readonly string[];
  selectedProviderIds: readonly string[];
  totalEstimatedTokens: number;
};

export type AiContextAggregationResult = {
  diagnostics: AiContextAggregationDiagnostic;
  metadata: readonly AiContextMetadata[];
};

export type AiContextMergeStrategyName =
  | 'priority'
  | 'freshness'
  | 'source-attribution';

export type AiContextDuplicateDetectionStrategy = {
  readonly name: string;
  detectDuplicates(metadata: readonly AiContextMetadata[]): readonly string[];
};

export type AiContextMergeStrategy = {
  readonly name: AiContextMergeStrategyName;
  merge(metadata: readonly AiContextMetadata[]): readonly AiContextMetadata[];
};

export type AiContextPermissionFilterRequest = {
  metadata: readonly AiContextMetadata[];
  scope: AiScope;
};

export type AiContextPermissionFilterResult = {
  allowed: readonly AiContextMetadata[];
  omitted: readonly {
    metadataId: string;
    reason: string;
  }[];
};

export type AiTokenBudgetPolicy = {
  compressionStrategy: AiTokenCompressionStrategy;
  maxTokens: number;
  summarizationEligible: boolean;
  truncationPolicy: AiTokenTruncationPolicy;
};

export type AiTokenTruncationPolicy =
  | 'required-first'
  | 'freshness-first'
  | 'priority-first'
  | 'reject-oversized';

export type AiTokenCompressionStrategy =
  | 'none'
  | 'extractive-summary'
  | 'abstractive-summary'
  | 'source-trimming';

export type AiTokenBudgetEstimate = {
  estimatedTokens: number;
  metadataId: string;
  priority: number;
  policy: AiTokenBudgetPolicy;
};
