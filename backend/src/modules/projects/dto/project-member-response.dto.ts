import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectRole } from '../../../common/enums/project-role.enum';

class ProjectMemberUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'Jane' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName: string;

  @ApiPropertyOptional({ example: 'Project Manager' })
  role?: string | null;
}

export class ProjectMemberResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ enum: ProjectRole })
  role: ProjectRole;

  @ApiPropertyOptional({ type: ProjectMemberUserDto })
  user?: ProjectMemberUserDto | null;
}
