import { Test } from '@nestjs/testing';
import { AiModule } from '..';
import { CapabilityExecutionService } from './capability-execution.service';
import { EnterpriseCapabilityRegistryService } from './enterprise-capability-registry.service';

describe('EnterpriseCapabilityRegistryService', () => {
  it('registers and exposes provider-independent capability metadata', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] }).compile();
    const registry = moduleRef.get(EnterpriseCapabilityRegistryService);

    expect(registry.getCapabilities().map((capability) => capability.id)).toEqual([
      'daily-review-assistant',
      'project-summary',
      'execution-review',
      'raid-review',
      'portfolio-health-review',
    ]);
    expect(registry.findById('project-summary')).toMatchObject({
      responseType: 'executive-summary',
      supportedSkills: ['project-delivery-assistant'],
    });
    expect(registry.getDiagnostics()).toMatchObject({ capabilityCount: 5 });

    await moduleRef.close();
  });

  it('routes a capability through the existing execution engine', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] }).compile();
    const service = moduleRef.get(CapabilityExecutionService);

    const result = await service.execute({
      capabilityId: 'project-summary',
      correlationId: 'capability-correlation',
      input: 'Summarize delivery.',
      permissions: ['project.read'],
      preferredProviderId: 'mock',
      requestId: 'capability-request',
      workspaceId: 'workspace-1',
    });

    expect(result).toMatchObject({
      selectedSkill: { id: 'project-delivery-assistant' },
      selectedProvider: { id: 'mock' },
      status: 'success',
      structuredResponse: { summary: { title: 'AI Response' } },
    });

    await moduleRef.close();
  });

  it('rejects capability execution when permissions are missing', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] }).compile();
    const service = moduleRef.get(CapabilityExecutionService);

    await expect(
      service.execute({
        capabilityId: 'project-summary',
        correlationId: 'unauthorized-correlation',
        input: 'Summarize delivery.',
        requestId: 'unauthorized-request',
      }),
    ).rejects.toMatchObject({
      code: 'AI_CAPABILITY_UNAUTHORIZED',
      category: 'authorization',
    });

    await moduleRef.close();
  });

  it('routes the Daily Review capability with reusable enterprise context data', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AiModule] }).compile();
    const service = moduleRef.get(CapabilityExecutionService);

    const result = await service.execute({
      capabilityId: 'daily-review-assistant',
      contextSourceData: {
        execution: [{ id: 'update-1', projectId: 'project-1', status: 'in_progress', taskId: 'task-1' }],
        project: [{ id: 'project-1', name: 'CapGemini', status: 'active' }],
        raid: [{ id: 'risk-1', projectId: 'project-1', status: 'open', title: 'Vendor delay', type: 'risk' }],
        task: [{ id: 'task-1', projectId: 'project-1', status: 'blocked', title: 'Integration' }],
        team: [{ id: 'member-1', projectId: 'project-1', role: 'lead', userId: 'user-1' }],
        user: [{ id: 'user-1' }],
        workspace: [{ id: 'daily-review', name: 'Daily Review' }],
      },
      correlationId: 'daily-review-correlation',
      input: 'Prepare the daily review.',
      permissions: ['project.read'],
      preferredProviderId: 'mock',
      projectIds: ['project-1'],
      requestId: 'daily-review-request',
      workspaceId: 'daily-review',
    });

    expect(result).toMatchObject({
      selectedSkill: { id: 'daily-review-analysis' },
      status: 'success',
      structuredResponse: { summary: { title: 'AI Response' } },
    });

    await moduleRef.close();
  });
});
