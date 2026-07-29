import { Injectable } from '@nestjs/common';
import { ContextType } from '../common';
import { AiPromptRegistryService } from './ai-prompt-registry.service';
import {
  AiPromptCompositionContract,
  AiPromptMetadata,
  AiPromptSelectionRequest,
  AiPromptSelectionResult,
} from './prompt-platform.types';

@Injectable()
export class AiPromptResolutionEngineService {
  constructor(private readonly promptRegistry: AiPromptRegistryService) {}

  resolvePrompt(request: AiPromptSelectionRequest): AiPromptSelectionResult {
    const candidates = this.promptRegistry.findPromptsByCapability(
      request.capabilityId,
    );
    const matchingPrompts = candidates.filter((prompt) =>
      this.supportsContextTypes(prompt, request.contextTypes ?? []),
    );
    const selectedPrompt = matchingPrompts[0] ?? null;

    return {
      diagnostics: {
        candidatePromptIds: candidates.map((prompt) => prompt.id),
        omittedPromptIds: candidates
          .filter((prompt) => !matchingPrompts.includes(prompt))
          .map((prompt) => prompt.id),
        precedenceApplied: selectedPrompt ? [selectedPrompt.id] : [],
        selectedPromptId: selectedPrompt?.id,
      },
      prompt: selectedPrompt,
    };
  }

  describeComposition(prompt: AiPromptMetadata): AiPromptCompositionContract {
    return {
      inheritanceChain: [prompt.id],
      overrides: [],
      precedence: [prompt.id],
      promptId: prompt.id,
    };
  }

  private supportsContextTypes(
    prompt: AiPromptMetadata,
    contextTypes: readonly ContextType[],
  ): boolean {
    if (contextTypes.length === 0) {
      return true;
    }

    return contextTypes.every((contextType) =>
      prompt.supportedContextTypes.includes(contextType),
    );
  }
}
