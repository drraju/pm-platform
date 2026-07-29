import { Injectable } from '@nestjs/common';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import { AiPipelineContext, AiPipelineStageResult } from '../ai-pipeline.types';

@Injectable()
export class AiRequestValidationStage implements AiPipelineStage {
  readonly metadata = {
    description: 'Performs minimal structural validation for AI requests.',
    enabled: true,
    name: 'request_validation' as const,
    order: 10,
  };

  execute(context: AiPipelineContext): Promise<AiPipelineStageResult> {
    const missingFields = [
      ['requestId', context.context.requestId],
      ['correlationId', context.context.correlationId],
      ['requestedCapabilityId', context.context.requestedCapabilityId],
    ]
      .filter(([, value]) => typeof value !== 'string' || value.length === 0)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      return Promise.resolve({
        context: context.context.transitionTo('rejected'),
        error: {
          category: 'validation',
          code: 'AI_REQUEST_INVALID_STRUCTURE',
          correlationId: context.context.correlationId,
          message: 'AI request failed structural validation.',
          retryable: false,
          safeDetail: `Missing required fields: ${missingFields.join(', ')}`,
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
