export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

export const GOOGLE_DRIVE_ROOT_FOLDER_NAME = 'PM Platform';

export const GOOGLE_DRIVE_PROJECT_FOLDER_NAMES = [
  '01 Business',
  '02 Architecture',
  '03 Delivery',
  '04 Release',
  '05 Operations',
] as const;

export const GOOGLE_DRIVE_FOLDER_MIME_TYPE =
  'application/vnd.google-apps.folder';

export const GOOGLE_DRIVE_PROVIDER = 'google_drive';
