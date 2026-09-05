import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class ExchangeGoogleOidcSessionDto {
  @ApiProperty({
    description: 'Opaque, single-use Google OIDC session handoff reference',
  })
  @Allow()
  handoff: unknown;
}
