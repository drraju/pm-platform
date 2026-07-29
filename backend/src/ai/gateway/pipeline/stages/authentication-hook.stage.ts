import { Injectable } from '@nestjs/common';
import { AiPlaceholderPipelineStage } from './placeholder.stage';

@Injectable()
export class AiAuthenticationHookStage extends AiPlaceholderPipelineStage {
  readonly metadata = {
    description: 'Placeholder for future authentication integration.',
    enabled: true,
    name: 'authentication_hook' as const,
    order: 20,
  };

  protected readonly lifecycleState = 'authenticated' as const;
}
