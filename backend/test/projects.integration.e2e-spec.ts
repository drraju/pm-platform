import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import { ProjectHealthService } from '../src/modules/health/project-health.service';
import { ProjectMember } from '../src/modules/projects/entities/project-member.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { ProjectVisibilityService } from '../src/modules/projects/project-visibility.service';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { Task } from '../src/modules/tasks/entities/task.entity';
import { User } from '../src/modules/users/entities/user.entity';

describe('Projects API integration', () => {
  let controller: ProjectsController;
  const project = {
    id: 'project-1',
    name: 'Customer Experience Platform Upgrade',
    status: 'active',
    tasks: [
      { id: 'task-1', dueDate: '2026-06-01', status: TaskStatus.Todo },
      { id: 'task-2', status: TaskStatus.Done },
    ],
    risks: [
      { id: 'risk-1', impact: 'high', status: 'open', title: 'Vendor delay' },
    ],
    issues: [
      {
        id: 'issue-1',
        severity: 'critical',
        status: 'open',
        title: 'Cutover blocked',
      },
    ],
    assumptions: [],
    dependencies: [],
    members: [],
  };
  const request = {
    user: {
      email: 'user@example.com',
      roleId: 'role-1',
      userId: 'user-1',
    },
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));

    const projectsRepository = {
      find: jest.fn().mockResolvedValue([project]),
      findOne: jest.fn().mockResolvedValue(project),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        ProjectsService,
        ProjectHealthService,
        {
          provide: ProjectVisibilityService,
          useValue: {
            canViewProject: jest.fn().mockResolvedValue(true),
            getVisibleProjects: jest.fn().mockResolvedValue([project]),
          },
        },
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        { provide: getRepositoryToken(ProjectMember), useValue: {} },
        { provide: getRepositoryToken(Task), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
      ],
    }).compile();

    controller = moduleFixture.get(ProjectsController);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns project list items with calculated health', async () => {
    const response = await controller.findAll(request as never);

    expect(response).toEqual([
      expect.objectContaining({
        id: 'project-1',
        health: {
          status: 'RED',
          reasons: ['1 critical issue open', '50% tasks overdue (1/2)'],
        },
      }),
    ]);
  });

  it('returns project workspace details with health and existing RAID records', async () => {
    const response = await controller.findOne(request as never, 'project-1');

    expect(response).toEqual(
      expect.objectContaining({
        id: 'project-1',
        health: expect.objectContaining({ status: 'RED' }),
        risks: [expect.objectContaining({ id: 'risk-1' })],
        issues: [expect.objectContaining({ id: 'issue-1' })],
      }),
    );
  });

  it('returns project-scoped RAID collection endpoints', async () => {
    await expect(
      controller.findProjectRisks(request as never, 'project-1'),
    ).resolves.toEqual([expect.objectContaining({ id: 'risk-1' })]);
    await expect(
      controller.findProjectIssues(request as never, 'project-1'),
    ).resolves.toEqual([expect.objectContaining({ id: 'issue-1' })]);
  });
});
