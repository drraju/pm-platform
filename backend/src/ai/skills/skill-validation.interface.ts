import {
  AiSkillDependencyGraph,
  AiSkillMetadata,
} from './skill-platform.types';

export type AiSkillValidationResult = {
  errors: readonly string[];
  valid: boolean;
  warnings: readonly string[];
};

export interface AiSkillDependencyValidator {
  validateDependencies(
    skill: AiSkillMetadata,
    graph: AiSkillDependencyGraph,
  ): Promise<AiSkillValidationResult>;
}

export interface AiSkillCompatibilityValidator {
  validateCompatibility(
    skill: AiSkillMetadata,
  ): Promise<AiSkillValidationResult>;
}

export interface AiSkillConfigurationValidator {
  validateConfiguration(
    skill: AiSkillMetadata,
  ): Promise<AiSkillValidationResult>;
}

export interface AiSkillVersionValidator {
  validateVersion(skill: AiSkillMetadata): Promise<AiSkillValidationResult>;
}
