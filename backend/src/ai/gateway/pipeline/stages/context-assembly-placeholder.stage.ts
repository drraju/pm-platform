import { Injectable } from '@nestjs/common';
import { AiContextAggregationService } from '../../../context';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import { AiPipelineContext, AiPipelineStageResult } from '../ai-pipeline.types';

@Injectable()
export class AiContextAssemblyPlaceholderStage implements AiPipelineStage {
  readonly metadata = {
    description:
      'Metadata-only context selection through the Context Registry.',
    enabled: true,
    name: 'context_assembly_placeholder' as const,
    order: 60,
  };

  constructor(private readonly aggregation: AiContextAggregationService) {}

  async execute(input: AiPipelineContext): Promise<AiPipelineStageResult> {
    const result = await this.aggregation.aggregate({
      capabilityId: input.context.requestedCapabilityId,
      executionContext: input.context,
      scope: input.context.scope,
    });
    const contextReferences = result.metadata.map((metadata) => metadata.id);

    return {
      context: input.context
        .withContextReferences(contextReferences)
        .transitionTo('context_assembled'),
      status: 'success',
    };
  }
}
