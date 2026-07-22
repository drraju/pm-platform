import { GoogleDriveIntegrationController } from '../providers/google-drive/google-drive.integration-controller';
import { GoogleDriveIntegrationProvider } from '../providers/google-drive';
import { ProviderType } from '..';

describe('GoogleDriveIntegrationController', () => {
  it('initiates Google OAuth without reading a request body', () => {
    const provider = {
      initiateGoogleOAuth: jest.fn(() => ({
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        state: 'signed-state',
      })),
    };
    const registry = {
      resolve: jest.fn(() => provider),
    };
    const controller = new GoogleDriveIntegrationController(registry as never);

    expect(controller.connect()).toEqual({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      state: 'signed-state',
    });
    expect(registry.resolve).toHaveBeenCalledWith(ProviderType.GOOGLE_DRIVE);
    expect(provider.initiateGoogleOAuth).toHaveBeenCalledTimes(1);
  });

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
