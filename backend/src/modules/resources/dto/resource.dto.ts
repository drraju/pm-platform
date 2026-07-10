import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';

function transformBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

export class CreateResourceDto {
  @ApiProperty({ example: 'Senior Engineer' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.Human })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  roleName?: string | null;

  @ApiPropertyOptional({ example: 'Delivers backend planning services' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ResourceStatus, example: ResourceStatus.Active })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional({
    example: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}

export class QueryResourcesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({ enum: ResourceType, example: ResourceType.Human })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @ApiPropertyOptional({ example: 'engineer' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ResourceStatus, example: ResourceStatus.Active })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;
}

export class ResourceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ResourceType })
  resourceType: ResourceType;

  @ApiProperty({ enum: ResourceStatus })
  status: ResourceStatus;

  @ApiPropertyOptional()
  userId?: string | null;

  @ApiPropertyOptional()
  roleName?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
