import { ApiProperty } from '@nestjs/swagger';
import { ProjectBaseline } from '../../projects/entities/project-baseline.entity';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from '../entities/planning-schedule-snapshot.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';

export class PlanningWorkspaceDto {
  @ApiProperty({ type: Task, isArray: true })
  tasks: Task[];

  @ApiProperty({ type: TaskDependency, isArray: true })
  dependencies: TaskDependency[];

  @ApiProperty({ type: PlanningScheduleSnapshot, required: false })
  latestSchedule?: PlanningScheduleSnapshot | null;

  @ApiProperty({ type: ProjectBaseline, isArray: true })
  baselines: ProjectBaseline[];

  @ApiProperty({ type: ResourceAllocation, isArray: true })
  resourceAllocations: ResourceAllocation[];
}
