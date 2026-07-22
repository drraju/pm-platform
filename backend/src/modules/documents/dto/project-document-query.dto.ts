import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  DocumentApprovalStatus,
  DocumentReviewStatus,
  DocumentStorageProvider,
} from '../entities/project-document.entity';

export enum ProjectDocumentSortBy {
  APPROVAL_STATUS = 'approvalStatus',
  CREATED_AT = 'createdAt',
  LAST_REVIEWED_AT = 'lastReviewedAt',
  NEXT_REVIEW_AT = 'nextReviewAt',
  OWNER = 'owner',
  TITLE = 'title',
  UPDATED_AT = 'updatedAt',
  VERSION = 'version',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ProjectDocumentQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsEnum(DocumentApprovalStatus)
  approvalStatus?: DocumentApprovalStatus;

  @IsOptional()
  @IsEnum(DocumentStorageProvider)
  storageProvider?: DocumentStorageProvider;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsEnum(DocumentReviewStatus)
  reviewStatus?: DocumentReviewStatus;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectDocumentSortBy)
  sortBy?: ProjectDocumentSortBy;

  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection?: SortDirection;
}
