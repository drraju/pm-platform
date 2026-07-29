import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_GATEWAY_PIPELINE_STAGES,
  AiConfigService,
  OrderedRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../../common';
import { AiPipelineStage } from './ai-pipeline-stage.interface';

type AiStageRegistryMetadata = RegistryMetadata & {
  stageName: string;
};

type AiStageRegistryEntry = RegistryEntry<AiStageRegistryMetadata> & {
  stage: AiPipelineStage;
};

@Injectable()
export class AiStageRegistryService extends OrderedRegistry<AiStageRegistryEntry> {
  constructor(
    configService: AiConfigService,
    @Optional()
    @Inject(AI_GATEWAY_PIPELINE_STAGES)
    stages: AiPipelineStage[] = [],
  ) {
    super(
      stages.map((stage) => ({
        metadata: {
          enabled: stage.metadata.enabled,
          id: stage.metadata.name,
          lifecycleStatus: stage.metadata.enabled ? 'registered' : 'disabled',
          name: stage.metadata.description,
          priority: stage.metadata.order,
          stageName: stage.metadata.name,
          version: '1.0.0',
        },
        stage,
      })),
      {
        featureFlagResolver: (entry) =>
          configService.isPipelineStageEnabled(entry.metadata.stageName),
        registryName: 'ai-stage-registry',
      },
    );
  }

  getEnabledStages(): AiPipelineStage[] {
    return this.getEnabledEntries().map((entry) => entry.stage);
  }

  getOrderedStages(): AiPipelineStage[] {
    return this.getOrderedEntries().map((entry) => entry.stage);
  }
}
