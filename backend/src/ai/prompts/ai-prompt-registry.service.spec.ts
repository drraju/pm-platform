import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { AiConfigService } from '../common';
import { AiExecutionContext } from '../gateway';
import { AiPromptRegistryService } from './ai-prompt-registry.service';
import { AiPromptResolutionEngineService } from './ai-prompt-resolution-engine.service';

describe('AiPromptRegistryService', () => {
  const createExecutionContext = () => {
    const featureFlags = new AiConfigService().getConfig().featureFlags;

    return AiExecutionContext.create({
      featureFlags,
      request: {
        capabilityId: 'chat',
        correlationId: 'corr-prompt-1',
        input: {},
        requestId: 'req-prompt-1',
        responseMode: 'sync',
        scope: {
          actorId: 'user-1',
          projectIds: ['project-1'],
          tenantId: 'tenant-1',
          workspaceId: 'workspace-1',
        },
      },
      timestamp: '2026-07-29T00:00:00.000Z',
    });
  };

  const createModule = async () =>
    Test.createTestingModule({
      imports: [AiModule],
    }).compile();

  afterEach(() => {
    delete process.env.AI_PROMPT_ASSISTANT_CHAT_FOUNDATION_ENABLED;
  });

  it('discovers built-in prompt metadata in priority order', async () => {
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiPromptRegistryService);

    expect(registry.getPrompts().map((prompt) => prompt.id)).toEqual([
      'assistant-chat-foundation',
      'reasoning-analysis-foundation',
      'structured-output-foundation',
    ]);
    expect(registry.getDiagnostics()).toMatchObject({
      promptCount: 3,
    });

    await moduleRef.close();
  });

  it('supports prompt disablement through configuration', async () => {
    process.env.AI_PROMPT_ASSISTANT_CHAT_FOUNDATION_ENABLED = 'false';
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiPromptRegistryService);

    expect(registry.findPromptById('assistant-chat-foundation')).not.toBeNull();
    expect(registry.findPromptsByCapability('chat')).toEqual([]);
    expect(registry.getDiagnostics().disabledPromptIds).toContain(
      'assistant-chat-foundation',
    );

    await moduleRef.close();
  });

  it('resolves prompt metadata without rendering or execution', async () => {
    const moduleRef = await createModule();
    const resolutionEngine = moduleRef.get(AiPromptResolutionEngineService);

    const result = resolutionEngine.resolvePrompt({
      capabilityId: 'chat',
      contextTypes: ['project', 'workspace'],
      executionContext: createExecutionContext(),
    });

    expect(result.prompt).toMatchObject({
      estimatedTokens: 0,
      id: 'assistant-chat-foundation',
      lifecycleStatus: 'draft',
    });
    expect(result.diagnostics).toMatchObject({
      candidatePromptIds: ['assistant-chat-foundation'],
      precedenceApplied: ['assistant-chat-foundation'],
      selectedPromptId: 'assistant-chat-foundation',
    });

    await moduleRef.close();
  });
});
