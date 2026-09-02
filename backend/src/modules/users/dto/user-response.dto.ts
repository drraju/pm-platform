import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
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

  @ApiPropertyOptional({ enum: UserIdentityType })
  identityType?: UserIdentityType;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lastLoginAt?: Date | null;

  @ApiProperty()
  accountHistory: Array<{
    action: string;
    administratorId: string;
    timestamp: string;
  }>;

  @ApiPropertyOptional({ type: RoleResponseDto })
  role?: RoleResponseDto | null;
}
