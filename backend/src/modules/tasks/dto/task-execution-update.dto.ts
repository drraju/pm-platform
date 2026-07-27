import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class CreateTaskExecutionUpdateDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsString()
  priority: string;

  @ApiProperty({ maximum: 100, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(100)
  percentComplete: number;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextStep?: string | null;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  nextActionOwnerId?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  targetCompletionDate?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  updateNotes?: string | null;
}

export class TaskExecutionUpdateDto {
  id: string;
  taskId: string;
  projectId: string;
  status: TaskStatus;
  priority: string;
  percentComplete: number;
  assigneeId?: string | null;
  nextStep?: string | null;
  nextActionOwnerId?: string | null;
  targetCompletionDate?: string | null;
  updateNotes?: string | null;
  updatedById?: string | null;
  updatedOn?: Date;
}
