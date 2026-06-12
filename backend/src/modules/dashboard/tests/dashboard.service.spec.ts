import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ProjectHealthStatus } from '../../health/dto/project-health.dto';
import { ProjectHealthService } from '../../health/project-health.service';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { Issue } from '../../raid/entities/issue.entity';
import { Risk } from '../../raid/entities/risk.entity';
import { Task } from '../../tasks/entities/task.entity';
import { DashboardService } from '../dashboard.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const userId = 'f308d314-4cf3-4bc0-9607-e7ad88f264b8';

describe('DashboardService', () => {
  let service: DashboardService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let risksRepository: MockRepository<Risk>;
  let issuesRepository: MockRepository<Issue>;

  beforeEach(async () => {
    projectsRepository = { find: jest.fn() };
    projectMembersRepository = { find: jest.fn() };
    tasksRepository = { find: jest.fn() };
    risksRepository = { find: jest.fn() };
    issuesRepository = { find: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        { provide: getRepositoryToken(Risk), useValue: risksRepository },
        { provide: getRepositoryToken(Issue), useValue: issuesRepository },
        ProjectHealthService,
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the authenticated user dashboard', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));
    const ownedProject = {
      id: 'owned-project',
      name: 'Owned Project',
      ownerId: userId,
      status: 'active',
    };
    const memberProject = {
      id: 'member-project',
      name: 'Member Project',
      ownerId: 'other-user',
      status: 'at_risk',
    };
    const duplicateOwnedMembership = {
      project: ownedProject,
      role: ProjectRole.Contributor,
    };
    const assignedTasks = [
      { id: 'todo-task', dueDate: '2026-06-01', status: TaskStatus.Todo },
      { id: 'in-progress-task', status: TaskStatus.InProgress },
      { id: 'blocked-task', status: TaskStatus.Blocked },
      { id: 'done-task', status: TaskStatus.Done },
    ];
    const overdueTasks = [
      {
        id: 'overdue-task',
        title: 'Overdue task',
        dueDate: '2026-06-01',
        project: { name: 'Owned Project' },
      },
    ];
    const upcomingTasks = [
      {
        id: 'upcoming-task',
        title: 'Upcoming task',
        dueDate: '2026-06-10',
        project: { name: 'Member Project' },
      },
    ];
    const openRisks = [
      {
        id: 'risk',
        title: 'Open risk',
        impact: 'high',
        project: { name: 'Owned Project' },
      },
    ];
    const openIssues = [
      {
        id: 'issue',
        title: 'Open issue',
        severity: 'critical',
        project: { name: 'Member Project' },
      },
    ];

    projectsRepository.find?.mockResolvedValue([ownedProject]);
    projectMembersRepository.find?.mockResolvedValue([
      { project: memberProject, role: ProjectRole.Manager },
      duplicateOwnedMembership,
    ]);
    tasksRepository.find
      ?.mockResolvedValueOnce(assignedTasks)
      .mockResolvedValueOnce(overdueTasks)
      .mockResolvedValueOnce(upcomingTasks);
    risksRepository.find?.mockResolvedValue(openRisks);
    issuesRepository.find?.mockResolvedValue(openIssues);

    await expect(service.getMyDashboard(userId)).resolves.toEqual({
      assignedProjects: [
        {
          id: 'owned-project',
          health: {
            reasons: [
              'No critical issues, high risks, or overdue task threshold breaches',
            ],
            status: ProjectHealthStatus.Green,
          },
          name: 'Owned Project',
          role: 'owner',
          status: 'active',
        },
        {
          id: 'member-project',
          health: {
            reasons: [
              'No critical issues, high risks, or overdue task threshold breaches',
            ],
            status: ProjectHealthStatus.Green,
          },
          name: 'Member Project',
          role: ProjectRole.Manager,
          status: 'at_risk',
        },
      ],
      taskSummary: {
        total: 4,
        todo: 1,
        inProgress: 1,
        blocked: 1,
        completed: 1,
        overdue: 1,
      },
      overdueTasks: [
        {
          id: 'overdue-task',
          title: 'Overdue task',
          dueDate: '2026-06-01',
          projectName: 'Owned Project',
        },
      ],
      upcomingTasks: [
        {
          id: 'upcoming-task',
          title: 'Upcoming task',
          dueDate: '2026-06-10',
          projectName: 'Member Project',
        },
      ],
      openRisks: [
        {
          id: 'risk',
          title: 'Open risk',
          severity: 'high',
          projectName: 'Owned Project',
        },
      ],
      openIssues: [
        {
          id: 'issue',
          title: 'Open issue',
          priority: 'critical',
          projectName: 'Member Project',
        },
      ],
      health: {
        reasons: ['1 critical issue open', '25% tasks overdue (1/4)'],
        status: ProjectHealthStatus.Red,
      },
    });

    expect(projectsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { issues: true, owner: true, risks: true, tasks: true },
      where: { ownerId: userId },
    });
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      relations: {
        project: { issues: true, owner: true, risks: true, tasks: true },
      },
      where: { userId },
    });
    expect(tasksRepository.find).toHaveBeenNthCalledWith(1, {
      order: { dueDate: 'ASC', createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: { assigneeId: userId },
    });
    expect(tasksRepository.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        order: { dueDate: 'ASC', createdAt: 'DESC' },
        relations: { assignee: true, project: true },
        where: expect.objectContaining({ assigneeId: userId }),
      }),
    );
    expect(tasksRepository.find).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        order: { dueDate: 'ASC', createdAt: 'DESC' },
        relations: { assignee: true, project: true },
        where: expect.objectContaining({ assigneeId: userId }),
      }),
    );
    expect(risksRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { owner: true, project: true },
      where: expect.objectContaining({ ownerId: userId }),
    });
    expect(issuesRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { owner: true, project: true },
      where: expect.objectContaining({ ownerId: userId }),
    });
  });
});
