import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DependencyType } from '../../../common/enums/dependency-type.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class TimelineTaskDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  dueDate: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  assignee: string | null;
}

export class TimelineMilestoneDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  targetDate: string | null;
}

export class TimelineDependencyDto {
  @ApiProperty({ format: 'uuid' })
  sourceTaskId: string;

  @ApiProperty({ format: 'uuid' })
  targetTaskId: string;

  @ApiProperty({ enum: DependencyType, example: DependencyType.FinishToStart })
  type: DependencyType;
}

export class ProjectTimelineDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty({ type: TimelineTaskDto, isArray: true })
  tasks: TimelineTaskDto[];

  @ApiProperty({ type: TimelineMilestoneDto, isArray: true })
  milestones: TimelineMilestoneDto[];

  @ApiProperty({ type: TimelineDependencyDto, isArray: true })
  dependencies: TimelineDependencyDto[];
}
