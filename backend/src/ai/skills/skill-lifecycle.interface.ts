import {
  AiSkillLifecycleStatus,
  AiSkillMetadata,
} from './skill-platform.types';

export type AiSkillLifecycleTransition = {
  from: AiSkillLifecycleStatus;
  reason: string;
  skillId: string;
  to: AiSkillLifecycleStatus;
};

export interface AiSkillLifecyclePolicy {
  canTransition(transition: AiSkillLifecycleTransition): boolean;
}

export interface AiSkillLifecycleMetadataProvider {
  describeLifecycle(skill: AiSkillMetadata): {
    allowedTransitions: readonly AiSkillLifecycleStatus[];
    currentStatus: AiSkillLifecycleStatus;
    skillId: string;
  };
}
