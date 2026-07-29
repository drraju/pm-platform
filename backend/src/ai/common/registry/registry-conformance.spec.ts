import { Test } from '@nestjs/testing';
import { AiModule } from '../..';
import { AI_MCP_TOOLS } from '../tokens';
import { AiCapabilityRegistryService } from '../../capabilities';
import { ConversationRegistryService } from '../../conversation';
import { AiContextRegistryService } from '../../context';
import { McpToolRegistryService } from '../../mcp';
import { AiPromptRegistryService } from '../../prompts';
import { AiProviderRegistryService } from '../../providers';
import { AiSkillRegistryService } from '../../skills';
import { BaseRegistry } from './base-registry';
import { RegistryEntry } from './registry.types';

type ConformanceTarget = {
  expectedFirstId: string;
  expectedRegistryName: string;
  registry: BaseRegistry<RegistryEntry>;
};

const expectRegistryConformance = (target: ConformanceTarget) => {
  const orderedEntryIds = target.registry
    .discover()
    .map((entry) => entry.metadata.id);

  expect(orderedEntryIds[0]).toBe(target.expectedFirstId);
  expect(target.registry.findEntryById(target.expectedFirstId)).not.toBeNull();
  expect(target.registry.setEnabled(target.expectedFirstId, false)).toBe(true);
  expect(
    target.registry.getEnabledEntries().map((entry) => entry.metadata.id),
  ).not.toContain(target.expectedFirstId);
  expect(target.registry.getRegistryDiagnostics()).toMatchObject({
    disabledEntryIds: [target.expectedFirstId],
    duplicateEntryIds: [],
    invalidEntryIds: [],
    registryName: target.expectedRegistryName,
  });
  expect(target.registry.setEnabled(target.expectedFirstId, true)).toBe(true);
  expect(
    target.registry.getEnabledEntries().map((entry) => entry.metadata.id),
  ).toContain(target.expectedFirstId);
};

describe('AI registry conformance', () => {
  it('applies shared registry behavior to core AI registries', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();

    expectRegistryConformance({
      expectedFirstId: 'chat',
      expectedRegistryName: 'ai-capability-registry',
      registry: moduleRef.get(AiCapabilityRegistryService),
    });
    expectRegistryConformance({
      expectedFirstId: 'mock',
      expectedRegistryName: 'ai-provider-registry',
      registry: moduleRef.get(AiProviderRegistryService),
    });
    expectRegistryConformance({
      expectedFirstId: 'project-context',
      expectedRegistryName: 'ai-context-registry',
      registry: moduleRef.get(AiContextRegistryService),
    });
    expectRegistryConformance({
      expectedFirstId: 'internal-assistant-conversation',
      expectedRegistryName: 'ai-conversation-registry',
      registry: moduleRef.get(ConversationRegistryService),
    });
    expectRegistryConformance({
      expectedFirstId: 'assistant-chat-foundation',
      expectedRegistryName: 'ai-prompt-registry',
      registry: moduleRef.get(AiPromptRegistryService),
    });
    expectRegistryConformance({
      expectedFirstId: 'project-delivery-assistant',
      expectedRegistryName: 'ai-skill-registry',
      registry: moduleRef.get(AiSkillRegistryService),
    });

    await moduleRef.close();
  });

  it('applies shared registry behavior to MCP registries', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    })
      .overrideProvider(AI_MCP_TOOLS)
      .useValue([
        {
          capabilityId: 'chat',
          id: 'conformance-tool',
          lifecycleStatus: 'enabled',
          name: 'Conformance Tool',
          priority: 10,
          requiredPermissions: [],
          title: 'Conformance Tool',
          version: '1.0.0',
        },
      ])
      .compile();

    expectRegistryConformance({
      expectedFirstId: 'conformance-tool',
      expectedRegistryName: 'mcp-tool-registry',
      registry: moduleRef.get(McpToolRegistryService),
    });

    await moduleRef.close();
  });
});
