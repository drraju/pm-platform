import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';

export class CreateResourceCapacityPolicyDto {
  @ApiProperty({ example: 480 })
  @IsInt()
  @Min(0)
  capacityMinutesPerWorkingDay: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  effectiveStartDate: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string | null;

  @ApiPropertyOptional({
    enum: ResourceCapacityPolicyStatus,
    example: ResourceCapacityPolicyStatus.Active,
  })
  @IsOptional()
  @IsEnum(ResourceCapacityPolicyStatus)
  status?: ResourceCapacityPolicyStatus;
}

export class UpdateResourceCapacityPolicyDto extends PartialType(
  CreateResourceCapacityPolicyDto,
) {}

export class ResourceCapacityPolicyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resourceId: string;

  @ApiProperty()
  capacityMinutesPerWorkingDay: number;

  @ApiProperty()
  effectiveStartDate: string;

  @ApiPropertyOptional()
  effectiveEndDate?: string | null;

  @ApiProperty({ enum: ResourceCapacityPolicyStatus })
  status: ResourceCapacityPolicyStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
