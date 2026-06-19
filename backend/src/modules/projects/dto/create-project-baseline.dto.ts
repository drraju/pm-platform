import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateProjectBaselineDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: 'approved', required: false })
  @IsOptional()
  @IsIn(['draft', 'approved', 'superseded'])
  status?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  setAsCurrent?: boolean;
}
