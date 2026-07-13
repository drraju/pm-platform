import { SkillStatus } from './enums/skill-status.enum';

export interface CreateSkillCommand {
  name: string;
  category?: string | null;
  status?: SkillStatus;
  description?: string | null;
}

export interface UpdateSkillCommand {
  name?: string;
  category?: string | null;
  status?: SkillStatus;
  description?: string | null;
}

export interface ListSkillsInput {
  includeArchived?: boolean;
  category?: string;
  search?: string;
  status?: SkillStatus;
}
