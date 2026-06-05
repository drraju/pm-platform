import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { RaidType } from '../../../common/enums/raid-type.enum';

export class CreateRaidItemDto {
  @ApiProperty({ enum: RaidType })
  @IsEnum(RaidType)
  type: RaidType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @ApiProperty({ default: 'open', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  probability?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  impact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mitigationPlan?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resolutionPlan?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  validationStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  validationNotes?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dependsOn?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
