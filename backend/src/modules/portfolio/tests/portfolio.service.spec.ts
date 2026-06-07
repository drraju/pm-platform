import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ProjectHealthService } from '../../health/project-health.service';
import { Project } from '../../projects/entities/project.entity';
import { Risk } from '../../raid/entities/risk.entity';
import { PortfolioService } from '../portfolio.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('PortfolioService', () => {
  let service: PortfolioService;
  let projectsRepository: MockRepository<Project>;
  let risksRepository: MockRepository<Risk>;

  beforeEach(async () => {
    projectsRepository = {
      find: jest.fn(),
    };
    risksRepository = {
      find: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        { provide: getRepositoryToken(Risk), useValue: risksRepository },
        ProjectHealthService,
      ],
    }).compile();

    service = moduleRef.get(PortfolioService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('summarizes projects by calculated health status', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-07T12:00:00Z'));
    projectsRepository.find?.mockResolvedValue([
      {
        id: 'green-project',
        name: 'Green Project',
        issues: [],
        risks: [],
        tasks: [
          {
            dueDate: '2026-06-10',
            status: TaskStatus.Todo,
          },
        ],
      },
      {
        id: 'amber-project',
        name: 'Amber Project',
        issues: [],
        risks: [{ impact: 'high', status: 'open' }],
        tasks: [],
      },
      {
        id: 'red-project',
        name: 'Red Project',
        issues: [{ severity: 'critical', status: 'open' }],
        risks: [],
        tasks: [],
      },
    ]);
    risksRepository.find?.mockResolvedValue([
      { impact: 'critical', status: 'open' },
      { impact: 'high', status: 'open' },
      { impact: 'medium', status: 'open' },
      { impact: 'low', status: 'open' },
      { impact: 'high', status: 'resolved' },
      { impact: undefined, status: 'open' },
    ]);

    await expect(service.getSummary()).resolves.toEqual({
      totalProjects: 3,
      greenProjects: 1,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [
        {
          id: 'amber-project',
          name: 'Amber Project',
          healthStatus: 'AMBER',
          reasons: ['1 high risk open'],
        },
        {
          id: 'red-project',
          name: 'Red Project',
          healthStatus: 'RED',
          reasons: ['1 critical issue open'],
        },
      ],
      openRisksBySeverity: {
        critical: 1,
        high: 1,
        medium: 2,
        low: 1,
      },
    });
    expect(projectsRepository.find).toHaveBeenCalledWith({
      relations: { issues: true, risks: true, tasks: true },
    });
    expect(risksRepository.find).toHaveBeenCalled();
  });

  it('returns zero counts when the portfolio has no projects', async () => {
    projectsRepository.find?.mockResolvedValue([]);
    risksRepository.find?.mockResolvedValue([]);

    await expect(service.getSummary()).resolves.toEqual({
      totalProjects: 0,
      greenProjects: 0,
      amberProjects: 0,
      redProjects: 0,
      projectsRequiringAttention: [],
      openRisksBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    });
  });
});
