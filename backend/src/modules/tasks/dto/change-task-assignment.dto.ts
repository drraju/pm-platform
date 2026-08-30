import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class ChangeTaskAssignmentDto {
  @ApiProperty({ format: 'uuid', nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  assigneeId: string | null;
}
