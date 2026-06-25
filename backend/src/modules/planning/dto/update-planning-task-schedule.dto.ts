import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePlanningTaskScheduleDto {
  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string | null;

  @ApiProperty({ minimum: 0, maximum: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentComplete?: number;
}
