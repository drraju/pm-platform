import { drive_v3 } from 'googleapis';
import { GoogleDriveDocumentMetadata } from './entities';
import { GOOGLE_DRIVE_PROVIDER } from './google-drive.constants';

export function mapGoogleFileToMetadata(input: {
  file: drive_v3.Schema$File;
  folderId?: string | null;
  projectId?: string | null;
}): Partial<GoogleDriveDocumentMetadata> {
  return {
    checksum: input.file.md5Checksum ?? null,
    createdTime: input.file.createdTime
      ? new Date(input.file.createdTime)
      : null,
    folderId: input.folderId ?? null,
    mimeType: input.file.mimeType ?? null,
    modifiedTime: input.file.modifiedTime
      ? new Date(input.file.modifiedTime)
      : null,
    name: input.file.name ?? input.file.id ?? 'Untitled',
    owner: input.file.owners?.[0]?.emailAddress ?? null,
    projectId: input.projectId ?? null,
    provider: GOOGLE_DRIVE_PROVIDER,
    providerDocumentId: input.file.id ?? '',
    sizeBytes: input.file.size ?? null,
    version: input.file.version ?? null,
    webUrl: input.file.webViewLink ?? null,
  };
}
