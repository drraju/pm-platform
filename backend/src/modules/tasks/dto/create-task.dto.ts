import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class CreateTaskDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiProperty({ enum: TaskStatus, default: TaskStatus.Backlog })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ default: 'medium', required: false })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiProperty({ enum: TaskKind, default: TaskKind.Standard, required: false })
  @IsOptional()
  @IsEnum(TaskKind)
  taskKind?: TaskKind;

  @ApiProperty({ default: 0, maximum: 100, minimum: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentComplete?: number;

  @ApiProperty({ minimum: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sequenceNumber?: number | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  actualStartDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  actualEndDate?: string | null;

  @ApiProperty({ minimum: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number | null;

  @ApiProperty({ minimum: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingHours?: number | null;
}
