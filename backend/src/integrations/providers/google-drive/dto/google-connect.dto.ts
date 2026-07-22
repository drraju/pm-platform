import { GoogleDriveType } from '../entities';

export class GoogleConnectDto {
  authorizationCode?: string;
  connectionId?: string;
  connectedByUserId?: string;
  driveId?: string;
  driveType?: GoogleDriveType;
  redirectUri?: string;
  state?: string;
}
