import { Injectable } from '@nestjs/common';
import { AiPromptResolutionEngineService } from '../../../prompts';
import { AiPipelineStage } from '../ai-pipeline-stage.interface';
import { AiPipelineContext, AiPipelineStageResult } from '../ai-pipeline.types';

@Injectable()
export class AiPromptResolutionPlaceholderStage implements AiPipelineStage {
  readonly metadata = {
    description: 'Metadata-only prompt resolution through the Prompt Registry.',
    enabled: true,
    name: 'prompt_resolution_placeholder' as const,
    order: 70,
  };

  constructor(
    private readonly resolutionEngine: AiPromptResolutionEngineService,
  ) {}

  execute(input: AiPipelineContext): Promise<AiPipelineStageResult> {
    const result = this.resolutionEngine.resolvePrompt({
      capabilityId: input.context.requestedCapabilityId,
      executionContext: input.context,
    });

    return Promise.resolve({
      context: input.context
        .withPromptMetadata({
          promptDiagnostics: result.diagnostics,
          promptId: result.prompt?.id,
          promptVersion: result.prompt?.version,
        })
        .transitionTo('prompt_resolved'),
      status: 'success',
    });
  }
}
