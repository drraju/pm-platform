import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GoogleDocumentsQueryDto {
  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
