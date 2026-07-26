import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  success: boolean;
}
