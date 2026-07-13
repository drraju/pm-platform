import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SkillStatus } from '../enums/skill-status.enum';

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

export class CreateSkillDto {
  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ enum: SkillStatus, example: SkillStatus.Active })
  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;

  @ApiPropertyOptional({
    example: 'Typed language used across frontend and backend services',
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateSkillDto extends PartialType(CreateSkillDto) {}

export class QuerySkillsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  includeArchived?: boolean;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'typescript' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SkillStatus, example: SkillStatus.Active })
  @IsOptional()
  @IsEnum(SkillStatus)
  status?: SkillStatus;
}

export class SkillResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiProperty({ enum: SkillStatus })
  status: SkillStatus;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
