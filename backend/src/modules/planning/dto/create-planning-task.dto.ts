import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { TaskType } from '../../../common/enums/task-type.enum';

export class CreatePlanningTaskDto {
  @ApiProperty({ required: false, default: 'New Task' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  @ApiProperty({ enum: TaskType, default: TaskType.Task, required: false })
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
