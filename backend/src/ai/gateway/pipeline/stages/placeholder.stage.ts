import { AiLifecycleState } from '../../../common';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import {
  AiPipelineContext,
  AiPipelineStageName,
  AiPipelineStageResult,
} from '../ai-pipeline.types';

export abstract class AiPlaceholderPipelineStage implements AiPipelineStage {
  abstract readonly metadata: {
    description: string;
    enabled: boolean;
    name: AiPipelineStageName;
    order: number;
  };

  protected readonly lifecycleState?: AiLifecycleState;

  execute(context: AiPipelineContext): Promise<AiPipelineStageResult> {
    return Promise.resolve({
      context: this.lifecycleState
        ? context.context.transitionTo(this.lifecycleState)
        : context.context,
      status: 'success',
    });
  }
}
