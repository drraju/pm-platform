import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';

export enum CalendarType {
  Enterprise = 'enterprise',
}

export class CreateCalendarDto {
  @ApiProperty({ example: 'Corporate Calendar' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Default enterprise working calendar' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: CalendarType, example: CalendarType.Enterprise })
  @IsEnum(CalendarType)
  type: CalendarType;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2, 3, 4, 5] })
  @IsOptional()
  @IsArray()
  defaultWorkingDays?: number[];

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  workingDayStart?: string | null;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  workingDayEnd?: string | null;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(24)
  hoursPerDay?: number;

  @ApiPropertyOptional({ enum: CalendarStatus, example: CalendarStatus.Active })
  @IsOptional()
  @IsEnum(CalendarStatus)
  status?: CalendarStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {}

export class CalendarResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: CalendarType })
  type: CalendarType;

  @ApiProperty()
  timezone: string;

  @ApiProperty({ type: [Number] })
  defaultWorkingDays: number[];

  @ApiPropertyOptional()
  workingDayStart?: string | null;

  @ApiPropertyOptional()
  workingDayEnd?: string | null;

  @ApiProperty()
  hoursPerDay: number;

  @ApiProperty({ enum: CalendarStatus })
  status: CalendarStatus;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
