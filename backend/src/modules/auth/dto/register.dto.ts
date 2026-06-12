import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
