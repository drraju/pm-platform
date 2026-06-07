import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Not, Repository } from 'typeorm';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { ProjectHealthService } from '../health/project-health.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import {
  DashboardIssueDto,
  DashboardProjectDto,
  DashboardRiskDto,
  DashboardTaskDto,
  MeDashboardDto,
} from './dto/me-dashboard.dto';
import { TaskSummaryDto } from './dto/task-summary.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    @InjectRepository(Issue)
    private readonly issuesRepository: Repository<Issue>,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  async getMyDashboard(userId: string): Promise<MeDashboardDto> {
    const [ownedProjects, memberProjects, assignedTasks] = await Promise.all([
      this.projectsRepository.find({
        order: { createdAt: 'DESC' },
        relations: { issues: true, owner: true, risks: true, tasks: true },
        where: { ownerId: userId },
      }),
      this.projectMembersRepository.find({
        relations: { project: { issues: true, owner: true, risks: true, tasks: true } },
        where: { userId },
      }),
      this.tasksRepository.find({
        order: { dueDate: 'ASC', createdAt: 'DESC' },
        relations: { assignee: true, project: true },
        where: { assigneeId: userId },
      }),
    ]);

    const [overdueTasks, upcomingTasks, openRisks, openIssues] =
      await Promise.all([
        this.findOverdueTasks(userId),
        this.findUpcomingTasks(userId),
        this.risksRepository.find({
          order: { createdAt: 'DESC' },
          relations: { owner: true, project: true },
          where: { ownerId: userId, status: Not('closed') },
        }),
        this.issuesRepository.find({
          order: { createdAt: 'DESC' },
          relations: { owner: true, project: true },
          where: { ownerId: userId, status: Not('closed') },
        }),
      ]);

    return {
      assignedProjects: this.mapAssignedProjects(ownedProjects, memberProjects),
      taskSummary: this.summarizeTasks(assignedTasks),
      overdueTasks: overdueTasks.map((task) => this.toDashboardTask(task)),
      upcomingTasks: upcomingTasks.map((task) => this.toDashboardTask(task)),
      openRisks: openRisks.map((risk) => this.toDashboardRisk(risk)),
      openIssues: openIssues.map((issue) => this.toDashboardIssue(issue)),
      health: this.projectHealthService.calculate({
        issues: openIssues,
        risks: openRisks,
        tasks: assignedTasks,
      }),
    };
  }

  private findOverdueTasks(userId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      order: { dueDate: 'ASC', createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        assigneeId: userId,
        dueDate: LessThan(this.formatDate(new Date())),
        status: Not(TaskStatus.Done),
      },
    });
  }

  private findUpcomingTasks(userId: string): Promise<Task[]> {
    const today = new Date();
    const nextSevenDays = new Date(today);
    nextSevenDays.setDate(today.getDate() + 7);

    return this.tasksRepository.find({
      order: { dueDate: 'ASC', createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        assigneeId: userId,
        dueDate: Between(this.formatDate(today), this.formatDate(nextSevenDays)),
        status: Not(TaskStatus.Done),
      },
    });
  }

  private summarizeTasks(tasks: Task[]): TaskSummaryDto {
    return {
      total: tasks.length,
      todo: tasks.filter((task) => task.status === TaskStatus.Todo).length,
      inProgress: tasks.filter(
        (task) => task.status === TaskStatus.InProgress,
      ).length,
      blocked: tasks.filter((task) => task.status === TaskStatus.Blocked)
        .length,
      completed: tasks.filter((task) => task.status === TaskStatus.Done).length,
      overdue: tasks.filter((task) => this.isOverdue(task)).length,
    };
  }

  private mapAssignedProjects(
    ownedProjects: Project[],
    memberProjects: ProjectMember[],
  ): DashboardProjectDto[] {
    const projectMap = new Map<string, DashboardProjectDto>();

    for (const project of ownedProjects) {
      projectMap.set(project.id, {
        id: project.id,
        name: project.name,
        status: project.status,
        role: 'owner',
        health: this.projectHealthService.calculate({
          issues: project.issues,
          risks: project.risks,
          tasks: project.tasks,
        }),
      });
    }

    for (const membership of memberProjects) {
      if (!membership.project || projectMap.has(membership.project.id)) {
        continue;
      }

      projectMap.set(membership.project.id, {
        id: membership.project.id,
        name: membership.project.name,
        status: membership.project.status,
        role: membership.role,
        health: this.projectHealthService.calculate({
          issues: membership.project.issues,
          risks: membership.project.risks,
          tasks: membership.project.tasks,
        }),
      });
    }

    return Array.from(projectMap.values());
  }

  private toDashboardTask(task: Task): DashboardTaskDto {
    return {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate ?? null,
      projectName: task.project?.name ?? '',
    };
  }

  private toDashboardRisk(risk: Risk): DashboardRiskDto {
    return {
      id: risk.id,
      title: risk.title,
      severity: risk.impact,
      projectName: risk.project?.name ?? '',
    };
  }

  private toDashboardIssue(issue: Issue): DashboardIssueDto {
    return {
      id: issue.id,
      title: issue.title,
      priority: issue.severity,
      projectName: issue.project?.name ?? '',
    };
  }

  private isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.Done) {
      return false;
    }

    return task.dueDate < this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
