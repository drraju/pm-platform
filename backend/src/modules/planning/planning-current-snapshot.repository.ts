import { FindOptionsRelations, In, IsNull, Repository } from 'typeorm';
import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';

export async function findCurrentCalculatedSnapshot(
  repository: Repository<PlanningScheduleSnapshot>,
  projectId: string,
  relations?: FindOptionsRelations<PlanningScheduleSnapshot>,
): Promise<PlanningScheduleSnapshot | null> {
  return repository.findOne({
    order: { scheduleVersion: 'DESC' },
    relations,
    where: {
      calculationStatus: PlanningCalculationStatus.Calculated,
      deletedAt: IsNull(),
      projectId,
    },
  });
}

export async function findCurrentCalculatedSnapshots(
  repository: Repository<PlanningScheduleSnapshot>,
  projectIds?: string[],
  relations?: FindOptionsRelations<PlanningScheduleSnapshot>,
): Promise<PlanningScheduleSnapshot[]> {
  if (projectIds?.length === 0) return [];

  const selector = repository
    .createQueryBuilder('snapshot')
    .select('snapshot.id', 'id')
    .distinctOn(['snapshot.projectId'])
    .where('snapshot.calculationStatus = :calculationStatus', {
      calculationStatus: PlanningCalculationStatus.Calculated,
    })
    .andWhere('snapshot.deletedAt IS NULL')
    .orderBy('snapshot.projectId', 'ASC')
    .addOrderBy('snapshot.scheduleVersion', 'DESC');
  if (projectIds) {
    selector.andWhere('snapshot.projectId IN (:...projectIds)', { projectIds });
  }
  const currentIds = await selector.getRawMany<{ id: string }>();
  if (currentIds.length === 0) return [];

  return repository.find({
    order: { projectId: 'ASC', scheduleVersion: 'DESC' },
    relations,
    where: {
      calculationStatus: PlanningCalculationStatus.Calculated,
      deletedAt: IsNull(),
      id: In(currentIds.map(({ id }) => id)),
    },
  });
}
