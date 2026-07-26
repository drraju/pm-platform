import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignableUserResponseDto {
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

  @ApiPropertyOptional({ example: 'PROJECT_MANAGER' })
  role?: string | null;
}
