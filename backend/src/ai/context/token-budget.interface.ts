import {
  AiContextMetadata,
  AiTokenBudgetEstimate,
  AiTokenBudgetPolicy,
} from './context-provider.types';

export interface AiContextTokenEstimator {
  estimate(metadata: AiContextMetadata): AiTokenBudgetEstimate;
}

export interface AiContextTokenBudgetPlanner {
  planBudget(metadata: readonly AiContextMetadata[]): AiTokenBudgetPolicy;
}

export interface AiContextTruncationPolicy {
  selectMetadataWithinBudget(
    metadata: readonly AiContextMetadata[],
    policy: AiTokenBudgetPolicy,
  ): readonly AiContextMetadata[];
}

export interface AiContextCompressionStrategy {
  supports(metadata: AiContextMetadata, policy: AiTokenBudgetPolicy): boolean;
}
