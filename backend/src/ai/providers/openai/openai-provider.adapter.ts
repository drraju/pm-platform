import { Injectable, OnModuleInit } from '@nestjs/common';
import { AiConfigService } from '../../common';
import { AIProvider } from '../ai-provider.interface';
import {
  AiProviderCapabilityId,
  AiProviderExecutionRequest,
  AiProviderExecutionResult,
  AiProviderHealthDiagnostics,
  AiProviderMetadata,
} from '../ai-provider.types';
import {
  AIHttpClient,
  AIHttpException,
  APIKeyAuthenticationProvider,
} from '../http';
import { OpenAIErrorMapper } from './openai-error.mapper';
import { OpenAIRequestMapper } from './openai-request.mapper';
import { OpenAIChatCompletionResponse } from './openai-provider.types';
import { OpenAIResponseMapper } from './openai-response.mapper';

@Injectable()
export class OpenAIProviderAdapter implements AIProvider, OnModuleInit {
  private configurationErrors: readonly string[] = [];
  private readonly supportedCapabilities: AiProviderCapabilityId[] = [
    'chat',
    'reasoning',
    'structured-output',
  ];

  constructor(
    private readonly configService: AiConfigService,
    private readonly httpClient: AIHttpClient,
    private readonly authProvider: APIKeyAuthenticationProvider,
    private readonly requestMapper: OpenAIRequestMapper,
    private readonly responseMapper: OpenAIResponseMapper,
    private readonly errorMapper: OpenAIErrorMapper,
  ) {}

  onModuleInit(): void {
    this.configurationErrors = this.validateConfiguration();
  }

  validateConfiguration(): readonly string[] {
    return this.authProvider.validate(this.configService.getOpenAIApiKey());
  }

  describeProvider(): AiProviderMetadata {
    const configuration = this.configService.getOpenAIConfiguration();
    const configured = configuration.apiKeyConfigured;

    return {
      authenticationType: 'api-key',
      availability: configured ? 'available' : 'disabled',
      configurationSchema: [
        {
          description: 'OpenAI API key.',
          name: 'OPENAI_API_KEY',
          required: true,
          secret: true,
        },
        {
          description: 'OpenAI chat model.',
          name: 'OPENAI_MODEL',
          required: false,
          secret: false,
        },
      ],
      cost: {
        currency: 'USD',
      },
      health: this.getHealth(),
      id: 'openai',
      name: 'OpenAI Provider',
      priority: configured ? 50 : 200,
      rateLimits: {},
      supportedCapabilities: [...this.supportedCapabilities],
      supportedModels: [
        {
          capabilities: [...this.supportedCapabilities],
          id: configuration.model,
          name: configuration.model,
        },
      ],
      version: '1.0.0',
    };
  }

  discoverCapabilities(): AiProviderCapabilityId[] {
    return [...this.supportedCapabilities];
  }

  async execute(
    request: AiProviderExecutionRequest,
  ): Promise<AiProviderExecutionResult> {
    const configuration = this.configService.getOpenAIConfiguration();
    const apiKey = this.configService.getOpenAIApiKey();
    const validationErrors = this.configurationErrors.length
      ? this.configurationErrors
      : this.authProvider.validate(apiKey);

    if (validationErrors.length > 0) {
      throw this.errorMapper.toPlatformError(
        new AIHttpException({
          category: 'authentication',
          code: 'AI_HTTP_AUTHENTICATION_FAILED',
          message: validationErrors.join(', '),
          retryable: false,
        }),
        request.requestId,
      );
    }

    try {
      const response = await this.httpClient.send<OpenAIChatCompletionResponse>(
        {
          baseUrl: configuration.baseUrl,
          defaultHeaders: this.authProvider.createAuthorizationHeaders(apiKey),
          maxRetries: configuration.maxRetries,
          timeoutMs: configuration.timeoutMs,
        },
        {
          body: this.requestMapper.toChatCompletionRequest(
            request,
            configuration.model,
          ),
          correlationId: request.requestId,
          method: 'POST',
          path: '/chat/completions',
        },
      );

      return this.responseMapper.toProviderExecutionResult(
        response.body,
        configuration.model,
      );
    } catch (error) {
      throw this.errorMapper.toPlatformError(error, request.requestId);
    }
  }

  getHealth(): AiProviderHealthDiagnostics {
    const configuration = this.configService.getOpenAIConfiguration();

    return {
      authenticated: configuration.apiKeyConfigured,
      availableModels: [configuration.model],
      checkedAt: new Date(0).toISOString(),
      configured: configuration.apiKeyConfigured,
      latencyMs: undefined,
      message: configuration.apiKeyConfigured
        ? 'OpenAI provider configuration is present.'
        : 'OPENAI_API_KEY is not configured.',
      providerVersion: '1.0.0',
      reachable: false,
      status: configuration.apiKeyConfigured ? 'healthy' : 'unknown',
    };
  }
}
