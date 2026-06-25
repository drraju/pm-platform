import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ResourceAllocationUnit } from '../../../common/enums/resource-allocation-unit.enum';

export class CreateResourceCapacityDto {
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

  @ApiProperty({ format: 'date' })
  @IsDateString()
  capacityDate: string;

  @ApiProperty({ default: 480, minimum: 0 })
  @IsInt()
  @Min(0)
  capacityMinutes: number;

  @ApiProperty({ default: 'UTC', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
}
