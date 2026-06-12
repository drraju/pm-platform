import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  key: string;

  @ApiPropertyOptional()
  description?: string | null;
}
