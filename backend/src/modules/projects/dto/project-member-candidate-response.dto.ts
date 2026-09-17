import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '../../../common/enums/project-role.enum';

export class ProjectMemberCandidateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true, type: String })
  globalRoleName: string | null;

  @ApiProperty({ enum: ProjectRole, isArray: true })
  allowedProjectRoles: ProjectRole[];
}
