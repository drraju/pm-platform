import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../../../common/enums/task-status.enum';
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
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the authenticated user dashboard', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));
    const ownedProject = { id: 'owned-project', ownerId: userId };
    const memberProject = { id: 'member-project', ownerId: 'other-user' };
    const duplicateOwnedMembership = { project: ownedProject };
    const assignedTasks = [
      { id: 'todo-task', status: TaskStatus.Todo },
      { id: 'in-progress-task', status: TaskStatus.InProgress },
      { id: 'blocked-task', status: TaskStatus.Blocked },
      { id: 'done-task', status: TaskStatus.Done },
    ];
    const overdueTasks = [{ id: 'overdue-task' }];
    const upcomingTasks = [{ id: 'upcoming-task' }];
    const openRisks = [{ id: 'risk' }];
    const openIssues = [{ id: 'issue' }];

    projectsRepository.find?.mockResolvedValue([ownedProject]);
    projectMembersRepository.find?.mockResolvedValue([
      { project: memberProject },
      duplicateOwnedMembership,
    ]);
    tasksRepository.find
      ?.mockResolvedValueOnce(assignedTasks)
      .mockResolvedValueOnce(overdueTasks)
      .mockResolvedValueOnce(upcomingTasks);
    risksRepository.find?.mockResolvedValue(openRisks);
    issuesRepository.find?.mockResolvedValue(openIssues);

    await expect(service.getMyDashboard(userId)).resolves.toEqual({
      assignedProjects: [ownedProject, memberProject],
      taskSummary: {
        total: 4,
        todo: 1,
        inProgress: 1,
        blocked: 1,
        completed: 1,
      },
      overdueTasks,
      upcomingTasks,
      openRisks,
      openIssues,
    });

    expect(projectsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
      relations: { owner: true },
      where: { ownerId: userId },
    });
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      relations: { project: { owner: true } },
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
