import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetActiveProjectBaselineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  baselineId: string;
}
