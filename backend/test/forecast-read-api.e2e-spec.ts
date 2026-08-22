import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';
import { ForecastQueryService } from '../src/modules/projects/forecast-query.service';
import { Project } from '../src/modules/projects/entities/project.entity';

const schemaPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'schema',
  '001_initial_schema.sql',
);
const migrationDirectory = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
);
const migrationPaths = [
  '013_v0_2_0_phase_1_enterprise_planning_engine.sql',
  '014_v0_2_0_phase_2_milestone_categories.sql',
  '035_p0_b1_authoritative_forecast_snapshot.sql',
  '036_b2_1_c_forecast_history_persistence_hardening.sql',
].map((filename) => join(migrationDirectory, filename));

describe('Forecast Overview and official History read APIs', () => {
  const databaseName = `pm_platform_forecast_read_test_${randomBytes(6).toString('hex')}`;
  const roleId = randomUUID();
  const userId = randomUUID();
  const actor = {
    email: 'forecast.manager@example.com',
    roleId,
    userId,
  };
  let adminDataSource: DataSource;
  let testDataSource: DataSource;
  let service: ForecastQueryService;
  const canViewProject = jest.fn<Promise<boolean>, [string, unknown?]>();
  const isExternalActor = jest.fn<Promise<boolean>, [unknown?]>();

  beforeAll(async () => {
    adminDataSource = new DataSource({
      ...createDataSourceOptions(),
      database: process.env.POSTGRES_ADMIN_DB ?? 'postgres',
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE DATABASE "${databaseName}"`);

    testDataSource = new DataSource({
      ...createDataSourceOptions(),
      database: databaseName,
    });
    await testDataSource.initialize();
    await testDataSource.query(readFileSync(schemaPath, 'utf8'));
    for (const migrationPath of migrationPaths) {
      await testDataSource.query(readFileSync(migrationPath, 'utf8'));
    }
    await testDataSource.query(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [
      roleId,
      'Forecast test manager',
    ]);
    await testDataSource.query(
      `INSERT INTO users (
         id, email, first_name, last_name, password_hash, role_id
       ) VALUES ($1, $2, 'Ada', 'Lovelace', 'unused', $3)`,
      [userId, actor.email, roleId],
    );

    service = new ForecastQueryService(
      testDataSource.getRepository(Project),
      { canViewProject } as never,
      { isExternalActor } as never,
    );
  });

  beforeEach(() => {
    canViewProject.mockReset().mockResolvedValue(true);
    isExternalActor.mockReset().mockResolvedValue(false);
  });

  afterAll(async () => {
    if (testDataSource?.isInitialized) {
      await testDataSource.destroy();
    }
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [databaseName],
      );
      await adminDataSource.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminDataSource.destroy();
    }
  });

  it('returns an explicit unavailable overview when no baseline or forecast exists', async () => {
    const projectId = await insertProject('Empty forecast project');

    await expect(service.getOverview(projectId, actor)).resolves.toEqual({
      activeBaseline: null,
      availability: {
        activeBaseline: false,
        currentForecast: false,
        originalBaseline: false,
        previousForecast: false,
      },
      currentForecast: null,
      finishVarianceFromCurrentActiveBaselineDays: null,
      finishVarianceFromPreviousDays: null,
      originalBaseline: null,
      previousForecast: null,
      projectId,
      warnings: [],
      workingOutputState: 'not_requested',
    });
    await expect(service.getHistory(projectId, {}, actor)).resolves.toEqual({
      hasMore: false,
      items: [],
      nextCursor: null,
    });
  });

  it('derives active and original baseline dates and counts only from immutable rows', async () => {
    const projectId = await insertProject('Baseline-only project');
    await insertBaseline(projectId, {
      name: 'Draft zero',
      status: 'draft',
      version: 0,
    });
    await insertBaseline(projectId, {
      deleted: true,
      name: 'Deleted approved',
      status: 'approved',
      version: 1,
    });
    const originalId = await insertBaseline(projectId, {
      name: 'Original approved',
      status: 'superseded',
      version: 2,
    });
    const activeId = await insertBaseline(projectId, {
      current: true,
      name: 'Current commitment',
      status: 'approved',
      version: 4,
    });
    await insertBaselineTask(projectId, activeId, {
      kind: 'summary',
      plannedEnd: '2026-12-31',
      plannedStart: '2026-01-01',
      title: 'Excluded summary boundary',
    });
    await insertBaselineTask(projectId, activeId, {
      kind: 'standard',
      plannedEnd: '2026-09-30',
      plannedStart: '2026-09-01',
      title: 'Dated delivery',
    });
    await insertBaselineTask(projectId, activeId, {
      kind: 'milestone',
      title: 'Unscheduled gate',
    });

    const result = await service.getOverview(projectId, actor);

    expect(result.activeBaseline).toEqual(
      expect.objectContaining({
        capturedBy: { id: userId, name: 'Ada Lovelace' },
        id: activeId,
        milestoneCount: 1,
        projectFinishDate: '2026-09-30',
        projectStartDate: '2026-09-01',
        taskCount: 3,
        unscheduledExecutableTaskCount: 1,
      }),
    );
    expect(result.originalBaseline).toEqual(
      expect.objectContaining({ id: originalId, versionNumber: 2 }),
    );
    expect(result.currentForecast).toBeNull();
    await expect(service.getHistory(projectId, {}, actor)).resolves.toEqual({
      hasMore: false,
      items: [],
      nextCursor: null,
    });
  });

  it.each(['draft', 'superseded'] as const)(
    'fails Overview and History when the persisted current baseline is %s',
    async (status) => {
      const projectId = await insertProject(
        `Invalid ${status} current baseline project`,
      );
      await insertBaseline(projectId, {
        current: true,
        name: `Invalid current ${status}`,
        status,
        version: 1,
      });

      await expect(service.getOverview(projectId, actor)).rejects.toEqual(
        expect.objectContaining({
          message: `Active baseline lifecycle invariant violated for project ${projectId}`,
        }),
      );
      await expect(
        service.getHistory(projectId, {}, actor),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('excludes draft-only and deleted baselines from Original Approved Baseline', async () => {
    const projectId = await insertProject('No approved baseline project');
    await insertBaseline(projectId, {
      name: 'Draft only',
      status: 'draft',
      version: 1,
    });
    await insertBaseline(projectId, {
      deleted: true,
      name: 'Deleted approved',
      status: 'approved',
      version: 2,
    });

    const result = await service.getOverview(projectId, actor);

    expect(result.activeBaseline).toBeNull();
    expect(result.originalBaseline).toBeNull();
  });

  it('returns a Current Forecast without inventing a previous forecast, dates, tasks, or user', async () => {
    const projectId = await insertProject('Current-only project');
    const snapshotId = await insertSnapshot(projectId, {
      createdBy: null,
      status: 'calculated',
      version: 3,
    });

    const result = await service.getOverview(projectId, actor);

    expect(result.currentForecast).toEqual(
      expect.objectContaining({
        generatedBy: null,
        isCurrent: true,
        projectFinishDate: null,
        projectStartDate: null,
        scheduleVersion: 3,
        snapshotId,
        taskCount: 0,
      }),
    );
    expect(result.previousForecast).toBeNull();
    expect(result.finishVarianceFromPreviousDays).toBeNull();
    expect(result.finishVarianceFromCurrentActiveBaselineDays).toBeNull();
  });

  it('selects only calculated non-deleted forecasts and resolves Previous across version gaps', async () => {
    const projectId = await insertProject('Version gap project');
    const previousId = await insertSnapshot(projectId, {
      finish: '2026-09-25',
      status: 'calculated',
      version: 1,
    });
    await insertSnapshot(projectId, {
      finish: '2026-10-01',
      status: 'pending',
      version: 2,
    });
    await insertSnapshot(projectId, {
      finish: '2026-10-02',
      status: 'failed',
      version: 3,
    });
    await insertSnapshot(projectId, {
      deleted: true,
      finish: '2026-10-05',
      status: 'calculated',
      version: 4,
    });
    const currentId = await insertSnapshot(projectId, {
      finish: '2026-10-18',
      status: 'calculated',
      version: 5,
    });

    const result = await service.getOverview(projectId, actor);

    expect(result.currentForecast?.snapshotId).toBe(currentId);
    expect(result.previousForecast?.snapshotId).toBe(previousId);
    expect(result.finishVarianceFromPreviousDays).toBe(23);
  });

  it('calculates signed finish variance against the Current Active Baseline', async () => {
    const projectId = await insertProject('Baseline variance project');
    const baselineId = await insertBaseline(projectId, {
      current: true,
      name: 'September commitment',
      status: 'approved',
      version: 1,
    });
    await insertBaselineTask(projectId, baselineId, {
      kind: 'standard',
      plannedEnd: '2026-09-30',
      plannedStart: '2026-09-01',
      title: 'Committed delivery',
    });
    await insertSnapshot(projectId, {
      finish: '2026-09-20',
      status: 'calculated',
      version: 1,
    });
    await insertSnapshot(projectId, {
      finish: '2026-10-18',
      status: 'calculated',
      version: 3,
    });

    const result = await service.getOverview(projectId, actor);

    expect(result.finishVarianceFromCurrentActiveBaselineDays).toBe(18);
    expect(result.finishVarianceFromPreviousDays).toBe(28);
  });

  it('returns official history only, ordered descending, with current, counts, and signed variances', async () => {
    const projectId = await insertProject('Official history project');
    const baselineId = await insertBaseline(projectId, {
      current: true,
      name: 'Active baseline',
      status: 'approved',
      version: 1,
    });
    await insertBaselineTask(projectId, baselineId, {
      kind: 'standard',
      plannedEnd: '2026-09-30',
      plannedStart: '2026-09-01',
      title: 'Baseline delivery',
    });
    const versionOneId = await insertSnapshot(projectId, {
      finish: '2026-09-25',
      start: '2026-09-01',
      status: 'calculated',
      version: 1,
    });
    await insertSnapshot(projectId, {
      finish: '2026-10-01',
      status: 'pending',
      version: 2,
    });
    await insertSnapshot(projectId, {
      deleted: true,
      finish: '2026-10-10',
      status: 'calculated',
      version: 3,
    });
    await insertSnapshot(projectId, {
      finish: '2026-10-11',
      status: 'failed',
      version: 4,
    });
    const currentId = await insertSnapshot(projectId, {
      finish: '2026-10-18',
      start: '2026-09-01',
      status: 'calculated',
      version: 5,
    });
    await insertSchedule(projectId, currentId, {
      critical: true,
      kind: 'standard',
      scheduledEnd: '2026-10-18',
      scheduledStart: '2026-09-01',
      title: 'Deleted live standard task',
    });
    await insertSchedule(projectId, currentId, {
      critical: true,
      kind: 'milestone',
      title: 'Historical milestone with null task id',
    });
    await insertSchedule(projectId, currentId, {
      critical: true,
      kind: 'summary',
      title: 'Summary excluded from executable counts',
    });

    const result = await service.getHistory(projectId, {}, actor);

    expect(result).toEqual(
      expect.objectContaining({ hasMore: false, nextCursor: null }),
    );
    expect(result.items.map(({ scheduleVersion }) => scheduleVersion)).toEqual([
      5, 1,
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        criticalTaskCount: 2,
        finishVarianceFromCurrentActiveBaselineDays: 18,
        finishVarianceFromPreviousDays: 23,
        generatedBy: { id: userId, name: 'Ada Lovelace' },
        isCurrent: true,
        milestoneCount: 1,
        snapshotId: currentId,
        taskCount: 3,
        unscheduledExecutableTaskCount: 1,
      }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        finishVarianceFromCurrentActiveBaselineDays: -5,
        finishVarianceFromPreviousDays: null,
        isCurrent: false,
        snapshotId: versionOneId,
      }),
    );
  });

  it('uses scheduleVersion keyset pagination and preserves cross-page previous variance', async () => {
    const projectId = await insertProject('Paged history project');
    for (const [version, finish] of [
      [1, '2026-09-01'],
      [3, '2026-09-05'],
      [7, '2026-09-12'],
    ] as const) {
      await insertSnapshot(projectId, {
        finish,
        status: 'calculated',
        version,
      });
    }

    const firstPage = await service.getHistory(projectId, { limit: 1 }, actor);
    const secondPage = await service.getHistory(
      projectId,
      { beforeVersion: firstPage.nextCursor!, limit: 1 },
      actor,
    );
    const thirdPage = await service.getHistory(
      projectId,
      { beforeVersion: secondPage.nextCursor!, limit: 1 },
      actor,
    );

    expect(firstPage).toEqual(
      expect.objectContaining({ hasMore: true, nextCursor: 7 }),
    );
    expect(firstPage.items[0].finishVarianceFromPreviousDays).toBe(7);
    expect(secondPage).toEqual(
      expect.objectContaining({ hasMore: true, nextCursor: 3 }),
    );
    expect(secondPage.items[0].finishVarianceFromPreviousDays).toBe(4);
    expect(thirdPage).toEqual(
      expect.objectContaining({ hasMore: false, nextCursor: null }),
    );
    expect(thirdPage.items[0].finishVarianceFromPreviousDays).toBeNull();
  });

  it('does not depend on live Task rows when historical task_id is null', async () => {
    const projectId = await insertProject('Hard-deleted task history project');
    const snapshotId = await insertSnapshot(projectId, {
      finish: '2026-10-01',
      status: 'calculated',
      version: 1,
    });
    await insertSchedule(projectId, snapshotId, {
      kind: 'standard',
      scheduledEnd: '2026-10-01',
      scheduledStart: '2026-09-01',
      title: 'Preserved historical identity',
    });

    const result = await service.getHistory(projectId, {}, actor);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].taskCount).toBe(1);
  });

  it('returns empty official history for no tasks and no calculated snapshots', async () => {
    const projectId = await insertProject('No official history project');
    await insertSnapshot(projectId, { status: 'pending', version: 1 });
    await insertSnapshot(projectId, { status: 'failed', version: 2 });

    await expect(service.getHistory(projectId, {}, actor)).resolves.toEqual({
      hasMore: false,
      items: [],
      nextCursor: null,
    });
  });

  it('denies an invisible project before reading executive Forecast data', async () => {
    const projectId = await insertProject('Invisible forecast project');
    canViewProject.mockResolvedValue(false);

    await expect(service.getOverview(projectId, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.getHistory(projectId, {}, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses a non-disclosing response for external actors', async () => {
    const projectId = await insertProject('External-hidden forecast project');
    isExternalActor.mockResolvedValue(true);

    await expect(service.getOverview(projectId, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.getHistory(projectId, {}, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns not found for a project that does not exist', async () => {
    await expect(
      service.getOverview(randomUUID(), actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(canViewProject).not.toHaveBeenCalled();
  });

  async function insertProject(name: string): Promise<string> {
    const id = randomUUID();
    await testDataSource.query(
      `INSERT INTO projects (id, name, owner_id, created_by_id)
       VALUES ($1, $2, $3, $3)`,
      [id, name, userId],
    );
    return id;
  }

  async function insertBaseline(
    projectId: string,
    input: {
      current?: boolean;
      deleted?: boolean;
      name: string;
      status: 'approved' | 'draft' | 'superseded';
      version: number;
    },
  ): Promise<string> {
    const id = randomUUID();
    await testDataSource.query(
      `INSERT INTO project_baselines (
         id, project_id, name, version_number, status, captured_at,
         captured_by_id, is_current, created_by_id, deleted_at
       ) VALUES ($1, $2, $3, $4, $5, '2026-08-01T10:00:00Z', $6, $7, $6, $8)`,
      [
        id,
        projectId,
        input.name,
        input.version,
        input.status,
        userId,
        input.current ?? false,
        input.deleted ? new Date('2026-08-02T00:00:00Z') : null,
      ],
    );
    return id;
  }

  async function insertBaselineTask(
    projectId: string,
    baselineId: string,
    input: {
      kind: 'milestone' | 'standard' | 'summary';
      plannedEnd?: string;
      plannedStart?: string;
      title: string;
    },
  ): Promise<void> {
    await testDataSource.query(
      `INSERT INTO project_baseline_tasks (
         id, project_baseline_id, project_id, task_id, task_title, task_kind,
         milestone_category, planned_start_date, planned_end_date, created_by_id
       ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        baselineId,
        projectId,
        input.title,
        input.kind,
        input.kind === 'milestone' ? 'standard' : null,
        input.plannedStart ?? null,
        input.plannedEnd ?? null,
        userId,
      ],
    );
  }

  async function insertSnapshot(
    projectId: string,
    input: {
      createdBy?: string | null;
      deleted?: boolean;
      finish?: string;
      start?: string;
      status: 'calculated' | 'failed' | 'pending';
      version: number;
    },
  ): Promise<string> {
    const id = randomUUID();
    await testDataSource.query(
      `INSERT INTO planning_schedule_snapshots (
         id, project_id, schedule_version, calculation_status, calculated_at,
         schedule_anchor_date, project_start_date, project_finish_date,
         created_by_id, deleted_at
       ) VALUES (
         $1, $2, $3, $4, $5, '2026-08-01', $6, $7, $8, $9
       )`,
      [
        id,
        projectId,
        input.version,
        input.status,
        input.status === 'calculated'
          ? new Date(
              `2026-08-${String(Math.min(input.version, 28)).padStart(2, '0')}T10:00:00Z`,
            )
          : null,
        input.start ?? null,
        input.finish ?? null,
        input.createdBy === undefined ? userId : input.createdBy,
        input.deleted ? new Date('2026-08-29T00:00:00Z') : null,
      ],
    );
    return id;
  }

  async function insertSchedule(
    projectId: string,
    snapshotId: string,
    input: {
      critical?: boolean;
      kind: 'milestone' | 'standard' | 'summary';
      scheduledEnd?: string;
      scheduledStart?: string;
      title: string;
    },
  ): Promise<void> {
    await testDataSource.query(
      `INSERT INTO planning_task_schedules (
         id, snapshot_id, project_id, task_id, task_title, task_kind,
         milestone_category, scheduled_start_date, scheduled_end_date,
         is_critical, created_by_id
       ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        snapshotId,
        projectId,
        input.title,
        input.kind,
        input.kind === 'milestone' ? 'standard' : null,
        input.scheduledStart ?? null,
        input.scheduledEnd ?? null,
        input.critical ?? false,
        userId,
      ],
    );
  }
});
