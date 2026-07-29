import {
  AiPipelineContext,
  AiPipelineStageMetadata,
  AiPipelineStageResult,
} from './ai-pipeline.types';

export interface AiPipelineStage {
  readonly metadata: AiPipelineStageMetadata;
  execute(context: AiPipelineContext): Promise<AiPipelineStageResult>;
}
