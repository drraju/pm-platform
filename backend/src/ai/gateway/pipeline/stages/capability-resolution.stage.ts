import { Injectable } from '@nestjs/common';
import { AiCapabilityRegistryService } from '../../../capabilities';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import { AiPipelineContext, AiPipelineStageResult } from '../ai-pipeline.types';

@Injectable()
export class AiCapabilityResolutionStage implements AiPipelineStage {
  readonly metadata = {
    description: 'Resolves requested AI capability metadata.',
    enabled: true,
    name: 'capability_resolution' as const,
    order: 50,
  };

  constructor(
    private readonly capabilityRegistry: AiCapabilityRegistryService,
  ) {}

  execute(context: AiPipelineContext): Promise<AiPipelineStageResult> {
    const capability = this.capabilityRegistry.findById(
      context.context.requestedCapabilityId,
    );

    if (!capability) {
      return Promise.resolve({
        context: context.context.transitionTo('rejected'),
        error: {
          category: 'validation',
          code: 'AI_CAPABILITY_NOT_REGISTERED',
          correlationId: context.context.correlationId,
          message: 'Requested AI capability is not registered.',
          retryable: false,
          safeDetail: `Unknown capability: ${context.context.requestedCapabilityId}`,
        },
        status: 'failed',
      });
    }

    return Promise.resolve({
      context: context.context,
      status: 'success',
    });
  }
}
