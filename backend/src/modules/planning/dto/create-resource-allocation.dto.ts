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
import { ResourceAllocationUnit } from '../../../common/enums/resource-allocation-unit.enum';

export class CreateResourceAllocationDto {
  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @ApiProperty({ enum: ResourceAllocationUnit })
  @IsEnum(ResourceAllocationUnit)
  resourceUnit: ResourceAllocationUnit;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teamName?: string | null;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent: number;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ minimum: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  plannedMinutesPerDay?: number | null;
}
