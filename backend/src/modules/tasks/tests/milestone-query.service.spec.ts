import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { PlanningScheduleSnapshot } from '../../planning/entities/planning-schedule-snapshot.entity';
import { ProjectBaseline } from '../../projects/entities/project-baseline.entity';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { Task } from '../entities/task.entity';
import { MilestoneProjectionComposer } from '../milestone-projection.composer';
import { MilestoneQueryService } from '../milestone-query.service';

describe('MilestoneQueryService', () => {
  const taskFind = jest.fn();
  const snapshotFind = jest.fn();
  const baselineFind = jest.fn();
  let service: MilestoneQueryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestoneQueryService,
        MilestoneProjectionComposer,
        { provide: getRepositoryToken(Task), useValue: { find: taskFind } },
        {
          provide: getRepositoryToken(PlanningScheduleSnapshot),
          useValue: { find: snapshotFind },
        },
        {
          provide: getRepositoryToken(ProjectBaseline),
          useValue: { find: baselineFind },
        },
        {
          provide: ProjectVisibilityService,
          useValue: {
            getVisibleProjectIds: jest.fn().mockResolvedValue('all'),
          },
        },
        {
          provide: AuthorizationPolicyService,
          useValue: { isExternalActor: jest.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();
    service = moduleRef.get(MilestoneQueryService);
    taskFind.mockResolvedValue([
      {
        dueDate: '2026-08-02',
        id: 'release-id',
        milestoneCategory: MilestoneCategory.Release,
        projectId: 'project-id',
        status: TaskStatus.Todo,
        taskKind: TaskKind.Milestone,
        title: 'Release candidate',
      },
      {
        dueDate: '2026-08-01',
        id: 'decision-id',
        milestoneCategory: MilestoneCategory.Decision,
        projectId: 'project-id',
        status: TaskStatus.Done,
        taskKind: TaskKind.Milestone,
        title: 'Architecture decision',
      },
    ]);
    snapshotFind.mockResolvedValue([]);
    baselineFind.mockResolvedValue([]);
  });

  it('filters, sorts and paginates milestone projections', async () => {
    const result = await service.findProjectMilestones('project-id', {
      category: MilestoneCategory.Release,
      page: 1,
      pageSize: 1,
      search: 'candidate',
      sortBy: 'title',
      states: ['upcoming'],
    });

    expect(result).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 1,
      }),
    );
    expect(result.items[0].taskId).toBe('release-id');
  });

  it('uses a constant three repository reads and never writes', async () => {
    await service.findPortfolioMilestones({ includeCancelled: true });

    expect(taskFind).toHaveBeenCalledTimes(1);
    expect(snapshotFind).toHaveBeenCalledTimes(1);
    expect(baselineFind).toHaveBeenCalledTimes(1);
    expect(taskFind).toHaveBeenCalledWith(
      expect.objectContaining({
        withDeleted: true,
        where: expect.objectContaining({ taskKind: TaskKind.Milestone }),
      }),
    );
  });
});
