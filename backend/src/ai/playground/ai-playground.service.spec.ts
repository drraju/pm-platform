import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { AiPlaygroundService } from './ai-playground.service';

describe('AiPlaygroundService', () => {
  it('executes through the Internal AI Assistant and captures an immutable trace', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const playground = moduleRef.get(AiPlaygroundService);

    const response = await playground.execute({
      actorId: 'engineer-1',
      capabilityId: 'chat',
      conversationId: 'internal-assistant-conversation',
      correlationId: 'corr-playground-1',
      input: { message: 'diagnose execution' },
      projectIds: ['project-1'],
      providerId: 'mock',
      requestId: 'playground-req-1',
      sessionId: 'playground-session-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    });

    expect(Object.isFrozen(response.trace)).toBe(true);
    expect(response.trace).toMatchObject({
      conversationId: 'internal-assistant-conversation',
      requestId: 'playground-req-1',
      selectedCapability: 'chat',
      selectedProvider: {
        id: 'mock',
      },
    });
    expect(response.trace.finalResult.status).toBe('success');
    expect(response.trace.finalResult.mockResponse).toMatchObject({
      content: 'mock-response:playground-req-1:chat',
      providerId: 'mock',
    });
    expect(response.trace.executionStates.map((state) => state.to)).toEqual([
      'Created',
      'Validated',
      'Planned',
      'ContextResolved',
      'PromptResolved',
      'SkillResolved',
      'ProviderSelected',
      'Executing',
      'Completed',
    ]);
    expect(response.trace.eventBusEvents.map((event) => event.name)).toContain(
      'ExecutionCompleted',
    );
    expect(response.trace.eventTimeline).toEqual([
      expect.objectContaining({
        eventName: 'ExecutionStarted',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionStateChanged',
        executionId: response.trace.executionId,
      }),
      expect.objectContaining({
        eventName: 'ExecutionCompleted',
        executionId: response.trace.executionId,
      }),
    ]);
    expect(typeof response.trace.eventTimeline[0]?.timestamp).toBe('string');
    expect(response.trace.pipelineStages.length).toBeGreaterThan(0);
    expect(response.trace.diagnostics.architectureValidation).toEqual({
      externalProviderExecution: false,
      gatewayBoundaryPreserved: true,
      mockProviderOnly: true,
      readOnlyRegistryInspection: true,
    });

    await moduleRef.close();
  });

  it('inspects registries without mutating them', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const playground = moduleRef.get(AiPlaygroundService);

    const before = playground.inspectRegistries();
    const after = playground.inspectRegistries();

    expect(Object.isFrozen(before)).toBe(true);
    expect(before.capabilities.length).toBeGreaterThan(0);
    expect(before.conversations.map((conversation) => conversation.id)).toEqual(
      ['internal-assistant-conversation'],
    );
    expect(before.providers.map((provider) => provider.id)).toEqual([
      'mock',
      'openai',
    ]);
    expect(after.sessions).toHaveLength(before.sessions.length);

    await moduleRef.close();
  });

  it('replays traces through the same mock execution path', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const playground = moduleRef.get(AiPlaygroundService);

    const first = await playground.execute({
      correlationId: 'corr-replay-1',
      input: { message: 'first run' },
      providerId: 'mock',
      requestId: 'playground-replay-req',
      sessionId: 'playground-replay-session',
    });
    const replayed = await playground.replay(first.trace);

    expect(replayed.trace.requestId).toBe('playground-replay-req:replay');
    expect(replayed.trace.finalResult.mockResponse).toMatchObject({
      content: 'mock-response:playground-replay-req:replay:chat',
      providerId: 'mock',
    });
    expect(replayed.trace.selectedProvider).toMatchObject({
      id: 'mock',
    });
    expect(playground.getExecutionHistory()).toHaveLength(2);

    const replayedById = await playground.replayByExecutionId(
      first.trace.executionId,
    );
    expect(replayedById.trace.requestId).toBe('playground-replay-req:replay');

    await moduleRef.close();
  });

  it('keeps the last twenty executions in memory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const playground = moduleRef.get(AiPlaygroundService);

    for (let index = 0; index < 22; index += 1) {
      await playground.execute({
        input: `history ${index}`,
        providerId: 'mock',
        requestId: `history-req-${index}`,
        sessionId: `history-session-${index}`,
      });
    }

    const history = playground.getExecutionHistory();

    expect(history).toHaveLength(20);
    expect(history[0]).toMatchObject({
      request: 'history 21',
      requestId: 'history-req-21',
      status: 'success',
    });
    expect(
      playground.findExecutionTrace(history[0]?.executionId ?? ''),
    ).toMatchObject({
      requestId: 'history-req-21',
    });

    await moduleRef.close();
  });
});
