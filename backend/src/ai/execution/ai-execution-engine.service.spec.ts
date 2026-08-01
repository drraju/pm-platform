import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { AIEventBusService } from '../common';
import { AiExecutionEngineService } from './ai-execution-engine.service';

describe('AiExecutionEngineService', () => {
  it('executes through the mock provider with immutable diagnostics', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const engine = moduleRef.get(AiExecutionEngineService);
    const eventBus = moduleRef.get(AIEventBusService);

    const result = await engine.execute({
      executionId: 'exec-1',
      request: {
        capabilityId: 'chat',
        correlationId: 'corr-1',
        input: { message: 'status?' },
        metadata: {
          requestedProviderId: 'mock',
        },
        requestId: 'req-1',
        responseMode: 'sync',
        scope: {
          actorId: 'user-1',
          clientId: 'internal-assistant',
          tenantId: 'tenant-1',
          workspaceId: 'workspace-1',
        },
      },
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(result).toMatchObject({
      executionId: 'exec-1',
      mockResponse: {
        content: 'mock-response:req-1:chat',
        modelId: 'mock-metadata-only',
        providerId: 'mock',
      },
      requestId: 'req-1',
      selectedProvider: {
        id: 'mock',
        name: 'Mock AI Provider',
      },
      status: 'success',
    });
    expect(result.stateHistory.map((transition) => transition.to)).toEqual([
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
    expect(result.diagnostics.eventNames).toEqual([
      'ExecutionStarted',
      'ExecutionStateChanged',
      'ExecutionStateChanged',
      'ExecutionStateChanged',
      'ExecutionStateChanged',
      'ExecutionStateChanged',
      'ExecutionStateChanged',
      'ExecutionStateChanged',
      'ExecutionCompleted',
    ]);
    expect(eventBus.getDiagnostics()).toMatchObject({
      eventCount: 9,
      lastPublishedEventName: 'ExecutionCompleted',
    });

    await moduleRef.close();
  });

  it('returns failed execution results when pipeline validation fails', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const engine = moduleRef.get(AiExecutionEngineService);

    const result = await engine.execute({
      executionId: 'exec-invalid',
      request: {
        capabilityId: '',
        correlationId: 'corr-1',
        input: {},
        requestId: 'req-invalid',
        responseMode: 'sync',
        scope: {},
      },
    });

    expect(result.status).toBe('failed');
    expect(result.stateHistory.at(-1)?.to).toBe('Failed');
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'AI_REQUEST_INVALID_STRUCTURE',
      }),
    ]);

    await moduleRef.close();
  });

  it('executes an explicit skill and returns provider-independent diagnostics', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const engine = moduleRef.get(AiExecutionEngineService);

    const result = await engine.execute({
      intent: { id: 'PROJECT_SUMMARY', skillId: 'project-delivery-assistant' },
      request: {
        capabilityId: 'chat',
        correlationId: 'corr-explicit',
        input: 'Summarize the project.',
        requestId: 'req-explicit',
        responseMode: 'sync',
        scope: { workspaceId: 'workspace-1' },
      },
      authorization: {
        permissions: ['project.read'],
      },
      preferredProviderId: 'mock',
      responseFormat: 'markdown',
      skillId: 'project-delivery-assistant',
    });

    expect(result.status).toBe('success');
    expect(result.intent).toEqual({
      id: 'PROJECT_SUMMARY',
      skillId: 'project-delivery-assistant',
    });
    expect(result.structuredResponse).toMatchObject({
      metadata: { providerId: 'mock' },
      summary: { title: 'AI Response' },
    });
    expect(result.diagnostics).toMatchObject({
      completionStatus: 'success',
      intentId: 'PROJECT_SUMMARY',
      skillId: 'project-delivery-assistant',
    });

    await moduleRef.close();
  });

  it('returns a standardized authorization error before provider execution', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiModule],
    }).compile();
    const engine = moduleRef.get(AiExecutionEngineService);

    const result = await engine.execute({
      authorization: { permissions: [] },
      request: {
        capabilityId: 'chat',
        correlationId: 'corr-unauthorized',
        input: 'Summarize the project.',
        requestId: 'req-unauthorized',
        responseMode: 'sync',
        scope: { workspaceId: 'workspace-1' },
      },
      skillId: 'project-delivery-assistant',
    });

    expect(result.status).toBe('failed');
    expect(result.errors[0]).toMatchObject({
      code: 'AI_SKILL_UNAUTHORIZED',
      category: 'authorization',
    });

    await moduleRef.close();
  });
});
