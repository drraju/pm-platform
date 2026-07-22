import { google } from 'googleapis';
import {
  GoogleDriveConnection,
  GoogleDriveIntegrationProvider,
} from '../providers/google-drive';
import { IntegrationStatus, ProviderType } from '..';

jest.mock('googleapis', () => ({
  google: {
    drive: jest.fn(),
  },
}));

type MockRepository<T> = {
  create: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock<Promise<T>, [Partial<T>]>;
};

type FolderCreateInput = {
  requestBody: {
    name: string;
  };
};

function repository<T>(): MockRepository<T> {
  return {
    create: jest.fn((input: Partial<T>) => input),
    findOne: jest.fn(),
    save: jest.fn((input: Partial<T>) => Promise.resolve(input as T)),
  };
}

function createProvider(input?: {
  connection?: Partial<GoogleDriveConnection> | null;
  drive?: Record<string, unknown>;
}) {
  const connectionRepository = repository<GoogleDriveConnection>();
  const projectFolderRepository = repository();
  const documentMetadataRepository = repository();
  const oauthService = {
    createAuthorizedClient: jest.fn(() => ({ client: true })),
    exchangeCode: jest.fn(() =>
      Promise.resolve({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    ),
    getAuthorizationUrl: jest.fn(
      () => 'https://accounts.google.com/o/oauth2/v2/auth',
    ),
  };
  const tokenVault = {
    decrypt: jest.fn(() => 'refresh-token'),
    encrypt: jest.fn(() => 'encrypted-refresh-token'),
  };
  const oauthStateService = {
    createState: jest.fn(() => 'signed-state'),
    validateState: jest.fn(),
  };
  const connection =
    typeof input?.connection === 'undefined'
      ? {
          connectedAccountEmail: 'user@example.com',
          driveType: 'my_drive',
          encryptedRefreshToken: 'encrypted-refresh-token',
          id: 'connection-1',
          lastConnectedAt: new Date('2026-07-22T00:00:00.000Z'),
          rootFolderId: 'root-folder',
          status: 'connected',
        }
      : input.connection;
  connectionRepository.findOne.mockResolvedValue(connection);

  const provider = new GoogleDriveIntegrationProvider(
    oauthService as never,
    tokenVault as never,
    connectionRepository as never,
    projectFolderRepository as never,
    documentMetadataRepository as never,
    oauthStateService as never,
  );

  (google.drive as jest.Mock).mockReturnValue(input?.drive ?? {});

  return {
    connectionRepository,
    documentMetadataRepository,
    oauthService,
    oauthStateService,
    projectFolderRepository,
    provider,
    tokenVault,
  };
}

describe('GoogleDriveIntegrationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('implements the provider abstraction for Google Drive', () => {
    const { provider } = createProvider();

    expect(provider.providerType).toBe(ProviderType.GOOGLE_DRIVE);
    expect(provider.capabilities().supportsAuthentication).toBe(true);
    expect(provider.webhooks()).toEqual({ events: [], supported: false });
  });

  it('returns an authorization URL when no authorization code is supplied', async () => {
    const { oauthService, provider } = createProvider();

    await expect(
      provider.connectGoogleDrive({ state: 'state-1' }),
    ).resolves.toEqual({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      status: 'authorization_required',
    });
    expect(oauthService.getAuthorizationUrl).toHaveBeenCalledWith({
      redirectUri: undefined,
      state: 'state-1',
    });
  });

  it('initiates OAuth with a generated signed state', () => {
    const { oauthService, oauthStateService, provider } = createProvider();

    expect(provider.initiateGoogleOAuth()).toEqual({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      state: 'signed-state',
    });
    expect(oauthStateService.createState).toHaveBeenCalledTimes(1);
    expect(oauthService.getAuthorizationUrl).toHaveBeenCalledWith({
      state: 'signed-state',
    });
  });

  it('validates OAuth callback state before exchanging the code', async () => {
    const drive = {
      about: {
        get: jest.fn(() =>
          Promise.resolve({
            data: { user: { emailAddress: 'user@example.com' } },
          }),
        ),
      },
      files: {
        create: jest.fn(() =>
          Promise.resolve({
            data: {
              id: 'root-folder',
              webViewLink: 'https://drive.google.com/drive/folders/root-folder',
            },
          }),
        ),
        list: jest.fn(() => Promise.resolve({ data: { files: [] } })),
      },
    };
    const { connectionRepository, oauthService, oauthStateService, provider } =
      createProvider({
        connection: null,
        drive,
      });
    connectionRepository.create.mockImplementation(
      (input: Partial<GoogleDriveConnection>) => ({
        ...input,
        id: 'connection-1',
      }),
    );

    await provider.completeGoogleOAuth({
      code: 'authorization-code',
      state: 'signed-state',
    });

    expect(oauthStateService.validateState).toHaveBeenCalledWith(
      'signed-state',
    );
    expect(oauthService.exchangeCode).toHaveBeenCalledWith({
      authorizationCode: 'authorization-code',
      redirectUri: undefined,
    });
  });

  it('stores encrypted refresh token and creates the PM Platform root folder', async () => {
    const drive = {
      about: {
        get: jest.fn(() =>
          Promise.resolve({
            data: { user: { emailAddress: 'user@example.com' } },
          }),
        ),
      },
      files: {
        create: jest.fn(() =>
          Promise.resolve({
            data: {
              id: 'root-folder',
              webViewLink: 'https://drive.google.com/drive/folders/root-folder',
            },
          }),
        ),
        list: jest.fn(() => Promise.resolve({ data: { files: [] } })),
      },
    };
    const { connectionRepository, provider, tokenVault } = createProvider({
      connection: null,
      drive,
    });
    connectionRepository.create.mockImplementation(
      (input: Partial<GoogleDriveConnection>) => ({
        ...input,
        id: 'connection-1',
      }),
    );

    const result = await provider.connectGoogleDrive({
      authorizationCode: 'code',
      driveType: 'my_drive',
    });

    expect(tokenVault.encrypt).toHaveBeenCalledWith('refresh-token');
    const rootCreateInput = drive.files.create.mock
      .calls[0][0] as FolderCreateInput;
    expect(rootCreateInput.requestBody.name).toBe('PM Platform');
    expect(result).toMatchObject({
      connectedAccountEmail: 'user@example.com',
      rootFolderId: 'root-folder',
      status: 'connected',
    });
  });

  it('creates project folder hierarchy under the PM Platform root folder', async () => {
    const drive = {
      files: {
        create: jest.fn(({ requestBody }: FolderCreateInput) =>
          Promise.resolve({
            data: {
              id: `${requestBody.name}-id`,
              webViewLink: `https://drive.google.com/${requestBody.name}`,
            },
          }),
        ),
        list: jest.fn(() => Promise.resolve({ data: { files: [] } })),
      },
    };
    const { projectFolderRepository, provider } = createProvider({ drive });
    projectFolderRepository.findOne.mockResolvedValue(null);

    await provider.createProjectFolder({
      projectId: '11111111-1111-4111-8111-111111111111',
      projectName: 'CapGemini Migration',
    });

    expect(drive.files.create).toHaveBeenCalledTimes(6);
    expect(projectFolderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: 'CapGemini Migration-id',
        projectName: 'CapGemini Migration',
      }),
    );
  });

  it('lists documents and stores metadata only', async () => {
    const drive = {
      files: {
        list: jest.fn(() =>
          Promise.resolve({
            data: {
              files: [
                {
                  id: 'doc-1',
                  mimeType: 'application/pdf',
                  name: 'Test Plan.pdf',
                  owners: [{ emailAddress: 'tester@example.com' }],
                  webViewLink: 'https://drive.google.com/file/d/doc-1/view',
                },
              ],
            },
          }),
        ),
      },
    };
    const { documentMetadataRepository, provider } = createProvider({ drive });
    documentMetadataRepository.findOne.mockResolvedValue(null);

    const documents = await provider.listDocuments({
      folderId: 'folder-1',
      projectId: '11111111-1111-4111-8111-111111111111',
    });

    expect(documents).toHaveLength(1);
    expect(documentMetadataRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Plan.pdf',
        providerDocumentId: 'doc-1',
        webUrl: 'https://drive.google.com/file/d/doc-1/view',
      }),
    );
  });

  it('returns project workspace status and ordered document folders', async () => {
    const drive = {
      files: {
        list: jest.fn(() =>
          Promise.resolve({
            data: {
              files: [
                {
                  id: 'delivery-folder',
                  name: '03 Delivery',
                  webViewLink: 'https://drive.google.com/delivery',
                },
                {
                  id: 'business-folder',
                  name: '01 Business',
                  webViewLink: 'https://drive.google.com/business',
                },
              ],
            },
          }),
        ),
      },
    };
    const { projectFolderRepository, provider } = createProvider({ drive });
    projectFolderRepository.findOne.mockResolvedValue({
      folderId: 'project-folder',
      projectId: '11111111-1111-4111-8111-111111111111',
    });

    const workspace = await provider.getProjectWorkspace(
      '11111111-1111-4111-8111-111111111111',
    );

    expect(workspace).toMatchObject({
      provider: 'Google Drive',
      status: 'connected',
      folders: [
        { id: 'business-folder', name: '01 Business' },
        { id: 'delivery-folder', name: '03 Delivery' },
      ],
    });
  });

  it('reports configuration-required health when no connection exists', async () => {
    const { provider } = createProvider({ connection: null });

    const health = await provider.health();

    expect(health.status).toBe(IntegrationStatus.CONFIGURATION_REQUIRED);
  });
});
