import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExternalBadRequestErrorDto {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { items: { type: 'string' }, type: 'array' }],
  })
  message: string | string[];

  @ApiPropertyOptional({ example: 'Bad Request', type: String })
  error?: string;

  @ApiProperty({ enum: [400], example: 400, type: 'integer' })
  statusCode: number;
}

export class ExternalUnauthorizedErrorDto {
  @ApiProperty({ example: 'Unauthorized', type: String })
  message: string;

  @ApiPropertyOptional({ example: 'Unauthorized', type: String })
  error?: string;

  @ApiProperty({ enum: [401], example: 401, type: 'integer' })
  statusCode: number;
}

export class ExternalForbiddenErrorDto {
  @ApiProperty({ example: 'External API access denied', type: String })
  message: string;

  @ApiProperty({ example: 'Forbidden', type: String })
  error: string;

  @ApiProperty({ enum: [403], example: 403, type: 'integer' })
  statusCode: number;
}
