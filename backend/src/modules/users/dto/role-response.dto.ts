import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionResponseDto } from './permission-response.dto';

export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ type: PermissionResponseDto, isArray: true })
  permissions: PermissionResponseDto[];
}
