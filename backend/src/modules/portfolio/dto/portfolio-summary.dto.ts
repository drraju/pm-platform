import { ApiProperty } from '@nestjs/swagger';
import { ProjectHealthStatus } from '../../health/dto/project-health.dto';

export class PortfolioProjectAttentionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Customer Experience Platform Upgrade' })
  name: string;

  @ApiProperty({ enum: ProjectHealthStatus })
  healthStatus: ProjectHealthStatus;

  @ApiProperty({ type: String, isArray: true })
  reasons: string[];
}

export class OpenRisksBySeverityDto {
  @ApiProperty({ example: 1 })
  critical: number;

  @ApiProperty({ example: 3 })
  high: number;

  @ApiProperty({ example: 5 })
  medium: number;

  @ApiProperty({ example: 2 })
  low: number;
}

export class OpenIssuesByPriorityDto {
  @ApiProperty({ example: 1 })
  critical: number;

  @ApiProperty({ example: 3 })
  high: number;

  @ApiProperty({ example: 5 })
  medium: number;

  @ApiProperty({ example: 2 })
  low: number;
}

export class OverdueTaskProjectDto {
  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 'Customer Experience Platform Upgrade' })
  projectName: string;

  @ApiProperty({ example: 4 })
  overdueTaskCount: number;
}

export class OverdueTasksDto {
  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ type: OverdueTaskProjectDto, isArray: true })
  projects: OverdueTaskProjectDto[];
}

export class UpcomingMilestoneDto {
  @ApiProperty({ format: 'uuid' })
  taskId: string;

  @ApiProperty({ example: 'Complete executive readiness review' })
  title: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 'Customer Experience Platform Upgrade' })
  projectName: string;

  @ApiProperty({ format: 'date', example: '2026-06-30' })
  dueDate: string;
}

export class PortfolioSummaryDto {
  @ApiProperty({ example: 12 })
  totalProjects: number;

  @ApiProperty({ example: 7 })
  greenProjects: number;

  @ApiProperty({ example: 3 })
  amberProjects: number;

  @ApiProperty({ example: 2 })
  redProjects: number;

  @ApiProperty({ type: PortfolioProjectAttentionDto, isArray: true })
  projectsRequiringAttention: PortfolioProjectAttentionDto[];

  @ApiProperty({ type: OpenRisksBySeverityDto })
  openRisksBySeverity: OpenRisksBySeverityDto;

  @ApiProperty({ type: OpenIssuesByPriorityDto })
  openIssuesByPriority: OpenIssuesByPriorityDto;

  @ApiProperty({ type: OverdueTasksDto })
  overdueTasks: OverdueTasksDto;

  @ApiProperty({ type: UpcomingMilestoneDto, isArray: true })
  upcomingMilestones: UpcomingMilestoneDto[];
}
