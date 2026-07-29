import { Injectable } from '@nestjs/common';
import { AiPlaceholderPipelineStage } from './placeholder.stage';

@Injectable()
export class AiTelemetryStage extends AiPlaceholderPipelineStage {
  readonly metadata = {
    description: 'Placeholder for future telemetry emission.',
    enabled: true,
    name: 'telemetry' as const,
    order: 100,
  };
}
