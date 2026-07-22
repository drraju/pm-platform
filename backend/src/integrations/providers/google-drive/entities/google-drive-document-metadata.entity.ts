import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'google_drive_document_metadata' })
@Index(['providerDocumentId'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['projectId'])
export class GoogleDriveDocumentMetadata extends BaseEntity {
  @Column({ default: 'google_drive' })
  provider: string;

  @Column({ name: 'provider_document_id' })
  providerDocumentId: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ name: 'folder_id', nullable: true })
  folderId?: string | null;

  @Column()
  name: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType?: string | null;

  @Column({ nullable: true })
  owner?: string | null;

  @Column({ nullable: true })
  version?: string | null;

  @Column({ name: 'created_time', type: 'timestamptz', nullable: true })
  createdTime?: Date | null;

  @Column({ name: 'modified_time', type: 'timestamptz', nullable: true })
  modifiedTime?: Date | null;

  @Column({ name: 'web_url', nullable: true })
  webUrl?: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes?: string | null;

  @Column({ nullable: true })
  checksum?: string | null;
}
