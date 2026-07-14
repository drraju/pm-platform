import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';

export class CreateResourceAvailabilityOverrideDto {
  @ApiProperty({
    enum: ResourceAvailabilityOverrideType,
    example: ResourceAvailabilityOverrideType.ReducedCapacity,
  })
  @IsEnum(ResourceAvailabilityOverrideType)
  overrideType: ResourceAvailabilityOverrideType;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableMinutesPerWorkingDay?: number | null;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-03' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 'Training block' })
  @IsOptional()
  @IsString()
  reason?: string | null;
}

export class UpdateResourceAvailabilityOverrideDto extends PartialType(
  CreateResourceAvailabilityOverrideDto,
) {}

export class ResourceAvailabilityOverrideResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resourceId: string;

  @ApiProperty({ enum: ResourceAvailabilityOverrideType })
  overrideType: ResourceAvailabilityOverrideType;

  @ApiPropertyOptional()
  availableMinutesPerWorkingDay?: number | null;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
