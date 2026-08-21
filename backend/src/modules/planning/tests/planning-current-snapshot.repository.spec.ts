import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { PlanningScheduleSnapshot } from '../entities/planning-schedule-snapshot.entity';
import {
  findCurrentCalculatedSnapshot,
  findCurrentCalculatedSnapshots,
} from '../planning-current-snapshot.repository';

describe('current calculated forecast selection', () => {
  const projectId = '00000000-0000-4000-8000-000000000001';
  const calculated = {
    calculationStatus: PlanningCalculationStatus.Calculated,
    id: 'calculated-v2',
    projectId,
    scheduleVersion: 2,
  } as PlanningScheduleSnapshot;

  it('does not allow higher pending or failed versions to become current', async () => {
    const candidates = [
      {
        calculationStatus: PlanningCalculationStatus.Pending,
        id: 'pending-v4',
        projectId,
        scheduleVersion: 4,
      },
      {
        calculationStatus: PlanningCalculationStatus.Failed,
        id: 'failed-v3',
        projectId,
        scheduleVersion: 3,
      },
      calculated,
    ] as PlanningScheduleSnapshot[];
    const repository = {
      findOne: jest.fn((options) =>
        Promise.resolve(
          candidates.find(
            (snapshot) =>
              snapshot.projectId === options.where.projectId &&
              snapshot.calculationStatus === options.where.calculationStatus,
          ) ?? null,
        ),
      ),
    };

    await expect(
      findCurrentCalculatedSnapshot(repository as never, projectId),
    ).resolves.toBe(calculated);
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { scheduleVersion: 'DESC' },
        where: expect.objectContaining({
          calculationStatus: PlanningCalculationStatus.Calculated,
          projectId,
        }),
      }),
    );
  });

  it('returns only the highest calculated version per project', async () => {
    const otherProjectId = '00000000-0000-4000-8000-000000000099';
    const queryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ id: calculated.id }, { id: 'other-v3' }]),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      find: jest.fn().mockResolvedValue([
        calculated,
        {
          ...calculated,
          id: 'other-v3',
          projectId: otherProjectId,
          scheduleVersion: 3,
        },
      ]),
    };

    await expect(
      findCurrentCalculatedSnapshots(repository as never),
    ).resolves.toEqual([
      calculated,
      expect.objectContaining({ id: 'other-v3' }),
    ]);
    expect(queryBuilder.distinctOn).toHaveBeenCalledWith([
      'snapshot.projectId',
    ]);
    expect(queryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: expect.anything() }),
      }),
    );
  });
});
