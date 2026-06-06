import { ApiProperty } from '@nestjs/swagger';
import { ProjectHealthDto } from '../../health/dto/project-health.dto';
import { TaskSummaryDto } from './task-summary.dto';

export class DashboardProjectDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ type: ProjectHealthDto })
  health: ProjectHealthDto;
}

export class DashboardTaskDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ format: 'date', nullable: true })
  dueDate: string | null;

  @ApiProperty()
  projectName: string;
}

export class DashboardRiskDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  projectName: string;
}

export class DashboardIssueDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  projectName: string;
}

export class MeDashboardDto {
  @ApiProperty({ type: DashboardProjectDto, isArray: true })
  assignedProjects: DashboardProjectDto[];

  @ApiProperty({ type: TaskSummaryDto })
  taskSummary: TaskSummaryDto;

  @ApiProperty({ type: DashboardTaskDto, isArray: true })
  overdueTasks: DashboardTaskDto[];

  @ApiProperty({ type: DashboardTaskDto, isArray: true })
  upcomingTasks: DashboardTaskDto[];

  @ApiProperty({ type: DashboardRiskDto, isArray: true })
  openRisks: DashboardRiskDto[];

  @ApiProperty({ type: DashboardIssueDto, isArray: true })
  openIssues: DashboardIssueDto[];

  @ApiProperty({ type: ProjectHealthDto })
  health: ProjectHealthDto;
}
