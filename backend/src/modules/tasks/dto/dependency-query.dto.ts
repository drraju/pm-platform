import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { DependencyHealth } from '../dependency-domain';

export enum DependencyApiSort {
  Predecessor = 'predecessor',
  Successor = 'successor',
  Health = 'health',
  Impact = 'impact',
  DependencyType = 'dependencyType',
}

export enum DependencyApiSortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export class DependencyQueryDto {
  @ApiPropertyOptional({ enum: TaskDependencyType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsEnum(TaskDependencyType, { each: true })
  dependencyType?: TaskDependencyType[];

  @ApiPropertyOptional({ enum: DependencyHealth, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsEnum(DependencyHealth, { each: true })
  health?: DependencyHealth[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  blocked?: boolean;

  @ApiPropertyOptional({ format: 'uuid', isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsUUID(undefined, { each: true })
  taskId?: string[];

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: DependencyApiSort })
  @IsOptional()
  @IsEnum(DependencyApiSort)
  sort?: DependencyApiSort;

  @ApiPropertyOptional({ enum: DependencyApiSortOrder })
  @IsOptional()
  @IsEnum(DependencyApiSortOrder)
  order?: DependencyApiSortOrder;

  @ApiPropertyOptional({ default: 25, maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  impactDepth?: number;

  @ApiPropertyOptional({ default: 500, maximum: 1000, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  impactTaskLimit?: number;
}

function toArray({ value }: { value: string | string[] }): string[] {
  return Array.isArray(value) ? value : value.split(',');
}

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}
