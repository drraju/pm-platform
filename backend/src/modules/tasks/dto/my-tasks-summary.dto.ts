import { ApiProperty } from '@nestjs/swagger';

export class MyTasksSummaryDto {
  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  todoTasks: number;

  @ApiProperty()
  inProgressTasks: number;

  @ApiProperty()
  blockedTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  overdueTasks: number;
}
