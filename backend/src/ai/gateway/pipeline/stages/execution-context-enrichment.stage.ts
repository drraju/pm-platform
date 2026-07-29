import { Injectable } from '@nestjs/common';
import { AiPlaceholderPipelineStage } from './placeholder.stage';

@Injectable()
export class AiExecutionContextEnrichmentStage extends AiPlaceholderPipelineStage {
  readonly metadata = {
    description: 'Placeholder for future metadata enrichment.',
    enabled: true,
    name: 'execution_context_enrichment' as const,
    order: 40,
  };
}
