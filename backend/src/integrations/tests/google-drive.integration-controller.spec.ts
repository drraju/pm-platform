import { GoogleDriveIntegrationController } from '../providers/google-drive/google-drive.integration-controller';
import { GoogleDriveIntegrationProvider } from '../providers/google-drive';
import { ProviderType } from '..';

describe('GoogleDriveIntegrationController', () => {
  it('resolves Google Drive provider through the registry for workspace APIs', () => {
    const provider = {
      getProjectWorkspace: jest.fn(() => ({ status: 'not_connected' })),
    };
    const registry = {
      resolve: jest.fn(() => provider),
    };
    const controller = new GoogleDriveIntegrationController(registry as never);

    expect(controller.workspace('project-1')).toEqual({
      status: 'not_connected',
    });
    expect(registry.resolve).toHaveBeenCalledWith(ProviderType.GOOGLE_DRIVE);
    expect(provider.getProjectWorkspace).toHaveBeenCalledWith('project-1');
  });

  it('does not instantiate providers directly for document listing', () => {
    const provider = {
      listDocuments: jest.fn(() => []),
    };
    const registry = {
      resolve: jest.fn(
        () => provider as unknown as GoogleDriveIntegrationProvider,
      ),
    };
    const controller = new GoogleDriveIntegrationController(registry as never);

    expect(controller.documents({ projectId: 'project-1' })).toEqual([]);
    expect(registry.resolve).toHaveBeenCalledWith(ProviderType.GOOGLE_DRIVE);
  });
});
