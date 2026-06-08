import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { ProjectVisibilityLevel } from '../../../common/enums/project-visibility-level.enum';

export class UpdateProjectMemberDto {
  @ApiProperty({ enum: ProjectRole, required: false })
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @ApiProperty({ enum: ProjectVisibilityLevel, required: false })
  @IsOptional()
  @IsEnum(ProjectVisibilityLevel)
  visibilityLevel?: ProjectVisibilityLevel;
}
