import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import {
  DocumentApprovalStatus,
  DocumentStorageProvider,
} from '../entities/project-document.entity';

export class CreateProjectDocumentDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsString()
  documentType: string;

  @IsOptional()
  @IsString()
  version?: string | null;

  @IsOptional()
  @IsEnum(DocumentApprovalStatus)
  approvalStatus?: DocumentApprovalStatus;

  @IsEnum(DocumentStorageProvider)
  storageProvider: DocumentStorageProvider;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  externalUrl: string;

  @IsOptional()
  @IsDateString()
  lastReviewedAt?: string | null;

  @IsOptional()
  @IsDateString()
  nextReviewAt?: string | null;
}
