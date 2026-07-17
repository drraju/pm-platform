import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { DependencyHealth } from '../dependency-domain';
import {
  DependencyApiSort,
  DependencyQueryDto,
} from '../dto/dependency-query.dto';

describe('DependencyQueryDto', () => {
  it('transforms valid collection filters', async () => {
    const query = plainToInstance(DependencyQueryDto, {
      blocked: 'true',
      dependencyType: 'FS,SS',
      health: 'blocking,at_risk',
      impactDepth: '5',
      impactTaskLimit: '50',
      page: '2',
      pageSize: '10',
      sort: 'impact',
      taskId: '11111111-1111-4111-8111-111111111111',
    });

    await expect(validate(query)).resolves.toEqual([]);
    expect(query).toMatchObject({
      blocked: true,
      dependencyType: [
        TaskDependencyType.FinishToStart,
        TaskDependencyType.StartToStart,
      ],
      health: [DependencyHealth.Blocking, DependencyHealth.AtRisk],
      impactDepth: 5,
      impactTaskLimit: 50,
      page: 2,
      pageSize: 10,
      sort: DependencyApiSort.Impact,
      taskId: ['11111111-1111-4111-8111-111111111111'],
    });
  });

  it.each([
    { page: '0' },
    { pageSize: '101' },
    { impactDepth: '0' },
    { impactTaskLimit: '1001' },
    { blocked: 'sometimes' },
    { dependencyType: 'SF,invalid' },
    { health: 'healthy' },
    { sort: 'createdAt' },
    { taskId: 'not-a-uuid' },
  ])('rejects invalid transport query %o', async (value) => {
    const errors = await validate(plainToInstance(DependencyQueryDto, value));
    expect(errors.length).toBeGreaterThan(0);
  });
});
