import { Injectable } from '@nestjs/common';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import { ProjectHealthDto, ProjectHealthStatus } from './dto/project-health.dto';

type ProjectHealthInput = {
  issues?: Issue[];
  risks?: Risk[];
  tasks?: Task[];
};

@Injectable()
export class ProjectHealthService {
  calculate({ issues = [], risks = [], tasks = [] }: ProjectHealthInput): ProjectHealthDto {
    const totalTasks = tasks.length;
    const overdueTasks = tasks.filter((task) => this.isOverdue(task)).length;
    const overdueRatio = totalTasks > 0 ? overdueTasks / totalTasks : 0;
    const criticalIssues = issues.filter(
      (issue) => this.isOpen(issue.status) && this.isCritical(issue.severity),
    );

    if (criticalIssues.length > 0 || overdueRatio > 0.2) {
      return {
        status: ProjectHealthStatus.Red,
        reasons: [
          ...(criticalIssues.length > 0
            ? [`${criticalIssues.length} critical issue open`]
            : []),
          ...(overdueRatio > 0.2
            ? [
                `${this.formatPercentage(overdueRatio)} tasks overdue (${overdueTasks}/${totalTasks})`,
              ]
            : []),
        ],
      };
    }

    const highRisks = risks.filter(
      (risk) => this.isOpen(risk.status) && this.isHigh(risk.impact),
    );

    if (highRisks.length > 0 || overdueRatio > 0.1) {
      return {
        status: ProjectHealthStatus.Amber,
        reasons: [
          ...(highRisks.length > 0 ? [`${highRisks.length} high risk open`] : []),
          ...(overdueRatio > 0.1
            ? [
                `${this.formatPercentage(overdueRatio)} tasks overdue (${overdueTasks}/${totalTasks})`,
              ]
            : []),
        ],
      };
    }

    return {
      status: ProjectHealthStatus.Green,
      reasons: ['No critical issues, high risks, or overdue task threshold breaches'],
    };
  }

  private isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.Done) {
      return false;
    }

    return task.dueDate < this.formatDate(new Date());
  }

  private isOpen(status?: string | null): boolean {
    if (!status) {
      return true;
    }

    return !['cancelled', 'closed', 'complete', 'completed', 'done', 'resolved'].includes(
      status.toLowerCase(),
    );
  }

  private isCritical(value?: string | null): boolean {
    return value?.toLowerCase() === 'critical';
  }

  private isHigh(value?: string | null): boolean {
    return value?.toLowerCase() === 'high';
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
