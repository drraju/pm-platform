import { Injectable } from '@nestjs/common';
import { AiPlaceholderPipelineStage } from './placeholder.stage';

@Injectable()
export class AiAuditStage extends AiPlaceholderPipelineStage {
  readonly metadata = {
    description: 'Placeholder for future audit emission.',
    enabled: true,
    name: 'audit' as const,
    order: 110,
  };

  protected readonly lifecycleState = 'audited' as const;
}
