import { Test } from '@nestjs/testing';
import { AiConfigService } from '../common';
import {
  ConversationPlannerService,
  ConversationRegistryService,
  ConversationSessionRegistryService,
} from '../conversation';
import { AiExecutionEngineService, AiExecutionResult } from '../execution';
import { InternalAiAssistantService } from './internal-ai-assistant.service';

describe('InternalAiAssistantService', () => {
  it('submits assistant requests through the Execution Engine', async () => {
    const executionResult: AiExecutionResult = {
      diagnostics: {
        contextProviderIds: [],
        eventNames: [],
        policySummary: {},
        promptCandidateIds: [],
        providerCandidateIds: ['mock'],
        skillCandidateIds: [],
        warnings: [],
      },
      errors: [],
      executionId: 'exec-1',
      policies: {
        cancellation: { enabled: false },
        concurrency: { maxConcurrentExecutions: 1 },
        executionMode: { mode: 'sync' },
        retry: {
          enabled: false,
          maxAttempts: 1,
          retryableErrorCategories: [],
        },
        timeout: {
          enabled: true,
          timeoutMs: 30000,
        },
      },
      requestId: 'req-1',
      selectedContextMetadata: [],
      stateHistory: [],
      status: 'success',
      timing: {
        startedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    const execute = jest
      .fn<
        Promise<AiExecutionResult>,
        Parameters<AiExecutionEngineService['execute']>
      >()
      .mockResolvedValue(executionResult);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiConfigService,
        ConversationPlannerService,
        ConversationRegistryService,
        ConversationSessionRegistryService,
        InternalAiAssistantService,
        {
          provide: AiExecutionEngineService,
          useValue: {
            execute,
          },
        },
      ],
    }).compile();
    const assistant = moduleRef.get(InternalAiAssistantService);

    const result = await assistant.submitRequest({
      actorId: 'user-1',
      clientId: 'internal-assistant',
      correlationId: 'corr-1',
      input: { message: 'status?' },
      requestId: 'req-1',
      sessionId: 'session-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    });

    expect(execute).toHaveBeenCalledTimes(1);
    const submittedRequest = execute.mock.calls[0]?.[0].request;
    expect(submittedRequest).toMatchObject({
      capabilityId: 'chat',
      correlationId: 'corr-1',
      requestId: 'req-1',
      scope: {
        clientId: 'internal-assistant',
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
      },
    });
    expect(result).toMatchObject({
      executionResult,
      plannedConversationId: 'internal-assistant-conversation',
      requestId: 'req-1',
      sessionId: 'session-1',
    });

    await moduleRef.close();
  });
});
