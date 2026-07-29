import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_PROMPT_DEFINITIONS,
  AiConfigService,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import { builtInPromptDefinitions } from './built-in-prompt-definitions';
import {
  AiPromptMetadata,
  AiPromptRegistryDiagnostics,
} from './prompt-platform.types';

type AiPromptRegistryMetadata = RegistryMetadata & {
  promptId: string;
};

type AiPromptRegistryEntry = RegistryEntry<AiPromptRegistryMetadata> & {
  prompt: AiPromptMetadata;
};

@Injectable()
export class AiPromptRegistryService extends BaseRegistry<AiPromptRegistryEntry> {
  constructor(
    configService: AiConfigService,
    @Optional()
    @Inject(AI_PROMPT_DEFINITIONS)
    prompts: AiPromptMetadata[] = builtInPromptDefinitions,
  ) {
    super(
      prompts.map((prompt) => ({
        metadata: {
          enabled: prompt.lifecycleStatus !== 'retired',
          id: prompt.id,
          lifecycleStatus:
            prompt.lifecycleStatus === 'retired' ? 'retired' : 'registered',
          name: prompt.name,
          priority: prompt.priority,
          promptId: prompt.id,
          version: prompt.version,
        },
        prompt,
      })),
      {
        featureFlagResolver: (entry) =>
          configService.isPromptDefinitionEnabled(entry.metadata.id),
        registryName: 'ai-prompt-registry',
      },
    );
  }

  findPromptById(promptId: string): AiPromptMetadata | null {
    return this.findEntryById(promptId)?.prompt ?? null;
  }

  findPromptsByCapability(capabilityId: string): AiPromptMetadata[] {
    return this.getEnabledEntries()
      .map((entry) => entry.prompt)
      .filter((prompt) => prompt.capabilityId === capabilityId)
      .sort((left, right) => left.priority - right.priority);
  }

  getDiagnostics(): AiPromptRegistryDiagnostics {
    const diagnostics = this.getRegistryDiagnostics();

    return {
      disabledPromptIds: diagnostics.disabledEntryIds,
      enabledPromptIds: diagnostics.enabledEntryIds,
      promptCount: diagnostics.entryCount,
      promptLifecycle: this.discover().map((entry) => ({
        lifecycleStatus: entry.prompt.lifecycleStatus,
        promptId: entry.prompt.id,
      })),
    };
  }

  getPrompts(): AiPromptMetadata[] {
    return this.discover().map((entry) => entry.prompt);
  }
}
