import { Injectable } from '@nestjs/common';
import { AIProvider } from './ai-provider.interface';
import {
  AiProviderCapabilityId,
  AiProviderExecutionRequest,
  AiProviderExecutionResult,
  AiProviderHealthDiagnostics,
  AiProviderMetadata,
} from './ai-provider.types';

@Injectable()
export class MockAiProviderAdapter implements AIProvider {
  private readonly supportedCapabilities: AiProviderCapabilityId[] = [
    'chat',
    'reasoning',
    'structured-output',
    'streaming',
  ];

  describeProvider(): AiProviderMetadata {
    return {
      authenticationType: 'none',
      availability: 'available',
      configurationSchema: [],
      cost: {
        currency: 'USD',
        inputTokenCostPerMillion: 0,
        outputTokenCostPerMillion: 0,
      },
      health: this.getHealth(),
      id: 'mock',
      name: 'Mock AI Provider',
      priority: 100,
      rateLimits: {
        requestsPerMinute: 0,
        tokensPerMinute: 0,
      },
      supportedCapabilities: [...this.supportedCapabilities],
      supportedModels: [
        {
          capabilities: [...this.supportedCapabilities],
          contextWindowTokens: 4096,
          id: 'mock-metadata-only',
          name: 'Mock Metadata Only',
        },
      ],
      version: '1.0.0',
    };
  }

  discoverCapabilities(): AiProviderCapabilityId[] {
    return [...this.supportedCapabilities];
  }

  execute(
    request: AiProviderExecutionRequest,
  ): Promise<AiProviderExecutionResult> {
    return Promise.resolve({
      content: `mock-response:${request.requestId}:${request.capabilityId}`,
      modelId: 'mock-metadata-only',
      providerId: 'mock',
    });
  }

  getHealth(): AiProviderHealthDiagnostics {
    return {
      checkedAt: new Date(0).toISOString(),
      message: 'Metadata-only mock provider. No inference is available.',
      status: 'healthy',
    };
  }
}
