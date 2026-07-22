import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GoogleProjectFolderDto {
  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsOptional()
  @IsUUID()
  createdByUserId?: string;

  @IsUUID()
  projectId: string;

  @IsString()
  projectName: string;
}
