import { AiConfigService } from '../common';
import { AiExecutionContext } from '../gateway';
import { AiContextRegistryService } from './ai-context-registry.service';
import { EnterpriseContextAssemblyService } from './enterprise-context-assembly.service';

describe('EnterpriseContextAssemblyService', () => {
  const executionContext = AiExecutionContext.create({
    featureFlags: new AiConfigService().getConfig().featureFlags,
    request: {
      capabilityId: 'chat',
      correlationId: 'corr-m11',
      input: {},
      requestId: 'req-m11',
      responseMode: 'sync',
      scope: {
        actorId: 'user-1',
        projectIds: ['project-1'],
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
      },
    },
    timestamp: '2026-08-01T00:00:00.000Z',
  });

  it('assembles typed project, task, execution, and workspace context deterministically', async () => {
    const registry = {
      assembleContext: jest.fn().mockResolvedValue([
        {
          fragment: {
            contextType: 'task',
            items: [
              {
                id: 'task-2',
                projectId: 'project-1',
                status: 'todo',
                title: 'Second task',
              },
              {
                id: 'task-1',
                projectId: 'project-1',
                status: 'in_progress',
                title: 'First task',
              },
            ],
            providerId: 'task-context',
          },
          provider: { id: 'task-context' },
        },
        {
          fragment: {
            contextType: 'project',
            items: [
              { id: 'project-1', name: 'Project One', status: 'active' },
              { id: 'project-1', name: 'Duplicate', status: 'active' },
              { id: 'project-2', name: 'Hidden Project', status: 'active' },
            ],
            providerId: 'project-context',
          },
          provider: { id: 'project-context' },
        },
        {
          fragment: {
            contextType: 'execution',
            items: [
              {
                id: 'update-1',
                projectId: 'project-1',
                status: 'in_progress',
                taskId: 'task-1',
              },
            ],
            providerId: 'execution-context',
          },
          provider: { id: 'execution-context' },
        },
        {
          fragment: {
            contextType: 'workspace',
            items: [{ id: 'workspace-1', currentPage: '/projects' }],
            providerId: 'workspace-context',
          },
          provider: { id: 'workspace-context' },
        },
      ]),
    } as unknown as AiContextRegistryService;

    const service = new EnterpriseContextAssemblyService(registry);
    const result = await service.assemble({
      capabilityId: 'chat',
      executionContext,
      scope: executionContext.scope,
    });

    expect(result.context.projects).toEqual([
      { id: 'project-1', name: 'Project One', status: 'active' },
    ]);
    expect(result.context.tasks.map((task) => task.id)).toEqual([
      'task-1',
      'task-2',
    ]);
    expect(result.context.executionUpdates).toHaveLength(1);
    expect(result.context.workspace).toEqual({
      id: 'workspace-1',
      currentPage: '/projects',
    });
    expect(result.diagnostics.duplicateDetectionApplied).toBe(true);
    expect(result.diagnostics.omittedItemCount).toBe(1);
  });

  it('applies authorization trimming and configured limits before returning context', async () => {
    const registry = {
      assembleContext: jest.fn().mockResolvedValue([
        {
          fragment: {
            contextType: 'task',
            items: [
              { id: 'task-1', projectId: 'project-1', status: 'todo', title: 'Allowed' },
              { id: 'task-2', projectId: 'project-1', status: 'todo', title: 'Not allowed' },
              { id: 'task-3', projectId: 'project-1', status: 'todo', title: 'Truncated' },
            ],
            providerId: 'task-context',
          },
          provider: { id: 'task-context' },
        },
        {
          fragment: {
            contextType: 'document',
            items: [{ id: 'document-1', projectId: 'project-1', title: 'Restricted' }],
            providerId: 'document-context',
          },
          provider: { id: 'document-context' },
        },
      ]),
    } as unknown as AiContextRegistryService;

    const result = await new EnterpriseContextAssemblyService(registry).assemble({
      authorization: {
        allowSensitiveContext: false,
        allowedResourceIds: { task: ['task-1', 'task-2', 'task-3'] },
      },
      capabilityId: 'chat',
      executionContext,
      limits: { tasks: 1 },
      scope: executionContext.scope,
    });

    expect(result.context.tasks.map((task) => task.id)).toEqual(['task-1']);
    expect(result.context.documents).toEqual([]);
    expect(result.diagnostics.truncatedTypes).toContain('task');
    expect(result.diagnostics.omittedItemCount).toBe(3);
  });
});
