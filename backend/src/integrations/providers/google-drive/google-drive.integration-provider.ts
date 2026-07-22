import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { drive_v3, google } from 'googleapis';
import { Repository } from 'typeorm';
import {
  AuthenticationType,
  ConnectionHealth,
  IntegrationProvider,
  IntegrationStatus,
  ProviderCapabilities,
  ProviderType,
  SynchronizationPolicy,
} from '../../domain';
import {
  IntegrationCommandContext,
  IntegrationConfigurationResult,
  IntegrationOperationResult,
  IntegrationProviderAdapter,
  IntegrationResource,
  IntegrationResourceList,
  IntegrationResourceQuery,
  IntegrationWebhookDescriptor,
} from '../../application';
import {
  GoogleConnectDto,
  GoogleDocumentsQueryDto,
  GoogleProjectFolderDto,
} from './dto';
import {
  GoogleConnectionStatus,
  GoogleDriveConnection,
  GoogleDriveDocumentMetadata,
  GoogleDriveProjectFolder,
  GoogleDriveType,
} from './entities';
import {
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  GOOGLE_DRIVE_PROJECT_FOLDER_NAMES,
  GOOGLE_DRIVE_ROOT_FOLDER_NAME,
} from './google-drive.constants';
import { mapGoogleFileToMetadata } from './google-drive.mapper';
import { GoogleDriveOAuthService } from './google-drive-oauth.service';
import { GoogleTokenVault } from './google-token-vault.service';

type GoogleDriveDescriptor = Readonly<{
  id: string | null;
  name: string;
  type: GoogleDriveType;
}>;

type GoogleProjectDocumentFolder = Readonly<{
  id: string;
  name: string;
  webUrl: string;
}>;

@Injectable()
export class GoogleDriveIntegrationProvider implements IntegrationProviderAdapter {
  readonly providerType = ProviderType.GOOGLE_DRIVE;
  readonly provider = new IntegrationProvider(
    ProviderType.GOOGLE_DRIVE,
    'Google Drive',
    AuthenticationType.OAUTH2,
    IntegrationStatus.ACTIVE,
    new ProviderCapabilities(true, true, true, true, false, false, false),
    SynchronizationPolicy.disabled(),
  );

  constructor(
    private readonly oauthService: GoogleDriveOAuthService,
    private readonly tokenVault: GoogleTokenVault,
    @InjectRepository(GoogleDriveConnection)
    private readonly connectionRepository: Repository<GoogleDriveConnection>,
    @InjectRepository(GoogleDriveProjectFolder)
    private readonly projectFolderRepository: Repository<GoogleDriveProjectFolder>,
    @InjectRepository(GoogleDriveDocumentMetadata)
    private readonly documentMetadataRepository: Repository<GoogleDriveDocumentMetadata>,
  ) {}

  authenticate(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult> {
    return Promise.resolve({
      message: context.connection
        ? 'Google Drive connection is available.'
        : 'Google Drive OAuth authorization URL is required.',
      status: context.connection ? 'success' : 'failed',
    });
  }

  capabilities(): ProviderCapabilities {
    return this.provider.capabilities;
  }

  async connect(): Promise<IntegrationOperationResult> {
    const connection = await this.findConnection();
    return {
      message: connection
        ? `Connected to Google Drive as ${connection.connectedAccountEmail}.`
        : 'Google Drive is not connected.',
      status: connection ? 'success' : 'failed',
    };
  }

  async disconnect(
    context: IntegrationCommandContext,
  ): Promise<IntegrationOperationResult> {
    const connection = await this.findConnection(context.connection?.id);
    if (!connection) {
      return {
        message: 'Google Drive connection not found.',
        status: 'failed',
      };
    }

    connection.status = 'pending';
    await this.connectionRepository.save(connection);
    return {
      message: 'Google Drive connection disconnected.',
      status: 'success',
    };
  }

  async getResource(
    resourceId: string,
    context: IntegrationCommandContext,
  ): Promise<IntegrationResource> {
    const drive = await this.createDriveClient(context.connection?.id);
    const response = await drive.files.get({
      fields: 'id,name,mimeType,webViewLink',
      fileId: resourceId,
      supportsAllDrives: true,
    });

    return {
      id: response.data.id ?? resourceId,
      metadata: {
        mimeType: response.data.mimeType,
        webUrl: response.data.webViewLink,
      },
      title: response.data.name ?? resourceId,
      type: response.data.mimeType ?? 'unknown',
    };
  }

  async health(context?: IntegrationCommandContext): Promise<ConnectionHealth> {
    const connection = await this.findConnection(context?.connection?.id);
    if (!connection) {
      return new ConnectionHealth(
        this.providerType,
        IntegrationStatus.CONFIGURATION_REQUIRED,
        new Date(),
        'Google Drive is not connected.',
      );
    }

    try {
      const drive = await this.createDriveClient(connection.id);
      await drive.about.get({ fields: 'user(emailAddress)' });
      return new ConnectionHealth(
        this.providerType,
        IntegrationStatus.ACTIVE,
        new Date(),
        `Connected as ${connection.connectedAccountEmail}.`,
      );
    } catch {
      return new ConnectionHealth(
        this.providerType,
        IntegrationStatus.ERROR,
        new Date(),
        'Google Drive health check failed.',
      );
    }
  }

  async listResources(
    query: IntegrationResourceQuery,
    context: IntegrationCommandContext,
  ): Promise<IntegrationResourceList> {
    const documents = await this.listDocuments({
      connectionId: context.connection?.id,
      folderId: query.parentId,
    });

    return {
      resources: documents.map((document) => ({
        id: document.providerDocumentId,
        metadata: {
          mimeType: document.mimeType,
          webUrl: document.webUrl,
        },
        title: document.name,
        type: document.mimeType ?? 'unknown',
      })),
    };
  }

  refresh(): Promise<IntegrationOperationResult> {
    return Promise.resolve({
      message: 'Refresh uses Google OAuth refresh tokens on demand.',
      status: 'success',
    });
  }

  search(): Promise<IntegrationResourceList> {
    return Promise.resolve({ resources: [] });
  }

  synchronize(): Promise<IntegrationOperationResult> {
    return Promise.resolve({
      message: 'Synchronization is out of scope for the Google Drive MVP.',
      status: 'not_implemented',
    });
  }

  validateConfiguration(): Promise<IntegrationConfigurationResult> {
    const errors = [
      ['GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID],
      ['GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET],
      ['GOOGLE_REDIRECT_URI', process.env.GOOGLE_REDIRECT_URI],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => `${key} is required.`);

    return Promise.resolve({
      errors,
      valid: errors.length === 0,
    });
  }

  webhooks(): IntegrationWebhookDescriptor {
    return { events: [], supported: false };
  }

  getAuthorizationUrl(input: GoogleConnectDto): string {
    return this.oauthService.getAuthorizationUrl({
      redirectUri: input.redirectUri,
      state: input.state,
    });
  }

  async connectGoogleDrive(input: GoogleConnectDto) {
    if (!input.authorizationCode && input.connectionId) {
      return this.selectDrive(input);
    }

    if (!input.authorizationCode) {
      return {
        authorizationUrl: this.getAuthorizationUrl(input),
        status: 'authorization_required',
      };
    }

    const tokens = await this.oauthService.exchangeCode({
      authorizationCode: input.authorizationCode,
      redirectUri: input.redirectUri,
    });

    if (!tokens.refreshToken) {
      throw new Error(
        'Google did not return a refresh token. Re-consent with offline access.',
      );
    }

    const oauthClient = this.oauthService.createAuthorizedClient({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      redirectUri: input.redirectUri,
    });
    const drive = google.drive({ auth: oauthClient, version: 'v3' });
    const about = await drive.about.get({
      fields: 'user(emailAddress), user(displayName)',
    });

    const connection = this.connectionRepository.create({
      connectedAccountEmail:
        about.data.user?.emailAddress ?? 'unknown-google-account',
      connectedByUserId: input.connectedByUserId ?? null,
      driveId: input.driveType === 'shared_drive' ? input.driveId : null,
      driveName: input.driveType === 'shared_drive' ? null : 'My Drive',
      driveType: input.driveType ?? 'my_drive',
      encryptedRefreshToken: this.tokenVault.encrypt(tokens.refreshToken),
      lastConnectedAt: new Date(),
      status: 'connected',
    });

    await this.connectionRepository.save(connection);
    await this.ensureRootFolder(connection, drive);

    return this.toConnectionResponse(connection);
  }

  async listDrives(connectionId?: string): Promise<GoogleDriveDescriptor[]> {
    const drive = await this.createDriveClient(connectionId);
    const response = await drive.drives.list({
      fields: 'drives(id,name)',
      pageSize: 100,
    });

    return [
      { id: null, name: 'My Drive', type: 'my_drive' },
      ...(response.data.drives ?? []).map((sharedDrive) => ({
        id: sharedDrive.id ?? '',
        name: sharedDrive.name ?? 'Shared Drive',
        type: 'shared_drive' as const,
      })),
    ];
  }

  async createProjectFolder(input: GoogleProjectFolderDto) {
    const connection = await this.requireConnection(input.connectionId);
    const existing = await this.projectFolderRepository.findOne({
      where: { projectId: input.projectId },
    });
    if (existing) {
      return existing;
    }

    const drive = await this.createDriveClient(connection.id);
    await this.ensureRootFolder(connection, drive);
    if (!connection.rootFolderId) {
      throw new Error('Google Drive root folder is not available.');
    }

    const projectFolder = await this.findOrCreateFolder({
      connection,
      drive,
      name: input.projectName,
      parentId: connection.rootFolderId,
    });

    for (const folderName of GOOGLE_DRIVE_PROJECT_FOLDER_NAMES) {
      await this.findOrCreateFolder({
        connection,
        drive,
        name: folderName,
        parentId: projectFolder.id,
      });
    }

    const entity = this.projectFolderRepository.create({
      connectionId: connection.id,
      createdByUserId: input.createdByUserId ?? null,
      folderId: projectFolder.id,
      folderUrl: projectFolder.webViewLink,
      projectId: input.projectId,
      projectName: input.projectName,
      rootFolderId: connection.rootFolderId,
    });

    return this.projectFolderRepository.save(entity);
  }

  getProjectFolder(
    projectId: string,
  ): Promise<GoogleDriveProjectFolder | null> {
    return this.projectFolderRepository.findOne({ where: { projectId } });
  }

  async getProjectWorkspace(projectId: string) {
    const connection = await this.findConnection();
    if (!connection) {
      return {
        connection: null,
        folders: [],
        projectFolder: null,
        provider: this.provider.name,
        status: 'not_connected',
      };
    }

    const projectFolder = await this.getProjectFolder(projectId);
    const folders = projectFolder
      ? await this.listProjectDocumentFolders(
          connection,
          projectFolder.folderId,
        )
      : [];

    return {
      connection: this.toConnectionResponse(connection),
      folders,
      projectFolder,
      provider: this.provider.name,
      status: 'connected',
    };
  }

  async listDocuments(
    query: GoogleDocumentsQueryDto,
  ): Promise<GoogleDriveDocumentMetadata[]> {
    const connection = await this.requireConnection(query.connectionId);
    const folderId = await this.resolveFolderId(query);
    const drive = await this.createDriveClient(connection.id);
    const response = await drive.files.list({
      fields:
        'files(id,name,mimeType,owners(emailAddress),version,createdTime,modifiedTime,webViewLink,size,md5Checksum)',
      includeItemsFromAllDrives: true,
      pageSize: 100,
      q: [
        `'${folderId}' in parents`,
        `mimeType != '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
        'trashed = false',
      ].join(' and '),
      supportsAllDrives: true,
    });

    const documents: GoogleDriveDocumentMetadata[] = [];
    for (const file of response.data.files ?? []) {
      if (!file.id) {
        continue;
      }
      documents.push(
        await this.saveDocumentMetadata({
          file,
          folderId,
          projectId: query.projectId,
        }),
      );
    }

    return documents;
  }

  private async selectDrive(input: GoogleConnectDto) {
    const connection = await this.requireConnection(input.connectionId);
    connection.driveType = input.driveType ?? 'my_drive';
    connection.driveId =
      connection.driveType === 'shared_drive' ? input.driveId : null;
    connection.driveName =
      connection.driveType === 'shared_drive' ? null : 'My Drive';
    await this.connectionRepository.save(connection);

    const drive = await this.createDriveClient(connection.id);
    await this.ensureRootFolder(connection, drive);
    return this.toConnectionResponse(connection);
  }

  private async createDriveClient(
    connectionId?: string,
  ): Promise<drive_v3.Drive> {
    const connection = await this.requireConnection(connectionId);
    const oauthClient = this.oauthService.createAuthorizedClient({
      refreshToken: this.tokenVault.decrypt(connection.encryptedRefreshToken),
    });
    return google.drive({ auth: oauthClient, version: 'v3' });
  }

  private async ensureRootFolder(
    connection: GoogleDriveConnection,
    drive: drive_v3.Drive,
  ): Promise<void> {
    if (connection.rootFolderId) {
      return;
    }

    const folder = await this.findOrCreateFolder({
      connection,
      drive,
      name: GOOGLE_DRIVE_ROOT_FOLDER_NAME,
      parentId:
        connection.driveType === 'shared_drive' ? connection.driveId : 'root',
    });

    connection.rootFolderId = folder.id;
    connection.rootFolderUrl = folder.webViewLink;
    await this.connectionRepository.save(connection);
  }

  private async findOrCreateFolder(input: {
    connection: GoogleDriveConnection;
    drive: drive_v3.Drive;
    name: string;
    parentId?: string | null;
  }): Promise<{ id: string; webViewLink: string }> {
    const parentId = input.parentId ?? 'root';
    const response = await input.drive.files.list({
      corpora:
        input.connection.driveType === 'shared_drive' ? 'drive' : undefined,
      driveId:
        input.connection.driveType === 'shared_drive'
          ? (input.connection.driveId ?? undefined)
          : undefined,
      fields: 'files(id,name,webViewLink)',
      includeItemsFromAllDrives: true,
      q: [
        `name = '${escapeGoogleQueryValue(input.name)}'`,
        `mimeType = '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
        `'${escapeGoogleQueryValue(parentId)}' in parents`,
        'trashed = false',
      ].join(' and '),
      supportsAllDrives: true,
    });
    const existing = response.data.files?.[0];
    if (existing?.id) {
      return {
        id: existing.id,
        webViewLink: existing.webViewLink ?? googleDriveFolderUrl(existing.id),
      };
    }

    const created = await input.drive.files.create({
      fields: 'id,webViewLink',
      requestBody: {
        mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
        name: input.name,
        parents: [parentId],
      },
      supportsAllDrives: true,
    });

    if (!created.data.id) {
      throw new Error(
        `Google Drive did not return a folder id for ${input.name}.`,
      );
    }

    return {
      id: created.data.id,
      webViewLink:
        created.data.webViewLink ?? googleDriveFolderUrl(created.data.id),
    };
  }

  private async saveDocumentMetadata(input: {
    file: drive_v3.Schema$File;
    folderId: string;
    projectId?: string | null;
  }): Promise<GoogleDriveDocumentMetadata> {
    const providerDocumentId = input.file.id;
    if (!providerDocumentId) {
      throw new Error('Google Drive file metadata is missing an id.');
    }
    const existing = await this.documentMetadataRepository.findOne({
      where: { providerDocumentId },
    });
    const metadata = mapGoogleFileToMetadata(input);

    return this.documentMetadataRepository.save({
      ...(existing ?? {}),
      ...metadata,
      providerDocumentId,
    });
  }

  private async resolveFolderId(
    query: GoogleDocumentsQueryDto,
  ): Promise<string> {
    if (query.folderId) {
      return query.folderId;
    }
    if (query.projectId) {
      const projectFolder = await this.getProjectFolder(query.projectId);
      if (projectFolder) {
        return projectFolder.folderId;
      }
    }
    const connection = await this.requireConnection(query.connectionId);
    if (!connection.rootFolderId) {
      throw new Error('Google Drive root folder is not available.');
    }
    return connection.rootFolderId;
  }

  private async listProjectDocumentFolders(
    connection: GoogleDriveConnection,
    projectFolderId: string,
  ): Promise<GoogleProjectDocumentFolder[]> {
    const drive = await this.createDriveClient(connection.id);
    const response = await drive.files.list({
      corpora: connection.driveType === 'shared_drive' ? 'drive' : undefined,
      driveId:
        connection.driveType === 'shared_drive'
          ? (connection.driveId ?? undefined)
          : undefined,
      fields: 'files(id,name,webViewLink)',
      includeItemsFromAllDrives: true,
      q: [
        `'${escapeGoogleQueryValue(projectFolderId)}' in parents`,
        `mimeType = '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
        'trashed = false',
      ].join(' and '),
      supportsAllDrives: true,
    });

    const folderOrder = new Map<string, number>(
      GOOGLE_DRIVE_PROJECT_FOLDER_NAMES.map((name, index) => [name, index]),
    );

    return (response.data.files ?? [])
      .filter((folder): folder is drive_v3.Schema$File & { id: string } =>
        Boolean(folder.id && folderOrder.has(folder.name ?? '')),
      )
      .sort(
        (left, right) =>
          (folderOrder.get(left.name ?? '') ?? 99) -
          (folderOrder.get(right.name ?? '') ?? 99),
      )
      .map((folder) => ({
        id: folder.id,
        name: folder.name ?? folder.id,
        webUrl: folder.webViewLink ?? googleDriveFolderUrl(folder.id),
      }));
  }

  private async requireConnection(
    connectionId?: string | null,
  ): Promise<GoogleDriveConnection> {
    const connection = await this.findConnection(connectionId);
    if (!connection) {
      throw new Error('Google Drive connection is required.');
    }
    return connection;
  }

  private findConnection(
    connectionId?: string | null,
  ): Promise<GoogleDriveConnection | null> {
    if (connectionId) {
      return this.connectionRepository.findOne({ where: { id: connectionId } });
    }

    return this.connectionRepository.findOne({
      order: { lastConnectedAt: 'DESC' },
      where: { status: 'connected' as GoogleConnectionStatus },
    });
  }

  private toConnectionResponse(connection: GoogleDriveConnection) {
    return {
      connectedAccountEmail: connection.connectedAccountEmail,
      driveId: connection.driveId,
      driveName: connection.driveName,
      driveType: connection.driveType,
      id: connection.id,
      lastConnectedAt: connection.lastConnectedAt,
      rootFolderId: connection.rootFolderId,
      rootFolderUrl: connection.rootFolderUrl,
      status: connection.status,
    };
  }
}

function escapeGoogleQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function googleDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
