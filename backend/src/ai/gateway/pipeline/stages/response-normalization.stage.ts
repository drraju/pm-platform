import { Injectable } from '@nestjs/common';
import { AiPlaceholderPipelineStage } from './placeholder.stage';

@Injectable()
export class AiResponseNormalizationStage extends AiPlaceholderPipelineStage {
  readonly metadata = {
    description: 'Placeholder for future response normalization.',
    enabled: true,
    name: 'response_normalization' as const,
    order: 90,
  };

  protected readonly lifecycleState = 'response_processed' as const;
}
