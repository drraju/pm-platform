import { ApiProperty } from '@nestjs/swagger';

export class AuthProfileDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'project.manager@example.com' })
  email: string;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ example: 'Project Manager' })
  roleName: string;

  @ApiProperty({ type: [String], example: ['dashboard:read:self'] })
  permissions: string[];
}

