import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRiskDto {
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

  @ApiProperty({ default: 'medium', required: false })
  @IsOptional()
  @IsString()
  probability?: string;

  @ApiProperty({ default: 'medium', required: false })
  @IsOptional()
  @IsString()
  impact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mitigationPlan?: string | null;
}
