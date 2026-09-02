import { ApiProperty } from '@nestjs/swagger';

export class ExternalErrorDto {
  @ApiProperty({ example: 'Forbidden' })
  error: string;

  @ApiProperty({ example: 'External API access denied' })
  message: string;

  @ApiProperty({ example: 403 })
  statusCode: number;
}
