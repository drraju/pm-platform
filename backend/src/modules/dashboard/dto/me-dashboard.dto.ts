import { ApiProperty } from '@nestjs/swagger';
import { Project } from '../../projects/entities/project.entity';
import { Issue } from '../../raid/entities/issue.entity';
import { Risk } from '../../raid/entities/risk.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskSummaryDto } from './task-summary.dto';

export class MeDashboardDto {
  @ApiProperty({ type: Project, isArray: true })
  assignedProjects: Project[];

  @ApiProperty({ type: TaskSummaryDto })
  taskSummary: TaskSummaryDto;

  @ApiProperty({ type: Task, isArray: true })
  overdueTasks: Task[];

  @ApiProperty({ type: Task, isArray: true })
  upcomingTasks: Task[];

  @ApiProperty({ type: Risk, isArray: true })
  openRisks: Risk[];

  @ApiProperty({ type: Issue, isArray: true })
  openIssues: Issue[];
}
