import { ApiProperty } from '@nestjs/swagger';
import { Project } from '../../projects/entities/project.entity';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { PlanningTaskSchedule } from '../entities/planning-task-schedule.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';
import { ScheduleSnapshot } from '../entities/schedule-snapshot.entity';

export class PlanningWorkspaceDto {
  @ApiProperty({ type: Project })
  project: Project;

  @ApiProperty({ type: ScheduleSnapshot })
  snapshot: ScheduleSnapshot;

  @ApiProperty({ type: PlanningTaskSchedule, isArray: true })
  schedules: PlanningTaskSchedule[];

  @ApiProperty({ type: TaskDependency, isArray: true })
  dependencies: TaskDependency[];

  @ApiProperty({ type: ResourceAllocation, isArray: true })
  resourceAllocations: ResourceAllocation[];

  @ApiProperty({ type: String, isArray: true })
  criticalPathTaskIds: string[];
}
