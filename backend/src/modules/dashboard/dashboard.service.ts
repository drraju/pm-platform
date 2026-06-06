import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Not, Repository } from 'typeorm';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import { MeDashboardDto } from './dto/me-dashboard.dto';
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
  ) {}

  async getMyDashboard(userId: string): Promise<MeDashboardDto> {
    const [ownedProjects, memberProjects, assignedTasks] = await Promise.all([
      this.projectsRepository.find({
        order: { createdAt: 'DESC' },
        relations: { owner: true },
        where: { ownerId: userId },
      }),
      this.projectMembersRepository.find({
        relations: { project: { owner: true } },
        where: { userId },
      }),
      this.tasksRepository.find({
        order: { dueDate: 'ASC', createdAt: 'DESC' },
        relations: { assignee: true, project: true },
        where: { assigneeId: userId },
      }),
    ]);

    const assignedProjects = this.dedupeProjects([
      ...ownedProjects,
      ...memberProjects
        .map((membership) => membership.project)
        .filter((project): project is Project => Boolean(project)),
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
      assignedProjects,
      taskSummary: this.summarizeTasks(assignedTasks),
      overdueTasks,
      upcomingTasks,
      openRisks,
      openIssues,
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
    };
  }

  private dedupeProjects(projects: Project[]): Project[] {
    return Array.from(
      projects
        .reduce((projectMap, project) => projectMap.set(project.id, project), new Map<string, Project>())
        .values(),
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
