import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { ConversationPlannerService } from './conversation-planner.service';
import { ConversationRegistryService } from './conversation-registry.service';
import { ConversationSessionRegistryService } from './conversation-session-registry.service';

describe('Conversation Platform foundation', () => {
  const createModule = async () =>
    Test.createTestingModule({
      imports: [AiModule],
    }).compile();

  afterEach(() => {
    delete process.env.AI_CONVERSATION_INTERNAL_ASSISTANT_CONVERSATION_ENABLED;
  });

  it('discovers conversation metadata through the registry', async () => {
    const moduleRef = await createModule();
    const registry = moduleRef.get(ConversationRegistryService);

    expect(
      registry.getConversations().map((conversation) => conversation.id),
    ).toEqual(['internal-assistant-conversation']);
    expect(registry.getDiagnostics()).toMatchObject({
      conversationCount: 1,
      enabledConversationIds: ['internal-assistant-conversation'],
    });

    await moduleRef.close();
  });

  it('supports conversation definition feature flags', async () => {
    process.env.AI_CONVERSATION_INTERNAL_ASSISTANT_CONVERSATION_ENABLED =
      'false';
    const moduleRef = await createModule();
    const registry = moduleRef.get(ConversationRegistryService);

    expect(registry.getEnabledEntries()).toHaveLength(0);
    expect(registry.getDiagnostics().disabledConversationIds).toEqual([
      'internal-assistant-conversation',
    ]);

    await moduleRef.close();
  });

  it('plans immutable request descriptors with session memory metadata only', async () => {
    const moduleRef = await createModule();
    const planner = moduleRef.get(ConversationPlannerService);
    const sessions = moduleRef.get(ConversationSessionRegistryService);

    const plan = planner.plan({
      actorId: 'user-1',
      clientId: 'internal-assistant',
      conversationId: 'internal-assistant-conversation',
      correlationId: 'corr-1',
      input: { message: 'status?' },
      projectIds: ['project-1'],
      requestId: 'req-1',
      sessionId: 'session-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    });

    expect(Object.isFrozen(plan.requestDescriptor)).toBe(true);
    expect(plan.requestDescriptor.toAiRequest()).toMatchObject({
      capabilityId: 'chat',
      correlationId: 'corr-1',
      requestId: 'req-1',
      scope: {
        actorId: 'user-1',
        clientId: 'internal-assistant',
        projectIds: ['project-1'],
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
      },
    });
    expect(plan.memoryMetadata).toEqual([
      expect.objectContaining({
        estimatedTokenSize: 0,
        retentionPolicy: 'session-only',
        sessionId: 'session-1',
        sourceReferences: [],
      }),
    ]);
    expect(sessions.findSessionById('session-1')).toMatchObject({
      conversationId: 'internal-assistant-conversation',
      state: 'active',
    });

    await moduleRef.close();
  });
});
