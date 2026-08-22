import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateProjectBaselineDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: 'approved', required: false })
  @IsOptional()
  @IsIn(['draft', 'approved'])
  status?: string;

  @ApiProperty({
    default: false,
    deprecated: true,
    description:
      'Explicitly capture and activate this baseline. Omit for normal capture; the first approved baseline is established as active automatically.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  setAsCurrent?: boolean;
}
