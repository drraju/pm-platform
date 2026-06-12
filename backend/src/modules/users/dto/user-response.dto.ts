import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleResponseDto } from './role-response.dto';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: RoleResponseDto })
  role?: RoleResponseDto | null;
}
