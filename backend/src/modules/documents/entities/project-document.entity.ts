import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { User } from '../../users/entities/user.entity';
import { DocumentCategory } from './document-category.entity';
import { DocumentType } from './document-type.entity';

export enum DocumentStorageProvider {
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  SHAREPOINT = 'SHAREPOINT',
  ONEDRIVE = 'ONEDRIVE',
  CONFLUENCE = 'CONFLUENCE',
  GITHUB = 'GITHUB',
  DROPBOX = 'DROPBOX',
  NETWORK_SHARE = 'NETWORK_SHARE',
  OTHER = 'OTHER',
}

export const DOCUMENT_STORAGE_PROVIDER_LABELS: Record<
  DocumentStorageProvider,
  string
> = {
  [DocumentStorageProvider.GOOGLE_DRIVE]: 'Google Drive',
  [DocumentStorageProvider.SHAREPOINT]: 'SharePoint',
  [DocumentStorageProvider.ONEDRIVE]: 'OneDrive',
  [DocumentStorageProvider.CONFLUENCE]: 'Confluence',
  [DocumentStorageProvider.GITHUB]: 'GitHub',
  [DocumentStorageProvider.DROPBOX]: 'Dropbox',
  [DocumentStorageProvider.NETWORK_SHARE]: 'Network Share',
  [DocumentStorageProvider.OTHER]: 'Other',
};

export enum DocumentApprovalStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentLinkStatus {
  UNKNOWN = 'UNKNOWN',
}

export enum DocumentReviewStatus {
  CURRENT = 'CURRENT',
  REVIEW_DUE_SOON = 'REVIEW_DUE_SOON',
  OVERDUE = 'OVERDUE',
  NEVER_REVIEWED = 'NEVER_REVIEWED',
}

@Entity({ name: 'project_documents' })
@Index(['projectId'])
@Index(['storageProvider'])
@Index(['approvalStatus'])
@Index(['ownerId'])
@Index(['documentTypeId'])
@Index(['categoryId'])
export class ProjectDocument extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'owner_id', nullable: true, type: 'uuid' })
  ownerId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description?: string | null;

  @Column({ name: 'category_id', nullable: true, type: 'uuid' })
  categoryId?: string | null;

  @ManyToOne(() => DocumentCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: DocumentCategory | null;

  @Column({ name: 'document_type_id', type: 'uuid' })
  documentTypeId: string;

  @ManyToOne(() => DocumentType)
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType;

  @Column({ nullable: true, type: 'varchar' })
  version?: string | null;

  @Column({
    default: DocumentApprovalStatus.DRAFT,
    name: 'approval_status',
    type: 'varchar',
  })
  approvalStatus: DocumentApprovalStatus;

  @Column({
    default: DocumentLinkStatus.UNKNOWN,
    name: 'link_status',
    type: 'varchar',
  })
  linkStatus: DocumentLinkStatus;

  @Column({ name: 'storage_provider', type: 'varchar' })
  storageProvider: DocumentStorageProvider;

  @Column({ name: 'external_url', type: 'text' })
  externalUrl: string;

  @Column({ name: 'last_reviewed_at', nullable: true, type: 'timestamptz' })
  lastReviewedAt?: Date | null;

  @Column({ name: 'next_review_at', nullable: true, type: 'timestamptz' })
  nextReviewAt?: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy?: User | null;
}
