import { ApiProperty } from '@nestjs/swagger';
import { Project } from '../../projects/entities/project.entity';
import { TaskDependency } from '../../tasks/entities/task-dependency.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ResourceAllocation } from '../entities/resource-allocation.entity';

export class PlanningWorkspaceSnapshotDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  versionNumber: number;

  @ApiProperty({ required: false, nullable: true })
  projectStartDate?: string | null;

  @ApiProperty({ required: false, nullable: true })
  projectFinishDate?: string | null;

  @ApiProperty()
  projectCompletionPercent: number;

  @ApiProperty({ type: String, isArray: true })
  criticalPathTaskIds: string[];

  @ApiProperty({ required: false, nullable: true })
  calculatedAt?: Date | null;
}

export class PlanningWorkspaceScheduleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  snapshotId: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty({ required: false, nullable: true })
  parentTaskId?: string | null;

  @ApiProperty()
  taskTitle: string;

  @ApiProperty({ required: false, nullable: true })
  status?: string | null;

  @ApiProperty()
  taskKind: string;

  @ApiProperty({ required: false, nullable: true })
  ownerId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  plannedStartDate?: string | null;

  @ApiProperty({ required: false, nullable: true })
  plannedFinishDate?: string | null;

  @ApiProperty()
  durationDays: number;

  @ApiProperty()
  percentComplete: number;

  @ApiProperty({ required: false, nullable: true })
  sequenceNumber?: number | null;

  @ApiProperty({ required: false, nullable: true })
  totalFloatDays?: number | null;

  @ApiProperty()
  isCritical: boolean;

  @ApiProperty({ type: Task, required: false, nullable: true })
  task?: Task | null;
}

export class PlanningWorkspaceDto {
  @ApiProperty({ type: Project })
  project: Project;

  @ApiProperty({ type: PlanningWorkspaceSnapshotDto })
  snapshot: PlanningWorkspaceSnapshotDto;

  @ApiProperty({ type: PlanningWorkspaceScheduleDto, isArray: true })
  schedules: PlanningWorkspaceScheduleDto[];

  @ApiProperty({ type: TaskDependency, isArray: true })
  dependencies: TaskDependency[];

  @ApiProperty({ type: ResourceAllocation, isArray: true })
  resourceAllocations: ResourceAllocation[];

  @ApiProperty({ type: String, isArray: true })
  criticalPathTaskIds: string[];
}
