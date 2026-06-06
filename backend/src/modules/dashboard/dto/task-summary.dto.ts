import { ApiProperty } from '@nestjs/swagger';

export class TaskSummaryDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  todo: number;

  @ApiProperty()
  inProgress: number;

  @ApiProperty()
  blocked: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  overdue: number;
}
