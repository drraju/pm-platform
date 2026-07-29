import { AiSkillMetadata } from './skill-platform.types';
import { AiSkillValidationResult } from './skill-validation.interface';

export interface AISkill {
  describeSkill(): AiSkillMetadata;
  validateSkillMetadata(): Promise<AiSkillValidationResult>;
}
