import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateExceptionDayDto {
  @ApiProperty({ example: '2026-11-27' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Special closure' })
  @IsString()
  name: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  closed: boolean;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  workingDayStart?: string | null;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  workingDayEnd?: string | null;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(24)
  hours?: number | null;
}

export class UpdateExceptionDayDto extends CreateExceptionDayDto {}

export class ExceptionDayResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  calendarId: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  closed: boolean;

  @ApiPropertyOptional()
  workingDayStart?: string | null;

  @ApiPropertyOptional()
  workingDayEnd?: string | null;

  @ApiPropertyOptional()
  hours?: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
