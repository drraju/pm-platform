import { Injectable } from '@nestjs/common';
import { AiSkillRegistryService } from './ai-skill-registry.service';
import {
  AiSkillDependencyGraph,
  AiSkillDependencyGraphEdge,
  AiSkillMetadata,
} from './skill-platform.types';

@Injectable()
export class AiSkillDependencyGraphService {
  constructor(private readonly skillRegistry: AiSkillRegistryService) {}

  buildGraph(): AiSkillDependencyGraph {
    const skills = this.skillRegistry.getSkills();

    return {
      edges: skills.flatMap((skill) => this.createEdges(skill)),
      nodes: skills.map((skill) => ({
        lifecycleStatus: skill.lifecycleStatus,
        skillId: skill.id,
        version: skill.version,
      })),
    };
  }

  private createEdges(skill: AiSkillMetadata): AiSkillDependencyGraphEdge[] {
    return [
      ...skill.dependencies.capabilities.map((dependency) => ({
        fromSkillId: skill.id,
        requiredness: dependency.requiredness,
        targetId: dependency.capabilityId,
        type: 'capability' as const,
      })),
      ...skill.dependencies.contextTypes.map((dependency) => ({
        fromSkillId: skill.id,
        requiredness: dependency.requiredness,
        targetId: dependency.contextType,
        type: 'context' as const,
      })),
      ...skill.dependencies.promptCategories.map((dependency) => ({
        fromSkillId: skill.id,
        requiredness: dependency.requiredness,
        targetId: dependency.category,
        type: 'prompt' as const,
      })),
      ...skill.dependencies.providerFeatures.map((dependency) => ({
        fromSkillId: skill.id,
        requiredness: dependency.requiredness,
        targetId: dependency.feature,
        type: 'provider-feature' as const,
      })),
      ...skill.dependencies.futureSkillDependencies.map((dependency) => ({
        fromSkillId: skill.id,
        requiredness: dependency.requiredness,
        targetId: dependency.skillId,
        type: 'future-skill' as const,
      })),
      ...skill.dependencies.futureAgentDependencies.map((dependency) => ({
        fromSkillId: skill.id,
        requiredness: dependency.requiredness,
        targetId: dependency.agentId,
        type: 'future-agent' as const,
      })),
    ];
  }
}
