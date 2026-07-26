import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'Reset token is required' })
  token: string;

  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'New password is required' })
  newPassword: string;

  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'Confirm password is required' })
  confirmPassword: string;
}
