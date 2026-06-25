import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID } from 'class-validator';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';

export class CreatePlanningDependencyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  predecessorTaskId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  successorTaskId: string;

  @ApiProperty({ enum: TaskDependencyType })
  @IsEnum(TaskDependencyType)
  dependencyType: TaskDependencyType;

  @ApiProperty({ default: 0, required: false })
  @IsOptional()
  @IsInt()
  lagDays?: number;
}
