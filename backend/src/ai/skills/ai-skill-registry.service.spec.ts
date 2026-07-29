import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { AI_SKILL_DEFINITIONS } from '../common';
import { AiSkillDependencyGraphService } from './ai-skill-dependency-graph.service';
import { AiSkillRegistryService } from './ai-skill-registry.service';
import { AiSkillResolutionService } from './ai-skill-resolution.service';
import { builtInSkillDefinitions } from './built-in-skill-definitions';
import { AiSkillMetadata } from './skill-platform.types';

describe('AiSkillRegistryService', () => {
  const createModule = async () =>
    Test.createTestingModule({
      imports: [AiModule],
    }).compile();

  afterEach(() => {
    delete process.env.AI_SKILL_PROJECT_DELIVERY_ASSISTANT_ENABLED;
  });

  it('discovers built-in skill metadata in priority order', async () => {
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiSkillRegistryService);

    expect(registry.getSkills().map((skill) => skill.id)).toEqual([
      'project-delivery-assistant',
      'raid-analysis-assistant',
      'portfolio-status-assistant',
    ]);
    expect(registry.getDiagnostics()).toMatchObject({
      skillCount: 3,
    });

    await moduleRef.close();
  });

  it('supports skill disablement through configuration', async () => {
    process.env.AI_SKILL_PROJECT_DELIVERY_ASSISTANT_ENABLED = 'false';
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiSkillRegistryService);

    expect(registry.findSkillById('project-delivery-assistant')).not.toBeNull();
    expect(registry.findSkillsByCapability('chat')).toEqual([]);
    expect(registry.getDiagnostics().disabledSkillIds).toContain(
      'project-delivery-assistant',
    );

    await moduleRef.close();
  });

  it('resolves skill metadata without execution', async () => {
    const moduleRef = await createModule();
    const resolution = moduleRef.get(AiSkillResolutionService);

    const result = resolution.resolveSkill({
      capabilityId: 'reasoning',
      contextTypes: ['raid', 'project'],
      promptCategories: ['analysis'],
      providerFeatures: ['reasoning'],
    });

    expect(result.skill).toMatchObject({
      id: 'raid-analysis-assistant',
      lifecycleStatus: 'draft',
      requiredCapabilities: ['reasoning'],
    });
    expect(result.diagnostics).toMatchObject({
      candidateSkillIds: ['raid-analysis-assistant'],
      selectedSkillId: 'raid-analysis-assistant',
    });

    await moduleRef.close();
  });

  it('builds a metadata-only skill dependency graph', async () => {
    const moduleRef = await createModule();
    const graphService = moduleRef.get(AiSkillDependencyGraphService);

    const graph = graphService.buildGraph();

    expect(graph.nodes.map((node) => node.skillId)).toEqual([
      'project-delivery-assistant',
      'raid-analysis-assistant',
      'portfolio-status-assistant',
    ]);
    expect(graph.edges).toContainEqual({
      fromSkillId: 'project-delivery-assistant',
      requiredness: 'required',
      targetId: 'chat',
      type: 'capability',
    });

    await moduleRef.close();
  });

  it('validates skill metadata during registry construction', async () => {
    const invalidSkill: AiSkillMetadata = {
      ...builtInSkillDefinitions[0],
      description: '',
      id: 'invalid-skill',
    };

    await expect(
      Test.createTestingModule({
        imports: [AiModule],
      })
        .overrideProvider(AI_SKILL_DEFINITIONS)
        .useValue([invalidSkill])
        .compile(),
    ).rejects.toThrow(
      "Invalid registry entry 'invalid-skill' in ai-skill-registry",
    );
  });
});
