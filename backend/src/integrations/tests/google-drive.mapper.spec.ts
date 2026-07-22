import { mapGoogleFileToMetadata } from '../providers/google-drive/google-drive.mapper';

describe('Google Drive metadata mapper', () => {
  it('maps Google files to metadata-only records', () => {
    const metadata = mapGoogleFileToMetadata({
      file: {
        createdTime: '2026-07-20T10:00:00.000Z',
        id: 'file-1',
        md5Checksum: 'checksum-1',
        mimeType: 'application/pdf',
        modifiedTime: '2026-07-21T10:00:00.000Z',
        name: 'HLD.pdf',
        owners: [{ emailAddress: 'owner@example.com' }],
        size: '1024',
        version: '7',
        webViewLink: 'https://drive.google.com/file/d/file-1/view',
      },
      folderId: 'folder-1',
      projectId: 'project-1',
    });

    expect(metadata).toMatchObject({
      checksum: 'checksum-1',
      folderId: 'folder-1',
      mimeType: 'application/pdf',
      name: 'HLD.pdf',
      owner: 'owner@example.com',
      projectId: 'project-1',
      provider: 'google_drive',
      providerDocumentId: 'file-1',
      sizeBytes: '1024',
      version: '7',
      webUrl: 'https://drive.google.com/file/d/file-1/view',
    });
  });
});
