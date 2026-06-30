import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskType } from '../../../common/enums/task-type.enum';

export class UpdatePlanningTaskScheduleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taskTitle?: string;

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

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

  @ApiProperty({ minimum: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationDays?: number | null;

  @ApiProperty({ minimum: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequenceNumber?: number | null;

  @ApiProperty({ format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  @ApiProperty({ format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @ApiProperty({ enum: TaskType, required: false })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  summaryCategory?: string | null;

  @ApiProperty({ enum: MilestoneCategory, required: false })
  @IsOptional()
  @IsString()
  milestoneCategory?: MilestoneCategory | string | null;
}
