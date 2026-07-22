import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

export type GoogleDriveType = 'my_drive' | 'shared_drive';
export type GoogleConnectionStatus = 'connected' | 'error' | 'pending';

@Entity({ name: 'google_drive_connections' })
@Index(['connectedAccountEmail'])
export class GoogleDriveConnection extends BaseEntity {
  @Column({ name: 'connected_account_email' })
  connectedAccountEmail: string;

  @Column({ name: 'connected_by_user_id', type: 'uuid', nullable: true })
  connectedByUserId?: string | null;

  @Column({ name: 'drive_id', nullable: true })
  driveId?: string | null;

  @Column({ name: 'drive_name', nullable: true })
  driveName?: string | null;

  @Column({ name: 'drive_type' })
  driveType: GoogleDriveType;

  @Column({ name: 'encrypted_refresh_token', type: 'text' })
  encryptedRefreshToken: string;

  @Column({ name: 'root_folder_id', nullable: true })
  rootFolderId?: string | null;

  @Column({ name: 'root_folder_url', nullable: true })
  rootFolderUrl?: string | null;

  @Column({ name: 'last_connected_at', type: 'timestamptz' })
  lastConnectedAt: Date;

  @Column({ default: 'connected' })
  status: GoogleConnectionStatus;
}
