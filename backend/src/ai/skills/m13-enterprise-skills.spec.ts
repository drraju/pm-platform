import { AiSkillRegistryService } from './ai-skill-registry.service';
import { builtInSkillDefinitions } from './built-in-skill-definitions';
import { AiIntent } from './intent.types';

describe('M13 enterprise skills contract', () => {
  const registry = new AiSkillRegistryService({
    isSkillDefinitionEnabled: () => true,
  } as never, builtInSkillDefinitions);

  it('registers declarative skills with context and response requirements', () => {
    const skill = registry.findSkill('raid-analysis-assistant');
    expect(skill).toMatchObject({
      contextRequirements: {
        required: ['project', 'raid'],
      },
      supportedResponseFormats: expect.arrayContaining(['markdown']),
    });
    expect(registry.validateSkill(skill!)).toMatchObject({ valid: true });
  });

  it('validates explicit intents without performing NLP', () => {
    const intent: AiIntent = {
      id: 'RISK_REVIEW',
      skillId: 'raid-analysis-assistant',
    };
    expect(registry.validateIntent(intent)).toEqual({ errors: [], valid: true });
  });

  it('validates required context, authorization, and composed prompt sections', () => {
    expect(
      registry.validateContextRequirements('raid-analysis-assistant', [
        'project',
        'raid',
      ]),
    ).toMatchObject({ valid: true });
    expect(
      registry.validateAuthorization('raid-analysis-assistant', [
        'project.read',
        'raid.read',
      ]),
    ).toMatchObject({ valid: true });
    expect(
      registry.validatePromptCompatibility('raid-analysis-assistant', {
        sections: [{ type: 'project' }, { type: 'raid' }],
      }),
    ).toMatchObject({ valid: true });
  });

  it('rejects missing required context and permissions', () => {
    expect(
      registry.validateContextRequirements('raid-analysis-assistant', ['project']),
    ).toMatchObject({ valid: false });
    expect(
      registry.validateAuthorization('raid-analysis-assistant', ['project.read']),
    ).toMatchObject({ valid: false });
  });
});
