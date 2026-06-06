import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ProjectRole } from '../../../common/enums/project-role.enum';

export class CreateProjectMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ProjectRole, default: ProjectRole.Contributor })
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;
}
