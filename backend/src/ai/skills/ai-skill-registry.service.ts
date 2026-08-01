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
import { AiIntent, AiIntentValidationResult } from './intent.types';
import { AiSkillValidationResult } from './skill-validation.interface';

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

  findSkill(skillId: string): AiSkillMetadata | null {
    return this.findSkillById(skillId);
  }

  registerSkill(skill: AiSkillMetadata): void {
    this.register(this.toEntry(skill));
  }

  validateSkill(skill: AiSkillMetadata): AiSkillValidationResult {
    const errors = AiSkillRegistryService.validateSkillMetadata(skill);
    return { errors, valid: errors.length === 0, warnings: [] };
  }

  validateIntent(intent: AiIntent): AiIntentValidationResult {
    const skill = this.findSkillById(intent.skillId);
    const errors = [
      intent.id ? '' : 'intent id is required',
      intent.skillId ? '' : 'intent skillId is required',
      skill ? '' : `skill '${intent.skillId}' is not registered`,
    ].filter(Boolean);
    return { errors, valid: errors.length === 0 };
  }

  validateContextRequirements(
    skillId: string,
    availableContextTypes: readonly string[],
  ): AiIntentValidationResult {
    const skill = this.findSkillById(skillId);
    if (!skill) {
      return { errors: [`skill '${skillId}' is not registered`], valid: false };
    }
    const errors = skill.contextRequirements.required
      .filter((contextType) => !availableContextTypes.includes(contextType))
      .map((contextType) => `required context '${contextType}' is missing`);
    return { errors, valid: errors.length === 0 };
  }

  validateAuthorization(
    skillId: string,
    permissions: readonly string[],
    roles: readonly string[] = [],
    allowSensitiveContext = false,
  ): AiIntentValidationResult {
    const skill = this.findSkillById(skillId);
    if (!skill) {
      return { errors: [`skill '${skillId}' is not registered`], valid: false };
    }
    const rules = skill.authorizationRules;
    const errors = [
      ...rules.requiredPermissions
        .filter((permission) => !permissions.includes(permission))
        .map((permission) => `permission '${permission}' is missing`),
      ...(rules.allowedRoles?.length &&
      !rules.allowedRoles.some((role) => roles.includes(role))
        ? ['an allowed role is required']
        : []),
      ...(!rules.allowSensitiveContext && allowSensitiveContext
        ? ['sensitive context is not allowed']
        : []),
    ];
    return { errors, valid: errors.length === 0 };
  }

  validatePromptCompatibility(
    skillId: string,
    prompt: { sections: readonly { type: string }[] },
  ): AiIntentValidationResult {
    const skill = this.findSkillById(skillId);
    if (!skill) {
      return { errors: [`skill '${skillId}' is not registered`], valid: false };
    }
    const sectionTypes = prompt.sections.map((section) => section.type);
    const errors = skill.contextRequirements.required
      .filter((contextType) => !sectionTypes.includes(contextType))
      .map((contextType) => `prompt section '${contextType}' is missing`);
    return { errors, valid: errors.length === 0 };
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
      skill.displayName ? '' : 'displayName is required',
      skill.description ? '' : 'description is required',
      skill.owner ? '' : 'owner is required',
      skill.requiredCapabilities.length > 0
        ? ''
        : 'at least one required capability is required',
      skill.contextRequirements.required.length > 0
        ? ''
        : 'at least one required context is required',
      skill.supportedResponseFormats.length > 0
        ? ''
        : 'at least one supported response format is required',
      skill.authorizationRules.requiredPermissions.length > 0
        ? ''
        : 'at least one authorization permission is required',
    ];

    return errors.filter(Boolean);
  }

  private toEntry(skill: AiSkillMetadata): AiSkillRegistryEntry {
    return {
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
    };
  }
}
