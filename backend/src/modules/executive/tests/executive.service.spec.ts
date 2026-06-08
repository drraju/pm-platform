import { Test } from '@nestjs/testing';
import { PortfolioService } from '../../portfolio/portfolio.service';
import { ExecutiveService } from '../executive.service';

describe('ExecutiveService', () => {
  let service: ExecutiveService;
  let portfolioService: Pick<PortfolioService, 'getSummary'>;

  beforeEach(async () => {
    portfolioService = {
      getSummary: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutiveService,
        { provide: PortfolioService, useValue: portfolioService },
      ],
    }).compile();

    service = moduleRef.get(ExecutiveService);
  });

  it('maps portfolio summary into executive summary', async () => {
    jest.spyOn(portfolioService, 'getSummary').mockResolvedValue({
      totalProjects: 4,
      greenProjects: 2,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [
        {
          id: 'project-red',
          name: 'Data Centre Exit Programme',
          healthStatus: 'RED',
          reasons: ['1 critical issue open'],
        },
      ],
      openRisksBySeverity: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      },
      openIssuesByPriority: {
        critical: 2,
        high: 3,
        medium: 4,
        low: 5,
      },
      overdueTasks: {
        total: 6,
        projects: [],
      },
      upcomingMilestones: [
        {
          taskId: 'task-1',
          title: 'Complete readiness review',
          projectId: 'project-red',
          projectName: 'Data Centre Exit Programme',
          dueDate: '2026-06-30',
        },
      ],
    });

    await expect(service.getSummary()).resolves.toEqual({
      portfolioHealth: {
        totalProjects: 4,
        greenProjects: 2,
        amberProjects: 1,
        redProjects: 1,
      },
      delivery: {
        overdueTasks: 6,
        upcomingMilestones: 1,
      },
      governance: {
        openRisks: 10,
        openIssues: 14,
      },
      projectsRequiringAttention: [
        {
          id: 'project-red',
          name: 'Data Centre Exit Programme',
          healthStatus: 'RED',
          reasons: ['1 critical issue open'],
        },
      ],
    });
  });
});
