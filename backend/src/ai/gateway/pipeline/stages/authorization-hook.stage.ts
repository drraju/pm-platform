import { Injectable } from '@nestjs/common';
import { AiPlaceholderPipelineStage } from './placeholder.stage';

@Injectable()
export class AiAuthorizationHookStage extends AiPlaceholderPipelineStage {
  readonly metadata = {
    description: 'Placeholder for future authorization integration.',
    enabled: true,
    name: 'authorization_hook' as const,
    order: 30,
  };

  protected readonly lifecycleState = 'authorized' as const;
}
