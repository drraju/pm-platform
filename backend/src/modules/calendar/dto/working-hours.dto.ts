import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateWorkingHoursDto {
  @ApiProperty({ minimum: 0, maximum: 6, example: 1 })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  start: string;

  @ApiProperty({ example: '17:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  end: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(24)
  hours?: number;
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  start: string;

  @ApiProperty({ example: '17:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  end: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(24)
  hours?: number;
}

export class WorkingHoursResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  calendarId: string;

  @ApiProperty()
  dayOfWeek: number;

  @ApiProperty()
  start: string;

  @ApiProperty()
  end: string;

  @ApiProperty()
  hours: number;
}
