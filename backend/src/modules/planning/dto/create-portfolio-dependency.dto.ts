import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';

export class CreatePortfolioDependencyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  predecessorProjectId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  successorProjectId: string;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  predecessorTaskId?: string | null;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  successorTaskId?: string | null;

  @ApiProperty({ enum: TaskDependencyType })
  @IsEnum(TaskDependencyType)
  dependencyType: TaskDependencyType;

  @ApiProperty({ default: 0, required: false })
  @IsOptional()
  @IsInt()
  lagDays?: number;

  @ApiProperty({ default: 'active', required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
