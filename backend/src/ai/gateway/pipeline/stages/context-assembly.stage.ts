import { Injectable } from '@nestjs/common';
import {
  AiContextAggregationService,
  EnterpriseContextAssemblyService,
} from '../../../context';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import { AiPipelineContext, AiPipelineStageResult } from '../ai-pipeline.types';

@Injectable()
export class AiContextAssemblyStage implements AiPipelineStage {
  readonly metadata = {
    description:
      'Permission-aware enterprise context assembly through registered providers.',
    enabled: true,
    name: 'context_assembly' as const,
    order: 60,
  };

  constructor(
    private readonly aggregation: AiContextAggregationService,
    private readonly assembly: EnterpriseContextAssemblyService,
  ) {}

  async execute(input: AiPipelineContext): Promise<AiPipelineStageResult> {
    const result = await this.aggregation.aggregate({
      capabilityId: input.context.requestedCapabilityId,
      executionContext: input.context,
      scope: input.context.scope,
    });
    const contextReferences = result.metadata.map((metadata) => metadata.id);
    const enterpriseContextInput = input.context.requestMetadata
      .enterpriseContext as
      | {
          authorization?: Parameters<EnterpriseContextAssemblyService['assemble']>[0]['authorization'];
          limits?: Parameters<EnterpriseContextAssemblyService['assemble']>[0]['limits'];
          sourceData?: Parameters<EnterpriseContextAssemblyService['assemble']>[0]['sourceData'];
        }
      | undefined;
    const assembled = await this.assembly.assemble({
      authorization: enterpriseContextInput?.authorization,
      capabilityId: input.context.requestedCapabilityId,
      executionContext: input.context,
      limits: enterpriseContextInput?.limits,
      scope: input.context.scope,
      sourceData: enterpriseContextInput?.sourceData,
    });

    return {
      context: input.context
        .withContextReferences(contextReferences)
        .withPromptMetadata({
          enterpriseContext: assembled.context,
          enterpriseContextDiagnostics: assembled.diagnostics,
        })
        .transitionTo('context_assembled'),
      status: 'success',
    };
  }
}
