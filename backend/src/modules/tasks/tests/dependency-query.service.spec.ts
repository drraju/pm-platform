import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ProjectVisibilityService } from '../../projects/project-visibility.service';
import { DependencyHealth } from '../dependency-domain';
import { DependencyHealthEvaluator } from '../dependency-health.evaluator';
import { DependencyImpactAnalyzer } from '../dependency-impact.analyzer';
import { DependencyOrderingPolicy } from '../dependency-ordering.policy';
import { DependencyProjectionComposer } from '../dependency-projection.composer';
import { DependencyQueryService } from '../dependency-query.service';
import { TaskDependency } from '../entities/task-dependency.entity';

describe('DependencyQueryService', () => {
  const dependenciesRepository = { find: jest.fn() };
  const projectVisibilityService = {
    getVisibleProjectIds: jest.fn(),
  };
  const authorizationPolicyService = {
    isExternalActor: jest.fn().mockResolvedValue(false),
  };
  const composer = new DependencyProjectionComposer(
    new DependencyHealthEvaluator(),
    new DependencyImpactAnalyzer(),
    new DependencyOrderingPolicy(),
  );
  const service = new DependencyQueryService(
    dependenciesRepository as never,
    projectVisibilityService as unknown as ProjectVisibilityService,
    composer,
    authorizationPolicyService as unknown as AuthorizationPolicyService,
  );
  const task = (
    id: string,
    projectId: string,
    title: string,
    sequenceNumber: number,
    status = TaskStatus.Todo,
  ) => ({
    id,
    projectId,
    sequenceNumber,
    status,
    taskKind: TaskKind.Standard,
    title,
  });
  const dependency = (
    id: string,
    predecessor: ReturnType<typeof task>,
    successor: ReturnType<typeof task>,
    dependencyType = TaskDependencyType.FinishToStart,
  ) =>
    ({
      id,
      dependencyType,
      lagDays: 0,
      predecessorTask: predecessor,
      predecessorTaskId: predecessor.id,
      successorTask: successor,
      successorTaskId: successor.id,
    }) as TaskDependency;

  beforeEach(() => {
    jest.clearAllMocks();
    projectVisibilityService.getVisibleProjectIds.mockResolvedValue('all');
    authorizationPolicyService.isExternalActor.mockResolvedValue(false);
  });

  it('does not expose dependency topology to external actors', async () => {
    authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

    await expect(
      service.findProjectDependencies('p1', {}, {
        userId: 'customer-1',
      } as never),
    ).resolves.toMatchObject({ items: [], total: 0 });
    expect(dependenciesRepository.find).not.toHaveBeenCalled();
  });

  it('uses one set-based dependency query with both endpoint relations', async () => {
    dependenciesRepository.find.mockResolvedValue([
      dependency(
        'd1',
        task('a', 'p1', 'Alpha', 1, TaskStatus.Done),
        task('b', 'p1', 'Beta', 2),
      ),
    ]);

    const result = await service.findProjectDependencies('p1');

    expect(result.total).toBe(1);
    expect(projectVisibilityService.getVisibleProjectIds).toHaveBeenCalledTimes(
      1,
    );
    expect(dependenciesRepository.find).toHaveBeenCalledTimes(1);
    expect(dependenciesRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { predecessorTask: true, successorTask: true },
      }),
    );
  });

  it('does not query dependencies or reveal counts for a hidden project', async () => {
    projectVisibilityService.getVisibleProjectIds.mockResolvedValue(['p2']);

    await expect(
      service.findProjectDependencies('p1', {}, { userId: 'user-1' }),
    ).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    });
    expect(dependenciesRepository.find).not.toHaveBeenCalled();
  });

  it('intersects portfolio scope with visible projects', async () => {
    projectVisibilityService.getVisibleProjectIds.mockResolvedValue(['p2']);
    dependenciesRepository.find.mockResolvedValue([]);

    await service.findDependencies({ projectIds: ['p1', 'p2'] });

    const calls: unknown = dependenciesRepository.find.mock.calls;
    const serializedCalls = JSON.stringify(calls);
    expect(serializedCalls).toContain('predecessorTask');
    expect(serializedCalls).toContain('successorTask');
    expect(serializedCalls).toContain('p2');
    expect(serializedCalls).not.toContain('p1');
  });

  it('filters, sorts, and paginates composed projections deterministically', async () => {
    dependenciesRepository.find.mockResolvedValue([
      dependency(
        'd3',
        task('c', 'p1', 'Charlie', 3),
        task('d', 'p1', 'Delta', 4),
      ),
      dependency(
        'd1',
        task('a', 'p1', 'Alpha', 1, TaskStatus.Done),
        task('b', 'p1', 'Beta', 2),
      ),
      dependency(
        'd2',
        task('b', 'p1', 'Beta', 2),
        task('c', 'p1', 'Charlie', 3),
      ),
    ]);

    const result = await service.findProjectDependencies('p1', {
      blocked: true,
      health: [DependencyHealth.Blocking],
      page: 1,
      pageSize: 1,
      search: 'charlie',
      sortBy: 'successor',
      sortDirection: 'desc',
    });

    expect(result).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(result.items.map(({ dependencyId }) => dependencyId)).toEqual([
      'd3',
    ]);
  });

  it('returns null for a visible dependency that does not exist', async () => {
    dependenciesRepository.find.mockResolvedValue([]);

    await expect(service.findDependency('p1', 'missing')).resolves.toBeNull();
    expect(dependenciesRepository.find).toHaveBeenCalledTimes(1);
  });

  it('retains the complete graph when selecting one dependency', async () => {
    dependenciesRepository.find.mockResolvedValue([
      dependency(
        'selected',
        task('a', 'p1', 'Alpha', 1),
        task('b', 'p1', 'Beta', 2),
      ),
      dependency(
        'downstream',
        task('b', 'p1', 'Beta', 2),
        task('c', 'p1', 'Charlie', 3),
      ),
    ]);

    const result = await service.findDependency('p1', 'selected');

    expect(result?.impact.impactedTaskCount).toBe(2);
    expect(result?.impact.traversal.impactedTaskIds).toEqual(['b', 'c']);
    expect(dependenciesRepository.find).toHaveBeenCalledTimes(1);
    expect(
      JSON.stringify(dependenciesRepository.find.mock.calls),
    ).not.toContain('selected');
  });

  it('does not classify unknown dependency state as not blocked', async () => {
    dependenciesRepository.find.mockResolvedValue([
      dependency(
        'legacy',
        task('a', 'p1', 'Alpha', 1),
        task('b', 'p1', 'Beta', 2),
        TaskDependencyType.StartToFinish,
      ),
    ]);

    const result = await service.findProjectDependencies('p1', {
      blocked: false,
    });

    expect(result.items).toEqual([]);
  });

  it('drops corrupt records with unloaded endpoints without extra queries', async () => {
    dependenciesRepository.find.mockResolvedValue([
      { id: 'broken', predecessorTask: null, successorTask: null },
    ]);

    await expect(service.findProjectDependencies('p1')).resolves.toMatchObject({
      items: [],
      total: 0,
    });
    expect(dependenciesRepository.find).toHaveBeenCalledTimes(1);
  });
});
