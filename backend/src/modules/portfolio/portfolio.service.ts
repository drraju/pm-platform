import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectHealthStatus } from '../health/dto/project-health.dto';
import { ProjectHealthService } from '../health/project-health.service';
import { Project } from '../projects/entities/project.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../../common/enums/task-status.enum';
import {
  OpenIssuesByPriorityDto,
  OpenRisksBySeverityDto,
  OverdueTasksDto,
  PortfolioProjectAttentionDto,
  PortfolioSummaryDto,
  UpcomingMilestoneDto,
} from './dto/portfolio-summary.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    @InjectRepository(Issue)
    private readonly issuesRepository: Repository<Issue>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly projectHealthService: ProjectHealthService,
    private readonly projectVisibilityService: ProjectVisibilityService,
  ) {}

  async getSummary(
    actor?: ProjectVisibilityActor,
  ): Promise<PortfolioSummaryDto> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);

    const [projects, risks, issues, tasks] =
      visibleProjectIds === 'all'
        ? await Promise.all([
            this.projectsRepository.find({
              relations: { issues: true, risks: true, tasks: true },
            }),
            this.risksRepository.find(),
            this.issuesRepository.find(),
            this.tasksRepository.find({ relations: { project: true } }),
          ])
        : visibleProjectIds.length > 0
          ? await Promise.all([
              this.projectsRepository.find({
                relations: { issues: true, risks: true, tasks: true },
                where: { id: In(visibleProjectIds) },
              }),
              this.risksRepository.find({
                where: { projectId: In(visibleProjectIds) },
              }),
              this.issuesRepository.find({
                where: { projectId: In(visibleProjectIds) },
              }),
              this.tasksRepository.find({
                relations: { project: true },
                where: { projectId: In(visibleProjectIds) },
              }),
            ])
          : [[], [], [], []];

    const summary = projects.reduce<PortfolioSummaryDto>(
      (summary, project) => {
        const health = this.projectHealthService.calculate({
          issues: project.issues,
          risks: project.risks,
          tasks: project.tasks,
        });

        if (health.status === ProjectHealthStatus.Red) {
          summary.redProjects += 1;
          summary.projectsRequiringAttention.push(
            this.toProjectAttention(project, health.status, health.reasons),
          );
        } else if (health.status === ProjectHealthStatus.Amber) {
          summary.amberProjects += 1;
          summary.projectsRequiringAttention.push(
            this.toProjectAttention(project, health.status, health.reasons),
          );
        } else {
          summary.greenProjects += 1;
        }

        return summary;
      },
      {
        totalProjects: projects.length,
        greenProjects: 0,
        amberProjects: 0,
        redProjects: 0,
        projectsRequiringAttention: [],
        openRisksBySeverity: this.emptyOpenRisksBySeverity(),
        openIssuesByPriority: this.emptyOpenIssuesByPriority(),
        overdueTasks: this.emptyOverdueTasks(),
        upcomingMilestones: [],
      },
    );

    summary.openRisksBySeverity = this.countOpenRisksBySeverity(risks);
    summary.openIssuesByPriority = this.countOpenIssuesByPriority(issues);
    summary.overdueTasks = this.countOverdueTasks(tasks);
    summary.upcomingMilestones = this.findUpcomingMilestones(tasks);

    return summary;
  }

  private toProjectAttention(
    project: Project,
    healthStatus: ProjectHealthStatus,
    reasons: string[],
  ): PortfolioProjectAttentionDto {
    return {
      id: project.id,
      name: project.name,
      healthStatus,
      reasons,
    };
  }

  private countOpenRisksBySeverity(risks: Risk[]): OpenRisksBySeverityDto {
    return risks.reduce<OpenRisksBySeverityDto>((counts, risk) => {
      if (!this.isOpen(risk.status)) {
        return counts;
      }

      const severity = risk.impact?.toLowerCase();
      if (severity === 'critical') {
        counts.critical += 1;
      } else if (severity === 'high') {
        counts.high += 1;
      } else if (severity === 'low') {
        counts.low += 1;
      } else {
        counts.medium += 1;
      }

      return counts;
    }, this.emptyOpenRisksBySeverity());
  }

  private emptyOpenRisksBySeverity(): OpenRisksBySeverityDto {
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
  }

  private countOpenIssuesByPriority(issues: Issue[]): OpenIssuesByPriorityDto {
    return issues.reduce<OpenIssuesByPriorityDto>((counts, issue) => {
      if (!this.isOpen(issue.status)) {
        return counts;
      }

      const priority = issue.severity?.toLowerCase();
      if (priority === 'critical') {
        counts.critical += 1;
      } else if (priority === 'high') {
        counts.high += 1;
      } else if (priority === 'low') {
        counts.low += 1;
      } else {
        counts.medium += 1;
      }

      return counts;
    }, this.emptyOpenIssuesByPriority());
  }

  private emptyOpenIssuesByPriority(): OpenIssuesByPriorityDto {
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
  }

  private countOverdueTasks(tasks: Task[]): OverdueTasksDto {
    const today = new Date().toISOString().slice(0, 10);
    const projectCounts = new Map<
      string,
      { projectId: string; projectName: string; overdueTaskCount: number }
    >();

    for (const task of tasks) {
      if (!this.isOverdueTask(task, today)) {
        continue;
      }

      const projectId = task.projectId;
      const existing = projectCounts.get(projectId);
      if (existing) {
        existing.overdueTaskCount += 1;
      } else {
        projectCounts.set(projectId, {
          projectId,
          projectName: task.project?.name ?? 'Unassigned project',
          overdueTaskCount: 1,
        });
      }
    }

    const projects = [...projectCounts.values()].sort((left, right) =>
      left.projectName.localeCompare(right.projectName),
    );

    return {
      total: projects.reduce(
        (total, project) => total + project.overdueTaskCount,
        0,
      ),
      projects,
    };
  }

  private emptyOverdueTasks(): OverdueTasksDto {
    return {
      total: 0,
      projects: [],
    };
  }

  private isOverdueTask(task: Task, today: string): boolean {
    return Boolean(
      task.dueDate && task.dueDate < today && task.status !== TaskStatus.Done,
    );
  }

  private findUpcomingMilestones(tasks: Task[]): UpcomingMilestoneDto[] {
    const today = new Date().toISOString().slice(0, 10);

    return tasks
      .filter((task) => this.isUpcomingMilestoneCandidate(task, today))
      .sort((left, right) => {
        const dueDateComparison = String(left.dueDate).localeCompare(
          String(right.dueDate),
        );

        if (dueDateComparison !== 0) {
          return dueDateComparison;
        }

        return left.title.localeCompare(right.title);
      })
      .slice(0, 10)
      .map((task) => ({
        taskId: task.id,
        title: task.title,
        projectId: task.projectId,
        projectName: task.project?.name ?? 'Unassigned project',
        dueDate: task.dueDate as string,
      }));
  }

  private isUpcomingMilestoneCandidate(task: Task, today: string): boolean {
    return Boolean(
      task.dueDate && task.dueDate >= today && task.status !== TaskStatus.Done,
    );
  }

  private isOpen(status?: string | null): boolean {
    if (!status) {
      return true;
    }

    return ![
      'cancelled',
      'closed',
      'complete',
      'completed',
      'done',
      'resolved',
    ].includes(status.toLowerCase());
  }
}
