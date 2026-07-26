import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'New password is required' })
  newPassword: string;

  @ApiProperty()
  @IsString()
  @Matches(/\S/, { message: 'Confirm password is required' })
  confirmPassword: string;
}
