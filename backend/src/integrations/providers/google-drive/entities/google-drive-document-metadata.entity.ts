import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'google_drive_document_metadata' })
@Index(['providerDocumentId'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['projectId'])
export class GoogleDriveDocumentMetadata extends BaseEntity {
  @Column({ default: 'google_drive', type: 'varchar' })
  provider: string;

  @Column({ name: 'provider_document_id', type: 'varchar' })
  providerDocumentId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ name: 'folder_id', nullable: true, type: 'varchar' })
  folderId?: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'mime_type', nullable: true, type: 'varchar' })
  mimeType?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  owner?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  version?: string | null;

  @Column({ name: 'created_time', type: 'timestamptz', nullable: true })
  createdTime?: Date | null;

  @Column({ name: 'modified_time', type: 'timestamptz', nullable: true })
  modifiedTime?: Date | null;

  @Column({ name: 'web_url', nullable: true, type: 'text' })
  webUrl?: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes?: string | null;

  @Column({ nullable: true, type: 'varchar' })
  checksum?: string | null;
}
