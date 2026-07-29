import {
  AiProviderCapabilityId,
  AiProviderExecutionRequest,
  AiProviderExecutionResult,
  AiProviderHealthDiagnostics,
  AiProviderMetadata,
} from './ai-provider.types';

export interface AIProvider {
  describeProvider(): AiProviderMetadata;
  discoverCapabilities(): AiProviderCapabilityId[];
  execute?(
    request: AiProviderExecutionRequest,
  ): Promise<AiProviderExecutionResult>;
  getHealth(): AiProviderHealthDiagnostics;
}
