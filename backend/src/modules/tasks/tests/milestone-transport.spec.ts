import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import {
  MilestoneApiSort,
  MilestoneApiState,
  MilestoneQueryDto,
} from '../dto/milestone-query.dto';
import { MilestoneResponseMapper } from '../milestone-response.mapper';

describe('milestone transport contracts', () => {
  it('validates and transforms supported filters', async () => {
    const query = plainToInstance(MilestoneQueryDto, {
      category: MilestoneCategory.Release,
      critical: 'true',
      order: 'desc',
      page: '2',
      pageSize: '50',
      sort: MilestoneApiSort.VarianceDays,
      state: 'upcoming,overdue',
    });

    await expect(validate(query)).resolves.toEqual([]);
    expect(query).toEqual(
      expect.objectContaining({
        critical: true,
        page: 2,
        pageSize: 50,
        state: [MilestoneApiState.Upcoming, MilestoneApiState.Overdue],
      }),
    );
  });

  it.each([
    [{ category: 'launch' }],
    [{ ownerId: 'not-a-uuid' }],
    [{ projectId: 'not-a-uuid' }],
    [{ dateFrom: '2026-08-02', dateTo: '2026-08-01' }],
    [{ page: 0 }],
    [{ pageSize: 101 }],
    [{ critical: 'yes' }],
    [{ search: 'x'.repeat(201) }],
    [{ sort: 'createdAt' }],
  ])('rejects invalid query %j', async (value) => {
    const errors = await validate(plainToInstance(MilestoneQueryDto, value));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('maps projection pages without exposing internal task status', () => {
    const mapper = new MilestoneResponseMapper();
    const response = mapper.toListResponse({
      items: [
        {
          actualDate: null,
          baselineDate: null,
          calculatedAt: new Date('2026-07-16T10:00:00Z'),
          calculationStatus: PlanningCalculationStatus.Calculated,
          category: MilestoneCategory.Standard,
          critical: false,
          daysRemaining: 2,
          forecastDate: '2026-07-18',
          id: 'milestone-id',
          overdue: false,
          owner: null,
          plannedDate: '2026-07-18',
          projectId: 'project-id',
          state: 'upcoming',
          taskId: 'milestone-id',
          taskStatus: 'todo' as never,
          title: 'Launch',
          varianceDays: null,
        },
      ],
      page: 2,
      pageSize: 1,
      total: 3,
    });

    expect(response.totalPages).toBe(3);
    expect(response.items[0].calculatedAt).toBe('2026-07-16T10:00:00.000Z');
    expect(response.items[0]).not.toHaveProperty('taskStatus');
  });
});
