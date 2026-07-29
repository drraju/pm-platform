import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AiCapability,
  AiConfigService,
  AiLoggerService,
  AiPlatformError,
  AiRequest,
  AiResponse,
} from '../common';
import { AiCapabilityRegistryService } from '../capabilities';
import { AiExecutionContext } from './ai-execution-context';
import { AiGatewayExecutionHandle } from './ai-gateway-contracts';
import { AiGateway } from './ai-gateway.interface';
import { AiPipelineEngineService, AiPipelineResult } from './pipeline';

@Injectable()
export class AiGatewayService implements AiGateway, OnModuleInit {
  constructor(
    private readonly configService: AiConfigService,
    private readonly logger: AiLoggerService,
    private readonly pipelineEngine: AiPipelineEngineService,
    private readonly capabilityRegistry: AiCapabilityRegistryService,
  ) {}

  onModuleInit(): void {
    const config = this.configService.getConfig();

    this.logger.log('AI Gateway core initialized', {
      enabled: config.featureFlags.gateway,
      platformEnabled: config.featureFlags.platform,
    });
  }

  async acceptRequest(request: AiRequest): Promise<AiGatewayExecutionHandle> {
    const context = this.createExecutionContext(request);
    const pipelineResult = await this.pipelineEngine.execute(context);

    return {
      accepted: pipelineResult.status === 'success',
      context: pipelineResult.context,
    };
  }

  createExecutionContext(request: AiRequest): AiExecutionContext {
    return AiExecutionContext.create({
      featureFlags: this.configService.getConfig().featureFlags,
      request,
    });
  }

  async executeRequest(request: AiRequest): Promise<AiResponse> {
    const context = this.createExecutionContext(request);
    const pipelineResult = await this.pipelineEngine.execute(context);

    if (pipelineResult.status === 'failed') {
      return this.toFailedResponse(request, pipelineResult);
    }

    const error = new AiPlatformError({
      category: 'governance',
      code: 'AI_GATEWAY_EXECUTION_NOT_ENABLED',
      correlationId: context.correlationId,
      message: 'AI Gateway execution is not enabled in this milestone.',
      retryable: false,
      safeDetail: 'M2A initializes gateway infrastructure only.',
    });

    return {
      errors: [error.toPayload()],
      requestId: request.requestId,
      status: 'rejected',
      warnings: ['AI Gateway core is initialized but execution is disabled.'],
    };
  }

  validateCapability(capabilityId: string): Promise<AiCapability | null> {
    return Promise.resolve(this.capabilityRegistry.findById(capabilityId));
  }

  private toFailedResponse(
    request: AiRequest,
    pipelineResult: AiPipelineResult,
  ): AiResponse {
    return {
      errors: pipelineResult.error ? [pipelineResult.error] : [],
      requestId: request.requestId,
      status: 'failed',
      warnings: [
        `AI request pipeline failed at stage: ${
          pipelineResult.diagnostics.failedStageName ?? 'unknown'
        }`,
      ],
    };
  }
}
