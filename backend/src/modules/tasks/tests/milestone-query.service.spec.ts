import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { PlanningSnapshotService } from '../../planning/planning-snapshot.service';
import { ProjectBaseline } from '../../projects/entities/project-baseline.entity';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { Task } from '../entities/task.entity';
import { MilestoneProjectionComposer } from '../milestone-projection.composer';
import { MilestoneQueryService } from '../milestone-query.service';

describe('MilestoneQueryService', () => {
  const taskFind = jest.fn();
  const calculateOperationalForecast = jest.fn();
  const baselineFind = jest.fn();
  let service: MilestoneQueryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-01T12:00:00Z'));
    const moduleRef = await Test.createTestingModule({
      providers: [
        MilestoneQueryService,
        MilestoneProjectionComposer,
        { provide: getRepositoryToken(Task), useValue: { find: taskFind } },
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
        {
          provide: PlanningSnapshotService,
          useValue: { calculateOperationalForecast },
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
    calculateOperationalForecast.mockResolvedValue({
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: [],
      id: 'operational-snapshot',
      projectId: 'project-id',
      scheduleVersion: 0,
      taskSchedules: [
        {
          isCritical: false,
          scheduledEndDate: '2026-08-02',
          taskId: 'release-id',
        },
        {
          isCritical: false,
          scheduledEndDate: '2026-08-01',
          taskId: 'decision-id',
        },
      ],
    });
    baselineFind.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
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
    expect(calculateOperationalForecast).toHaveBeenCalledTimes(1);
    expect(baselineFind).toHaveBeenCalledTimes(1);
    expect(taskFind).toHaveBeenCalledWith(
      expect.objectContaining({
        withDeleted: true,
        where: expect.objectContaining({ taskKind: TaskKind.Milestone }),
      }),
    );
  });

  it('uses the current operational scheduled date as the milestone forecast', async () => {
    calculateOperationalForecast.mockResolvedValue({
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: ['release-id'],
      id: 'snapshot-v2',
      projectId: 'project-id',
      scheduleVersion: 2,
      taskSchedules: [
        {
          isCritical: true,
          plannedEndDate: '2026-08-02',
          scheduledEndDate: '2026-09-10',
          taskId: 'release-id',
        },
      ],
    });

    const result = await service.findProjectMilestones('project-id');

    expect(result.items.find((item) => item.taskId === 'release-id')).toEqual(
      expect.objectContaining({
        calculationStatus: PlanningCalculationStatus.Calculated,
        critical: true,
        forecastDate: '2026-09-10',
      }),
    );
    expect(calculateOperationalForecast).toHaveBeenCalledWith('project-id');
  });

  it('does not use a planned date as forecast when the operational row is missing', async () => {
    calculateOperationalForecast.mockResolvedValue({
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: [],
      id: 'operational-snapshot',
      projectId: 'project-id',
      scheduleVersion: 0,
      taskSchedules: [],
    });

    const result = await service.findProjectMilestones('project-id');

    expect(result.items.find((item) => item.taskId === 'release-id')).toEqual(
      expect.objectContaining({ forecastDate: null, state: 'unscheduled' }),
    );
  });
});
