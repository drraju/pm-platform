import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Issue } from '../../raid/entities/issue.entity';
import { Risk } from '../../raid/entities/risk.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ExternalCursorCodec } from '../contracts/external-cursor';
import { ExternalPaginationPolicy } from '../contracts/external-page.dto';
import { ExternalReadQueryService } from '../external-read-query.service';
import {
  ExternalDataScope,
  ResolvedExternalDataScope,
} from '../scope/external-data-scope';

const snapshotAt = '2026-08-10T12:00:00.000Z';
const allProjectsScope: ResolvedExternalDataScope = {
  kind: ExternalDataScope.AllProjects,
};

describe('ExternalReadQueryService', () => {
  let codec: ExternalCursorCodec;
  let projects: ReturnType<typeof repositoryStub>;
  let tasks: ReturnType<typeof repositoryStub>;
  let risks: ReturnType<typeof repositoryStub>;
  let issues: ReturnType<typeof repositoryStub>;
  let service: ExternalReadQueryService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(snapshotAt));
    codec = new ExternalCursorCodec('external-read-test-secret');
    projects = repositoryStub([]);
    tasks = repositoryStub([]);
    risks = repositoryStub([]);
    issues = repositoryStub([]);
    service = createService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies the inclusive snapshot and updatedSince bounds across ALL_PROJECTS', async () => {
    const updatedSince = '2026-08-01T00:00:00.000Z';

    await service.findProjects(allProjectsScope, { limit: 200, updatedSince });

    expect(projects.query.where).toHaveBeenCalledWith(
      'project.updated_at <= :snapshotAt',
      { snapshotAt },
    );
    expect(projects.query.andWhere).toHaveBeenCalledWith(
      'project.updated_at >= :updatedSince',
      { updatedSince },
    );
    expect(projects.query.orderBy).toHaveBeenCalledWith(
      'project.updated_at',
      'ASC',
    );
    expect(projects.query.addOrderBy).toHaveBeenCalledWith('project.id', 'ASC');
    expect(projects.query.take).toHaveBeenCalledWith(201);
  });

  it('returns a signed next cursor from the last emitted row', async () => {
    projects = repositoryStub([
      project('11111111-1111-4111-8111-111111111111', '10:00:00'),
      project('22222222-2222-4222-8222-222222222222', '10:00:00'),
      project('33333333-3333-4333-8333-333333333333', '11:00:00'),
    ]);
    service = createService();

    const response = await service.findProjects(allProjectsScope, { limit: 2 });

    expect(response.data).toHaveLength(2);
    expect(response.snapshotAt).toBe(snapshotAt);
    expect(response.nextCursor).not.toBeNull();
    expect(codec.decode(response.nextCursor!)).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      updatedAt: '2026-08-02T10:00:00.000Z',
    });
    expect(Object.keys(response).sort()).toEqual(
      ['data', 'nextCursor', 'snapshotAt'].sort(),
    );
  });

  it('includes rows at snapshotAt and excludes rows after snapshotAt', async () => {
    const atSnapshotId = '77777777-7777-4777-8777-777777777777';
    const afterSnapshotId = '88888888-8888-4888-8888-888888888888';
    projects = repositoryStub(
      [
        projectUpdatedAt(atSnapshotId, snapshotAt),
        projectUpdatedAt(afterSnapshotId, '2026-08-10T12:00:00.001Z'),
      ],
      true,
    );
    service = createService();

    const response = await service.findProjects(allProjectsScope, {
      snapshotAt,
    });

    expect(response.data.map(({ id }) => id)).toEqual([atSnapshotId]);
    expect(response.data.map(({ id }) => id)).not.toContain(afterSnapshotId);
  });

  it('returns exactly limit rows without a cursor when no more rows exist', async () => {
    projects = repositoryStub([
      project('11111111-1111-4111-8111-111111111111', '10:00:00'),
      project('22222222-2222-4222-8222-222222222222', '11:00:00'),
    ]);
    service = createService();

    const response = await service.findProjects(allProjectsScope, { limit: 2 });

    expect(response.data).toHaveLength(2);
    expect(response.nextCursor).toBeNull();
  });

  it('does not expose rows beyond the original snapshot on a cursor page', async () => {
    const atSnapshotId = '33333333-3333-4333-8333-333333333333';
    const afterSnapshotId = '44444444-4444-4444-8444-444444444444';
    projects = repositoryStub(
      [
        projectUpdatedAt(
          '11111111-1111-4111-8111-111111111111',
          '2026-08-10T10:00:00.000Z',
        ),
        projectUpdatedAt(
          '22222222-2222-4222-8222-222222222222',
          '2026-08-10T11:00:00.000Z',
        ),
        projectUpdatedAt(atSnapshotId, snapshotAt),
        projectUpdatedAt(afterSnapshotId, '2026-08-10T12:00:00.001Z'),
      ],
      true,
    );
    service = createService();

    const firstPage = await service.findProjects(allProjectsScope, {
      limit: 2,
      snapshotAt,
    });
    const secondPage = await service.findProjects(allProjectsScope, {
      cursor: firstPage.nextCursor!,
      limit: 2,
      snapshotAt: firstPage.snapshotAt,
    });

    expect(firstPage.nextCursor).not.toBeNull();
    expect(secondPage.data.map(({ id }) => id)).toEqual([atSnapshotId]);
    expect(secondPage.data.map(({ id }) => id)).not.toContain(afterSnapshotId);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('applies the strict (updatedAt, id) keyset after a cursor', async () => {
    const cursor = codec.encode({
      id: '22222222-2222-4222-8222-222222222222',
      updatedAt: '2026-08-02T10:00:00.000Z',
    });

    await service.findTasks(allProjectsScope, {
      cursor,
      limit: 200,
      snapshotAt,
    });

    const andWhereCalls = tasks.query.andWhere.mock.calls as Array<[unknown]>;
    const bracket = andWhereCalls.find(
      ([condition]) => typeof condition !== 'string',
    )?.[0] as { whereFactory: (query: unknown) => void };
    const cursorQuery = {
      orWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    bracket.whereFactory(cursorQuery);
    expect(cursorQuery.where).toHaveBeenCalledWith(
      'task.updated_at > :cursorUpdatedAt',
      { cursorUpdatedAt: '2026-08-02T10:00:00.000Z' },
    );
    expect(cursorQuery.orWhere).toHaveBeenCalledWith(
      '(task.updated_at = :cursorUpdatedAt AND task.id > :cursorId)',
      {
        cursorId: '22222222-2222-4222-8222-222222222222',
        cursorUpdatedAt: '2026-08-02T10:00:00.000Z',
      },
    );
  });

  it('projects only the approved columns and maps every resource to its external DTO', async () => {
    projects = repositoryStub([
      {
        ...project('11111111-1111-4111-8111-111111111111', '10:00:00'),
        description: 'hidden',
      },
    ]);
    tasks = repositoryStub([task()]);
    risks = repositoryStub([risk()]);
    issues = repositoryStub([issue()]);
    service = createService();

    const [projectPage, taskPage, riskPage, issuePage] = await Promise.all([
      service.findProjects(allProjectsScope, {}),
      service.findTasks(allProjectsScope, {}),
      service.findRisks(allProjectsScope, {}),
      service.findIssues(allProjectsScope, {}),
    ]);

    expect(projects.query.select).toHaveBeenCalledWith([
      'project.id',
      'project.name',
      'project.status',
      'project.startDate',
      'project.targetEndDate',
      'project.createdAt',
      'project.updatedAt',
    ]);
    expect(tasks.query.select).toHaveBeenCalledWith([
      'task.id',
      'task.projectId',
      'task.parentTaskId',
      'task.title',
      'task.taskKind',
      'task.milestoneCategory',
      'task.status',
      'task.priority',
      'task.percentComplete',
      'task.sequenceNumber',
      'task.startDate',
      'task.dueDate',
      'task.plannedStartDate',
      'task.plannedEndDate',
      'task.actualStartDate',
      'task.actualEndDate',
      'task.estimatedHours',
      'task.remainingHours',
      'task.createdAt',
      'task.updatedAt',
    ]);
    expect(risks.query.select).toHaveBeenCalledWith([
      'risk.id',
      'risk.projectId',
      'risk.title',
      'risk.status',
      'risk.probability',
      'risk.impact',
      'risk.createdAt',
      'risk.updatedAt',
    ]);
    expect(issues.query.select).toHaveBeenCalledWith([
      'issue.id',
      'issue.projectId',
      'issue.title',
      'issue.status',
      'issue.severity',
      'issue.createdAt',
      'issue.updatedAt',
    ]);
    expect(projectPage.data[0]).not.toHaveProperty('description');
    expect(taskPage.data[0]).toEqual(
      expect.objectContaining({ estimatedHours: 20, remainingHours: 8 }),
    );
    expect(riskPage.data[0]).toEqual(
      expect.objectContaining({ impact: 'high', probability: 'medium' }),
    );
    expect(issuePage.data[0]).toEqual(
      expect.objectContaining({ severity: 'high' }),
    );
  });

  it('rejects any scope other than ALL_PROJECTS without querying data', async () => {
    await expect(
      service.findIssues(
        { kind: 'PROJECT' } as unknown as ResolvedExternalDataScope,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(issues.repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  function createService(): ExternalReadQueryService {
    return new ExternalReadQueryService(
      projects.repository as unknown as Repository<Project>,
      tasks.repository as unknown as Repository<Task>,
      risks.repository as unknown as Repository<Risk>,
      issues.repository as unknown as Repository<Issue>,
      new ExternalPaginationPolicy(codec),
      codec,
    );
  }
});

function repositoryStub(records: unknown[], applyQuery = false) {
  const state: QueryState = {};
  const query = {} as QueryStub;
  query.addOrderBy = jest.fn().mockReturnValue(query);
  query.andWhere = jest
    .fn()
    .mockImplementation((condition: unknown, parameters?: unknown) => {
      captureParameters(state, parameters);
      if (isWhereFactory(condition)) {
        const cursorQuery = {} as CursorQueryStub;
        cursorQuery.where = jest
          .fn()
          .mockImplementation((_where: string, values?: unknown) => {
            captureParameters(state, values);
            return cursorQuery;
          });
        cursorQuery.orWhere = jest
          .fn()
          .mockImplementation((_where: string, values?: unknown) => {
            captureParameters(state, values);
            return cursorQuery;
          });
        condition.whereFactory(cursorQuery);
      }
      return query;
    });
  query.getMany = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(applyQuery ? applyQueryState(records, state) : records),
    );
  query.orderBy = jest.fn().mockReturnValue(query);
  query.select = jest.fn().mockReturnValue(query);
  query.take = jest.fn().mockImplementation((limit: number) => {
    state.limit = limit;
    return query;
  });
  query.where = jest
    .fn()
    .mockImplementation((_where: string, parameters?: unknown) => {
      captureParameters(state, parameters);
      return query;
    });
  return {
    query,
    repository: {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    },
  };
}

type QueryStub = {
  addOrderBy: jest.Mock;
  andWhere: jest.Mock;
  getMany: jest.Mock;
  orderBy: jest.Mock;
  select: jest.Mock;
  take: jest.Mock;
  where: jest.Mock;
};

type CursorQueryStub = {
  orWhere: jest.Mock;
  where: jest.Mock;
};

type QueryState = {
  cursorId?: string;
  cursorUpdatedAt?: string;
  limit?: number;
  snapshotAt?: string;
  updatedSince?: string;
};

type FilterableRecord = {
  id: string;
  updatedAt: Date;
};

function isWhereFactory(
  condition: unknown,
): condition is { whereFactory: (query: CursorQueryStub) => void } {
  return (
    typeof condition === 'object' &&
    condition !== null &&
    'whereFactory' in condition &&
    typeof condition.whereFactory === 'function'
  );
}

function captureParameters(state: QueryState, parameters?: unknown): void {
  if (typeof parameters !== 'object' || parameters === null) {
    return;
  }
  const values = parameters as QueryState;
  Object.assign(state, values);
}

function applyQueryState(records: unknown[], state: QueryState): unknown[] {
  const filtered = (records as FilterableRecord[])
    .filter((record) =>
      state.snapshotAt
        ? record.updatedAt.getTime() <= Date.parse(state.snapshotAt)
        : true,
    )
    .filter((record) =>
      state.updatedSince
        ? record.updatedAt.getTime() >= Date.parse(state.updatedSince)
        : true,
    )
    .filter((record) => {
      if (!state.cursorUpdatedAt || !state.cursorId) {
        return true;
      }
      const updatedAt = record.updatedAt.getTime();
      const cursorUpdatedAt = Date.parse(state.cursorUpdatedAt);
      return (
        updatedAt > cursorUpdatedAt ||
        (updatedAt === cursorUpdatedAt && record.id > state.cursorId)
      );
    })
    .sort(
      (left, right) =>
        left.updatedAt.getTime() - right.updatedAt.getTime() ||
        left.id.localeCompare(right.id),
    );
  return state.limit ? filtered.slice(0, state.limit) : filtered;
}

function project(id: string, time: string) {
  return {
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    id,
    name: 'External Project',
    startDate: '2026-08-01',
    status: 'active',
    targetEndDate: '2026-12-31',
    updatedAt: new Date(`2026-08-02T${time}.000Z`),
  };
}

function projectUpdatedAt(id: string, updatedAt: string) {
  return {
    ...project(id, '10:00:00'),
    updatedAt: new Date(updatedAt),
  };
}

function task() {
  return {
    actualEndDate: null,
    actualStartDate: null,
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    dueDate: '2026-08-31',
    estimatedHours: '20.00',
    id: '44444444-4444-4444-8444-444444444444',
    milestoneCategory: null,
    parentTaskId: null,
    percentComplete: 50,
    plannedEndDate: '2026-08-31',
    plannedStartDate: '2026-08-01',
    priority: 'high',
    projectId: '11111111-1111-4111-8111-111111111111',
    remainingHours: '8.00',
    sequenceNumber: 1,
    startDate: '2026-08-01',
    status: 'in_progress',
    taskKind: 'standard',
    title: 'External Task',
    updatedAt: new Date('2026-08-02T10:00:00.000Z'),
  };
}

function risk() {
  return {
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    id: '55555555-5555-4555-8555-555555555555',
    impact: 'high',
    probability: 'medium',
    projectId: '11111111-1111-4111-8111-111111111111',
    status: 'open',
    title: 'External Risk',
    updatedAt: new Date('2026-08-02T10:00:00.000Z'),
  };
}

function issue() {
  return {
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    id: '66666666-6666-4666-8666-666666666666',
    projectId: '11111111-1111-4111-8111-111111111111',
    severity: 'high',
    status: 'open',
    title: 'External Issue',
    updatedAt: new Date('2026-08-02T10:00:00.000Z'),
  };
}
