import { ResourceSkillStatus } from './enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from './enums/skill-proficiency-level.enum';

export interface CreateResourceSkillCommand {
  resourceId: string;
  skillId: string;
  proficiencyLevel: SkillProficiencyLevel;
  yearsExperience?: number | null;
  monthsExperience?: number | null;
  status?: ResourceSkillStatus;
  notes?: string | null;
}

export interface UpdateResourceSkillCommand {
  resourceId?: string;
  skillId?: string;
  proficiencyLevel?: SkillProficiencyLevel;
  yearsExperience?: number | null;
  monthsExperience?: number | null;
  status?: ResourceSkillStatus;
  notes?: string | null;
}

export interface ListResourceSkillsInput {
  includeArchived?: boolean;
  resourceId?: string;
  skillId?: string;
  proficiencyLevel?: SkillProficiencyLevel;
  status?: ResourceSkillStatus;
}
