import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from '../../users/dto/permission-response.dto';
import { RoleResponseDto } from '../../users/dto/role-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthMeDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: RoleResponseDto, isArray: true })
  roles: RoleResponseDto[];

  @ApiProperty({ type: PermissionResponseDto, isArray: true })
  permissions: PermissionResponseDto[];
}
