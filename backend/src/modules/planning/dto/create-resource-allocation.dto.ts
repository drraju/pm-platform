import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateResourceAllocationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ minimum: 0, maximum: 200 })
  @IsNumber()
  @Min(0)
  @Max(200)
  allocationPercent: number;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiProperty({ format: 'date', required: false })
  @IsOptional()
  @IsDateString()
  finishDate?: string | null;
}
