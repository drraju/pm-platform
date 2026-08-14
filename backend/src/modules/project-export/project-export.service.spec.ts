import { ProjectExportService } from './project-export.service';

describe('ProjectExportService', () => {
  const actor = { roleId: 'customer-role', userId: 'customer-1' };
  const projects = {
    findOne: jest.fn(),
    findProjectTasks: jest.fn(),
  };
  const documents = { findProjectDocuments: jest.fn() };
  const dependencies = { find: jest.fn() };
  const executionUpdates = { find: jest.fn() };
  const excel = { export: jest.fn() };
  const authorizationPolicyService = { isExternalActor: jest.fn() };
  const service = new ProjectExportService(
    projects as never,
    documents as never,
    dependencies as never,
    executionUpdates as never,
    excel as never,
    authorizationPolicyService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    projects.findOne.mockResolvedValue({ id: 'project-1', name: 'Project' });
    projects.findProjectTasks.mockResolvedValue([
      { id: 'task-1', projectId: 'project-1', title: 'Assigned task' },
    ]);
    documents.findProjectDocuments.mockResolvedValue([
      { id: 'document-1', projectId: 'project-1', title: 'Approved document' },
    ]);
    excel.export.mockResolvedValue(Buffer.from('export'));
  });

  it('assembles external exports exclusively from actor-scoped projections', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

    await service.exportProject('project-1', actor);

    expect(projects.findOne).toHaveBeenCalledWith('project-1', actor);
    expect(projects.findProjectTasks).toHaveBeenCalledWith(
      'project-1',
      {},
      actor,
    );
    expect(documents.findProjectDocuments).toHaveBeenCalledWith(
      'project-1',
      {},
      actor,
    );
    expect(dependencies.find).not.toHaveBeenCalled();
    expect(executionUpdates.find).not.toHaveBeenCalled();
    expect(excel.export).toHaveBeenCalledWith({
      documents: [
        {
          id: 'document-1',
          projectId: 'project-1',
          title: 'Approved document',
        },
      ],
      executionHistory: [],
      project: { id: 'project-1', name: 'Project' },
      taskDependencies: [],
      tasks: [{ id: 'task-1', projectId: 'project-1', title: 'Assigned task' }],
    });
  });
});
