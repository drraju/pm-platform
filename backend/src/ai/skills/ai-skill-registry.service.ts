import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_SKILL_DEFINITIONS,
  AiConfigService,
  BaseRegistry,
  RegistryEntry,
  RegistryMetadata,
} from '../common';
import { builtInSkillDefinitions } from './built-in-skill-definitions';
import {
  AiSkillMetadata,
  AiSkillRegistryDiagnostics,
} from './skill-platform.types';

type AiSkillRegistryMetadata = RegistryMetadata & {
  skillId: string;
};

type AiSkillRegistryEntry = RegistryEntry<AiSkillRegistryMetadata> & {
  skill: AiSkillMetadata;
};

@Injectable()
export class AiSkillRegistryService extends BaseRegistry<AiSkillRegistryEntry> {
  constructor(
    configService: AiConfigService,
    @Optional()
    @Inject(AI_SKILL_DEFINITIONS)
    skills: AiSkillMetadata[] = builtInSkillDefinitions,
  ) {
    super(
      skills.map((skill) => ({
        metadata: {
          enabled: skill.lifecycleStatus !== 'retired',
          id: skill.id,
          lifecycleStatus:
            skill.lifecycleStatus === 'retired' ? 'retired' : 'registered',
          name: skill.name,
          priority: skill.priority,
          skillId: skill.id,
          version: skill.version,
        },
        skill,
      })),
      {
        featureFlagResolver: (entry) =>
          configService.isSkillDefinitionEnabled(entry.metadata.id),
        registryName: 'ai-skill-registry',
        validation: (entry) => ({
          errors: AiSkillRegistryService.validateSkillMetadata(entry.skill),
          valid:
            AiSkillRegistryService.validateSkillMetadata(entry.skill).length ===
            0,
        }),
      },
    );
  }

  findSkillById(skillId: string): AiSkillMetadata | null {
    return this.findEntryById(skillId)?.skill ?? null;
  }

  findSkillsByCapability(capabilityId: string): AiSkillMetadata[] {
    return this.getEnabledEntries()
      .map((entry) => entry.skill)
      .filter((skill) => skill.requiredCapabilities.includes(capabilityId))
      .sort((left, right) => left.priority - right.priority);
  }

  getDiagnostics(): AiSkillRegistryDiagnostics {
    const diagnostics = this.getRegistryDiagnostics();

    return {
      disabledSkillIds: diagnostics.disabledEntryIds,
      enabledSkillIds: diagnostics.enabledEntryIds,
      skillCount: diagnostics.entryCount,
      skillLifecycle: this.discover().map((entry) => ({
        lifecycleStatus: entry.skill.lifecycleStatus,
        skillId: entry.skill.id,
      })),
    };
  }

  getSkills(): AiSkillMetadata[] {
    return this.discover().map((entry) => entry.skill);
  }

  private static validateSkillMetadata(skill: AiSkillMetadata): string[] {
    const errors = [
      skill.description ? '' : 'description is required',
      skill.owner ? '' : 'owner is required',
      skill.requiredCapabilities.length > 0
        ? ''
        : 'at least one required capability is required',
    ];

    return errors.filter(Boolean);
  }
}
