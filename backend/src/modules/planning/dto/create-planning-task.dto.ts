import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePlanningTaskDto {
  @ApiProperty({ required: false, default: 'New Task' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;
}
