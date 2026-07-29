import { Injectable } from '@nestjs/common';
import { AiContextRegistryService } from './ai-context-registry.service';
import {
  AiContextAggregationResult,
  AiContextMetadata,
  AiContextSelectionRequest,
} from './context-provider.types';

@Injectable()
export class AiContextAggregationService {
  constructor(private readonly registry: AiContextRegistryService) {}

  async aggregate(
    request: AiContextSelectionRequest,
  ): Promise<AiContextAggregationResult> {
    const selections = await this.registry.selectContextMetadata(request);
    const metadata = selections
      .flatMap((selection) => [...selection.metadata])
      .sort((left, right) => left.priority - right.priority);
    const uniqueMetadata = this.removeDuplicateMetadata(metadata);

    return {
      diagnostics: {
        duplicateDetectionApplied: metadata.length !== uniqueMetadata.length,
        mergeStrategy: 'priority',
        omittedProviderIds: [],
        selectedProviderIds: selections.map(
          (selection) => selection.provider.id,
        ),
        totalEstimatedTokens: uniqueMetadata.reduce(
          (total, item) => total + item.estimatedTokenSize,
          0,
        ),
      },
      metadata: uniqueMetadata,
    };
  }

  private removeDuplicateMetadata(
    metadata: readonly AiContextMetadata[],
  ): readonly AiContextMetadata[] {
    const seenMetadataIds = new Set<string>();

    return metadata.filter((item) => {
      if (seenMetadataIds.has(item.id)) {
        return false;
      }

      seenMetadataIds.add(item.id);
      return true;
    });
  }
}
