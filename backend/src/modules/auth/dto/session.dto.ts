import { ApiProperty } from '@nestjs/swagger';

export class SessionDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ required: false })
  requiresPasswordChange?: boolean;
}
