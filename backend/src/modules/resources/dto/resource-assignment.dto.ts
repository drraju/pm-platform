import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';

export class CreateResourceAssignmentDto {
  @ApiProperty({ example: '4d136f2c-f4b2-4d33-b351-397de2a93dc3' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ example: '3e9e5d92-b2e4-4f13-9d66-c8b39536bb4d' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: '750f3af5-4693-4ed4-bf57-814d3fa08881' })
  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  allocationPercent?: number | null;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @IsInt()
  plannedMinutesPerDay?: number | null;

  @ApiProperty({ example: '2026-07-11' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-07-18' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: ResourceAssignmentStatus,
    example: ResourceAssignmentStatus.Active,
  })
  @IsOptional()
  @IsEnum(ResourceAssignmentStatus)
  status?: ResourceAssignmentStatus;
}

export class UpdateResourceAssignmentDto extends PartialType(
  CreateResourceAssignmentDto,
) {}

export class ResourceAssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resourceId: string;

  @ApiProperty()
  projectId: string;

  @ApiPropertyOptional()
  taskId?: string | null;

  @ApiPropertyOptional()
  allocationPercent?: number | null;

  @ApiPropertyOptional()
  plannedMinutesPerDay?: number | null;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty({ enum: ResourceAssignmentStatus })
  status: ResourceAssignmentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
