import { Injectable } from '@nestjs/common';
import { AiCapabilityRoutingService } from '../../../capabilities';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import { AiPipelineContext, AiPipelineStageResult } from '../ai-pipeline.types';

@Injectable()
export class AiProviderDispatchPlaceholderStage implements AiPipelineStage {
  readonly metadata = {
    description: 'Resolves provider metadata for the requested capability.',
    enabled: true,
    name: 'provider_dispatch_placeholder' as const,
    order: 80,
  };

  constructor(private readonly capabilityRouting: AiCapabilityRoutingService) {}

  execute(context: AiPipelineContext): Promise<AiPipelineStageResult> {
    const route = this.capabilityRouting.resolveCapabilityRoute(
      context.context.requestedCapabilityId,
    );

    return Promise.resolve({
      context: context.context
        .withSelectedProvider(route?.selectedProvider?.id)
        .transitionTo('provider_selected'),
      status: 'success',
    });
  }
}
