import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';

export enum MilestoneApiState {
  Unscheduled = 'unscheduled',
  Upcoming = 'upcoming',
  Overdue = 'overdue',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum MilestoneApiSort {
  Title = 'title',
  PlannedDate = 'plannedDate',
  ForecastDate = 'forecastDate',
  ActualDate = 'actualDate',
  VarianceDays = 'varianceDays',
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

@ValidatorConstraint({ name: 'milestoneDateRange', async: false })
export class MilestoneDateRangeConstraint implements ValidatorConstraintInterface {
  validate(dateTo: string | undefined, arguments_: ValidationArguments) {
    const query = arguments_.object as MilestoneQueryDto;
    return !dateTo || !query.dateFrom || dateTo >= query.dateFrom;
  }

  defaultMessage() {
    return 'dateTo must be on or after dateFrom';
  }
}

export class MilestoneQueryDto {
  @ApiPropertyOptional({ enum: MilestoneApiState, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : value.split(','),
  )
  @IsEnum(MilestoneApiState, { each: true })
  state?: MilestoneApiState[];

  @ApiPropertyOptional({ enum: MilestoneCategory })
  @IsOptional()
  @IsEnum(MilestoneCategory)
  category?: MilestoneCategory;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Validate(MilestoneDateRangeConstraint)
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  critical?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeCancelled?: boolean;

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

  @ApiPropertyOptional({ enum: MilestoneApiSort })
  @IsOptional()
  @IsEnum(MilestoneApiSort)
  sort?: MilestoneApiSort;

  @ApiPropertyOptional({ enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}
