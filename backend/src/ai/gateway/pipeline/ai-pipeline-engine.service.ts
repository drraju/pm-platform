import { Injectable } from '@nestjs/common';
import { AiPlatformError } from '../../common';
import { AiExecutionContext } from '../ai-execution-context';
import { AiStageRegistryService } from './ai-stage-registry.service';
import {
  AiPipelineDiagnostics,
  AiPipelineResult,
  AiPipelineStageDiagnostic,
  AiPipelineStageResult,
} from './ai-pipeline.types';

@Injectable()
export class AiPipelineEngineService {
  constructor(private readonly stageRegistry: AiStageRegistryService) {}

  async execute(initialContext: AiExecutionContext): Promise<AiPipelineResult> {
    let context = initialContext;
    const diagnostics: AiPipelineDiagnostics = {
      stages: [],
      startedAt: new Date().toISOString(),
    };

    for (const stage of this.stageRegistry.getEnabledStages()) {
      const startTime = new Date();
      let stageResult: AiPipelineStageResult;

      try {
        stageResult = await stage.execute({ context, diagnostics });
      } catch (error) {
        stageResult = {
          context,
          error: new AiPlatformError({
            category: 'system',
            code: 'AI_PIPELINE_STAGE_ERROR',
            correlationId: context.correlationId,
            message: `AI pipeline stage failed: ${stage.metadata.name}`,
            retryable: false,
            safeDetail:
              error instanceof Error ? error.message : 'Unknown stage error',
          }).toPayload(),
          status: 'failed',
        };
      }

      const endTime = new Date();
      diagnostics.stages.push(
        this.createStageDiagnostic(
          stage.metadata.name,
          startTime,
          endTime,
          stageResult,
        ),
      );

      context = stageResult.context;

      if (stageResult.status === 'failed') {
        diagnostics.completedAt = endTime.toISOString();
        diagnostics.failedStageName = stage.metadata.name;

        return {
          context: context.transitionTo('failed', endTime.toISOString()),
          diagnostics,
          error: stageResult.error,
          status: 'failed',
        };
      }
    }

    diagnostics.completedAt = new Date().toISOString();

    return {
      context,
      diagnostics,
      status: 'success',
    };
  }

  private createStageDiagnostic(
    stageName: AiPipelineStageDiagnostic['stageName'],
    startTime: Date,
    endTime: Date,
    result: AiPipelineStageResult,
  ): AiPipelineStageDiagnostic {
    return {
      durationMs: endTime.getTime() - startTime.getTime(),
      endTime: endTime.toISOString(),
      failureReason: result.error?.safeDetail ?? result.error?.message,
      result: result.status,
      stageName,
      startTime: startTime.toISOString(),
    };
  }
}
