import { Injectable } from '@nestjs/common';
import { ContextType } from '../common';
import { AiSkillRegistryService } from './ai-skill-registry.service';
import {
  AiSkillMetadata,
  AiSkillResolutionRequest,
  AiSkillResolutionResult,
} from './skill-platform.types';

@Injectable()
export class AiSkillResolutionService {
  constructor(private readonly skillRegistry: AiSkillRegistryService) {}

  resolveSkill(request: AiSkillResolutionRequest): AiSkillResolutionResult {
    const candidates = this.resolveCandidates(request);
    const compatibleSkills = candidates.filter((skill) =>
      this.matchesCompatibility(skill, request),
    );
    const selectedSkill = compatibleSkills[0] ?? null;

    return {
      diagnostics: {
        candidateSkillIds: candidates.map((skill) => skill.id),
        omittedSkillIds: candidates
          .filter((skill) => !compatibleSkills.includes(skill))
          .map((skill) => skill.id),
        selectedSkillId: selectedSkill?.id,
      },
      skill: selectedSkill,
    };
  }

  private resolveCandidates(
    request: AiSkillResolutionRequest,
  ): AiSkillMetadata[] {
    if (request.skillId) {
      const skill = this.skillRegistry.findSkillById(request.skillId);

      return skill ? [skill] : [];
    }

    if (request.capabilityId) {
      return this.skillRegistry.findSkillsByCapability(request.capabilityId);
    }

    return this.skillRegistry.getSkills();
  }

  private matchesCompatibility(
    skill: AiSkillMetadata,
    request: AiSkillResolutionRequest,
  ): boolean {
    return (
      this.matchesRequiredContext(skill, request.contextTypes) &&
      this.matchesAll(
        request.promptCategories,
        skill.requiredPromptCategories,
      ) &&
      this.matchesAll(request.providerFeatures, skill.requiredProviderFeatures)
    );
  }

  private matchesRequiredContext(
    skill: AiSkillMetadata,
    availableContextTypes: readonly ContextType[] | undefined,
  ): boolean {
    if (!availableContextTypes?.length) {
      return true;
    }

    return skill.contextRequirements.required.every((contextType) =>
      availableContextTypes.includes(contextType),
    );
  }

  private matchesAll<TValue>(
    requestedValues: readonly TValue[] | undefined,
    supportedValues: readonly TValue[],
  ): boolean {
    if (!requestedValues?.length) {
      return true;
    }

    return requestedValues.every((value) => supportedValues.includes(value));
  }
}
