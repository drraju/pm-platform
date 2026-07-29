import { Test } from '@nestjs/testing';
import { AiConfigService, AiModule } from '../..';
import { AiExecutionContext } from '../ai-execution-context';
import { AiPipelineEngineService } from './ai-pipeline-engine.service';

describe('AiPipelineEngineService', () => {
  const createRequest = () => ({
    capabilityId: 'chat',
    correlationId: 'corr-1',
    input: {},
    requestId: 'req-1',
    responseMode: 'sync' as const,
    scope: {
      actorId: 'user-1',
      projectIds: ['project-1'],
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    },
  });

  const createModule = async () =>
    Test.createTestingModule({
      imports: [AiModule],
    }).compile();

  afterEach(() => {
    delete process.env.AI_PIPELINE_STAGE_TELEMETRY_ENABLED;
  });

  it('executes placeholder stages in registry order', async () => {
    const moduleRef = await createModule();
    const config = moduleRef.get(AiConfigService).getConfig();
    const context = AiExecutionContext.create({
      featureFlags: config.featureFlags,
      request: createRequest(),
    });

    const result = await moduleRef
      .get(AiPipelineEngineService)
      .execute(context);

    expect(result.status).toBe('success');
    expect(result.context.executionState.lifecycleState).toBe('audited');
    expect(result.context.selectedProviderId).toBe('mock');
    expect(result.context.contextReferences).toEqual([
      'project-context:project:project-1',
      'task-context:task:metadata',
      'document-context:document:metadata',
      'raid-context:raid:metadata',
      'team-context:team:metadata',
      'calendar-context:calendar:metadata',
      'portfolio-context:portfolio:metadata',
      'workspace-context:workspace:workspace-1',
    ]);
    expect(result.context.promptMetadata).toMatchObject({
      promptId: 'assistant-chat-foundation',
      promptVersion: '1.0.0',
    });
    expect(result.diagnostics.stages.map((stage) => stage.stageName)).toEqual([
      'request_validation',
      'authentication_hook',
      'authorization_hook',
      'execution_context_enrichment',
      'capability_resolution',
      'context_assembly_placeholder',
      'prompt_resolution_placeholder',
      'provider_dispatch_placeholder',
      'response_normalization',
      'telemetry',
      'audit',
    ]);
    expect(
      result.diagnostics.stages.every((stage) => stage.result === 'success'),
    ).toBe(true);

    await moduleRef.close();
  });

  it('fails fast when structural request metadata is missing', async () => {
    const moduleRef = await createModule();
    const config = moduleRef.get(AiConfigService).getConfig();
    const context = AiExecutionContext.create({
      featureFlags: config.featureFlags,
      request: {
        ...createRequest(),
        requestId: '',
      },
    });

    const result = await moduleRef
      .get(AiPipelineEngineService)
      .execute(context);

    expect(result.status).toBe('failed');
    expect(result.diagnostics.failedStageName).toBe('request_validation');
    expect(result.error?.code).toBe('AI_REQUEST_INVALID_STRUCTURE');
    expect(result.diagnostics.stages).toHaveLength(1);

    await moduleRef.close();
  });

  it('supports disabling individual stages through configuration', async () => {
    process.env.AI_PIPELINE_STAGE_TELEMETRY_ENABLED = 'false';
    const moduleRef = await createModule();
    const config = moduleRef.get(AiConfigService).getConfig();
    const context = AiExecutionContext.create({
      featureFlags: config.featureFlags,
      request: createRequest(),
    });

    const result = await moduleRef
      .get(AiPipelineEngineService)
      .execute(context);

    expect(result.status).toBe('success');
    expect(
      result.diagnostics.stages.map((stage) => stage.stageName),
    ).not.toContain('telemetry');

    await moduleRef.close();
  });

  it('fails fast when a requested capability is not registered', async () => {
    const moduleRef = await createModule();
    const config = moduleRef.get(AiConfigService).getConfig();
    const context = AiExecutionContext.create({
      featureFlags: config.featureFlags,
      request: {
        ...createRequest(),
        capabilityId: 'unknown-capability',
      },
    });

    const result = await moduleRef
      .get(AiPipelineEngineService)
      .execute(context);

    expect(result.status).toBe('failed');
    expect(result.diagnostics.failedStageName).toBe('capability_resolution');
    expect(result.error?.code).toBe('AI_CAPABILITY_NOT_REGISTERED');

    await moduleRef.close();
  });
});
