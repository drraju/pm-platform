import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { AiConfigService } from '../common';
import { AiExecutionContext } from '../gateway';
import { AiContextAggregationService } from './ai-context-aggregation.service';
import { AiContextRegistryService } from './ai-context-registry.service';

describe('AiContextRegistryService', () => {
  const createExecutionContext = () => {
    const featureFlags = new AiConfigService().getConfig().featureFlags;

    return AiExecutionContext.create({
      featureFlags,
      request: {
        capabilityId: 'chat',
        correlationId: 'corr-context-1',
        input: {},
        requestId: 'req-context-1',
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
    delete process.env.AI_CONTEXT_PROVIDER_DOCUMENT_CONTEXT_ENABLED;
  });

  it('discovers built-in placeholder providers in priority order', async () => {
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiContextRegistryService);

    expect(registry.getProviders().map((provider) => provider.id)).toEqual([
      'project-context',
      'task-context',
      'execution-context',
      'document-context',
      'raid-context',
      'team-context',
      'calendar-context',
      'portfolio-context',
      'workspace-context',
      'user-context',
    ]);
    expect(registry.getDiagnostics()).toMatchObject({
      providerCount: 10,
    });

    await moduleRef.close();
  });

  it('supports disabling registered providers through configuration', async () => {
    process.env.AI_CONTEXT_PROVIDER_DOCUMENT_CONTEXT_ENABLED = 'false';
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiContextRegistryService);

    expect(registry.findProviderById('document-context')).not.toBeNull();
    expect(
      registry.getEnabledProviders().map((provider) => provider.id),
    ).not.toContain('document-context');
    expect(registry.getDiagnostics().disabledProviderIds).toContain(
      'document-context',
    );

    await moduleRef.close();
  });

  it('selects context metadata by capability and requested resource', async () => {
    const moduleRef = await createModule();
    const registry = moduleRef.get(AiContextRegistryService);

    const selections = await registry.selectContextMetadata({
      capabilityId: 'chat',
      executionContext: createExecutionContext(),
      requestedResources: [{ id: 'project-1', type: 'project' }],
      scope: createExecutionContext().scope,
    });

    expect(selections.map((selection) => selection.provider.id)).toEqual([
      'project-context',
      'task-context',
      'execution-context',
      'document-context',
      'raid-context',
      'team-context',
      'calendar-context',
    ]);
    expect(selections[0].metadata[0]).toMatchObject({
      contextType: 'project',
      estimatedTokenSize: 0,
      source: {
        providerId: 'project-context',
        resourceId: 'project-1',
        resourceType: 'project',
      },
    });

    await moduleRef.close();
  });

  it('aggregates selected metadata without business payloads', async () => {
    const moduleRef = await createModule();
    const aggregation = moduleRef.get(AiContextAggregationService);

    const result = await aggregation.aggregate({
      capabilityId: 'chat',
      executionContext: createExecutionContext(),
      scope: createExecutionContext().scope,
    });

    expect(result.metadata).toHaveLength(10);
    expect(
      result.metadata.every((metadata) => metadata.estimatedTokenSize === 0),
    ).toBe(true);
    expect(result.diagnostics).toMatchObject({
      duplicateDetectionApplied: false,
      mergeStrategy: 'priority',
      totalEstimatedTokens: 0,
    });

    await moduleRef.close();
  });
});
