import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';

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

export class CreateResourceSkillDto {
  @ApiProperty({ example: '4d136f2c-f4b2-4d33-b351-397de2a93dc3' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ example: '3e9e5d92-b2e4-4f13-9d66-c8b39536bb4d' })
  @IsUUID()
  skillId: string;

  @ApiProperty({
    enum: SkillProficiencyLevel,
    example: SkillProficiencyLevel.Advanced,
  })
  @IsEnum(SkillProficiencyLevel)
  proficiencyLevel: SkillProficiencyLevel;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number | null;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  monthsExperience?: number | null;

  @ApiPropertyOptional({
    enum: ResourceSkillStatus,
    example: ResourceSkillStatus.Active,
  })
  @IsOptional()
  @IsEnum(ResourceSkillStatus)
  status?: ResourceSkillStatus;

  @ApiPropertyOptional({
    example: 'Applied on portfolio and ERM features over the past year',
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateResourceSkillDto extends PartialType(
  CreateResourceSkillDto,
) {}

export class QueryResourceSkillsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({ example: '4d136f2c-f4b2-4d33-b351-397de2a93dc3' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiPropertyOptional({ example: '3e9e5d92-b2e4-4f13-9d66-c8b39536bb4d' })
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional({
    enum: SkillProficiencyLevel,
    example: SkillProficiencyLevel.Intermediate,
  })
  @IsOptional()
  @IsEnum(SkillProficiencyLevel)
  proficiencyLevel?: SkillProficiencyLevel;

  @ApiPropertyOptional({
    enum: ResourceSkillStatus,
    example: ResourceSkillStatus.Active,
  })
  @IsOptional()
  @IsEnum(ResourceSkillStatus)
  status?: ResourceSkillStatus;
}

export class ResourceSkillResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resourceId: string;

  @ApiProperty()
  skillId: string;

  @ApiProperty({ enum: SkillProficiencyLevel })
  proficiencyLevel: SkillProficiencyLevel;

  @ApiPropertyOptional()
  yearsExperience?: number | null;

  @ApiPropertyOptional()
  monthsExperience?: number | null;

  @ApiProperty({ enum: ResourceSkillStatus })
  status: ResourceSkillStatus;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
