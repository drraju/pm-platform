import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { SchedulingContextFactory } from '../src/common/scheduling/scheduling-context.factory';
import { TaskKind } from '../src/common/enums/task-kind.enum';
import { createDataSourceOptions } from '../src/database/typeorm.config';
import { PlanningScheduleSnapshot } from '../src/modules/planning/entities/planning-schedule-snapshot.entity';
import { PlanningBackwardPassService } from '../src/modules/planning/planning-backward-pass.service';
import { PlanningCriticalPathService } from '../src/modules/planning/planning-critical-path.service';
import { findCurrentCalculatedSnapshot } from '../src/modules/planning/planning-current-snapshot.repository';
import { PlanningFloatService } from '../src/modules/planning/planning-float.service';
import { PlanningForwardPassService } from '../src/modules/planning/planning-forward-pass.service';
import { PlanningGraphBuilderService } from '../src/modules/planning/planning-graph-builder.service';
import { PlanningScheduleEngineService } from '../src/modules/planning/planning-schedule-engine.service';
import { PlanningSnapshotService } from '../src/modules/planning/planning-snapshot.service';

const bootstrapSchemaPath = join(
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
const prerequisiteMigrationPaths = [
  '013_v0_2_0_phase_1_enterprise_planning_engine.sql',
  '014_v0_2_0_phase_2_milestone_categories.sql',
  '030_stab_auth_001_change_password_foundation.sql',
  '033_stab_iam_002_user_administration.sql',
  '035_p0_b1_authoritative_forecast_snapshot.sql',
].map((filename) => join(migrationDirectory, filename));
const hardeningMigrationPath = join(
  migrationDirectory,
  '036_b2_1_c_forecast_history_persistence_hardening.sql',
);

type StoredSchedule = {
  duration_days: number | null;
  id: string;
  parent_task_id: string | null;
  planned_end_date: string | null;
  planned_start_date: string | null;
  scheduled_end_date: string | null;
  scheduled_start_date: string | null;
  snapshot_id: string;
  task_id: string | null;
  task_title: string;
};

describe('Forecast history persistence hardening', () => {
  const databaseName = `pm_platform_forecast_history_test_${randomBytes(6).toString('hex')}`;
  let adminDataSource: DataSource;
  let testDataSource: DataSource;
  let snapshotService: PlanningSnapshotService;
  let preMigrationConstraint: { conname: string; definition: string };
  let preMigrationSchedule: Omit<StoredSchedule, 'task_title'>;
  let preMigrationSnapshotVersion: number;
  const migratedProjectId = randomUUID();
  const migratedTaskId = randomUUID();
  const migratedSnapshotId = randomUUID();
  const migratedScheduleId = randomUUID();

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
    await testDataSource.query(readFileSync(bootstrapSchemaPath, 'utf8'));
    for (const migrationPath of prerequisiteMigrationPaths) {
      await testDataSource.query(readFileSync(migrationPath, 'utf8'));
    }

    await insertProject(migratedProjectId, 'Migrated forecast project');
    await insertTask({
      id: migratedTaskId,
      projectId: migratedProjectId,
      title: 'Historical migration task',
    });
    await testDataSource.query(
      `INSERT INTO planning_schedule_snapshots (
         id,
         project_id,
         schedule_version,
         calculation_status,
         calculated_at,
         schedule_anchor_date,
         project_start_date,
         project_finish_date
       ) VALUES ($1, $2, 7, 'calculated', now(), '2026-08-01', '2026-08-01', '2026-08-04')`,
      [migratedSnapshotId, migratedProjectId],
    );
    await testDataSource.query(
      `INSERT INTO planning_task_schedules (
         id,
         snapshot_id,
         project_id,
         task_id,
         task_kind,
         planned_start_date,
         planned_end_date,
         scheduled_start_date,
         scheduled_end_date,
         duration_days,
         is_critical,
         percent_complete,
         sequence_number
       ) VALUES (
         $1, $2, $3, $4, 'standard',
         '2026-08-01', '2026-08-04', '2026-08-01', '2026-08-04',
         3, true, 25, 1
       )`,
      [
        migratedScheduleId,
        migratedSnapshotId,
        migratedProjectId,
        migratedTaskId,
      ],
    );

    [preMigrationConstraint] = await testDataSource.query<
      { conname: string; definition: string }[]
    >(
      `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'planning_task_schedules'::regclass
         AND confrelid = 'tasks'::regclass
         AND contype = 'f'`,
    );
    [preMigrationSchedule] = await testDataSource.query<
      Omit<StoredSchedule, 'task_title'>[]
    >(
      `SELECT
         id,
         snapshot_id,
         task_id,
         parent_task_id,
         planned_start_date::text,
         planned_end_date::text,
         scheduled_start_date::text,
         scheduled_end_date::text,
         duration_days
       FROM planning_task_schedules
       WHERE id = $1`,
      [migratedScheduleId],
    );
    [{ schedule_version: preMigrationSnapshotVersion }] =
      await testDataSource.query<{ schedule_version: number }[]>(
        `SELECT schedule_version
         FROM planning_schedule_snapshots
         WHERE id = $1`,
        [migratedSnapshotId],
      );

    await testDataSource.query(readFileSync(hardeningMigrationPath, 'utf8'));
    snapshotService = createSnapshotService(testDataSource);
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

  it('migrates existing rows without changing schedule identity, dates, or versions', async () => {
    expect(preMigrationConstraint.conname).toBe(
      'planning_task_schedules_task_id_fkey',
    );
    expect(preMigrationConstraint.definition).toContain('ON DELETE CASCADE');

    const [taskColumn, titleColumn] = await Promise.all([
      testDataSource.query<{ is_nullable: string }[]>(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'planning_task_schedules'
           AND column_name = 'task_id'`,
      ),
      testDataSource.query<{ is_nullable: string }[]>(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'planning_task_schedules'
           AND column_name = 'task_title'`,
      ),
    ]);
    const [taskConstraint] = await testDataSource.query<
      { conname: string; definition: string }[]
    >(
      `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'planning_task_schedules'::regclass
         AND confrelid = 'tasks'::regclass
         AND contype = 'f'`,
    );
    const [migratedSchedule] = await loadSchedules('WHERE schedule.id = $1', [
      migratedScheduleId,
    ]);
    const [{ schedule_version: migratedVersion }] = await testDataSource.query<
      { schedule_version: number }[]
    >(
      `SELECT schedule_version
         FROM planning_schedule_snapshots
         WHERE id = $1`,
      [migratedSnapshotId],
    );

    expect(taskColumn[0]?.is_nullable).toBe('YES');
    expect(titleColumn[0]?.is_nullable).toBe('NO');
    expect(taskConstraint.conname).toBe('planning_task_schedules_task_id_fkey');
    expect(taskConstraint.definition).toContain('ON DELETE SET NULL');
    expect(migratedSchedule).toEqual({
      ...preMigrationSchedule,
      task_title: 'Historical migration task',
    });
    expect(migratedVersion).toBe(preMigrationSnapshotVersion);
  });

  it('keeps an official forecast row and its captured title after live task deletion', async () => {
    const projectId = randomUUID();
    const taskId = randomUUID();
    await insertProject(projectId, 'Single-version forecast project');
    await insertTask({ id: taskId, projectId, title: 'Publish release' });

    const snapshot =
      await snapshotService.regenerateOfficialSnapshot(projectId);
    expect(snapshot.taskSchedules).toEqual([
      expect.objectContaining({ taskId, taskTitle: 'Publish release' }),
    ]);

    await testDataSource.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    const rows = await loadSchedules('WHERE schedule.snapshot_id = $1', [
      snapshot.id,
    ]);
    const current = await findCurrentCalculatedSnapshot(
      testDataSource.getRepository(PlanningScheduleSnapshot),
      projectId,
      { taskSchedules: { task: true } },
    );

    expect(rows).toEqual([
      expect.objectContaining({
        task_id: null,
        task_title: 'Publish release',
      }),
    ]);
    expect(current?.id).toBe(snapshot.id);
    expect(current?.scheduleVersion).toBe(1);
    expect(current?.taskSchedules).toEqual([
      expect.objectContaining({
        task: null,
        taskId: null,
        taskTitle: 'Publish release',
      }),
    ]);
  });

  it('does not cascade-delete historical hierarchy rows when a parent task is deleted', async () => {
    const projectId = randomUUID();
    const parentTaskId = randomUUID();
    const childTaskId = randomUUID();
    await insertProject(projectId, 'Historical hierarchy project');
    await insertTask({
      id: parentTaskId,
      projectId,
      taskKind: TaskKind.Summary,
      title: 'Delivery phase',
    });
    await insertTask({
      id: childTaskId,
      parentTaskId,
      projectId,
      title: 'Build feature',
    });
    const snapshot =
      await snapshotService.regenerateOfficialSnapshot(projectId);

    await testDataSource.query(
      'UPDATE tasks SET parent_task_id = NULL WHERE id = $1',
      [childTaskId],
    );
    await testDataSource.query('DELETE FROM tasks WHERE id = $1', [
      parentTaskId,
    ]);

    const rows = await loadSchedules(
      'WHERE schedule.snapshot_id = $1 ORDER BY schedule.sequence_number ASC',
      [snapshot.id],
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.task_title === 'Delivery phase')).toEqual(
      expect.objectContaining({
        task_id: null,
        task_title: 'Delivery phase',
      }),
    );
    expect(rows.find((row) => row.task_title === 'Build feature')).toEqual(
      expect.objectContaining({
        parent_task_id: parentTaskId,
        task_id: childTaskId,
        task_title: 'Build feature',
      }),
    );
  });

  it('retains the task row in every official forecast version', async () => {
    const projectId = randomUUID();
    const taskId = randomUUID();
    await insertProject(projectId, 'Multiple-version forecast project');
    await insertTask({ id: taskId, projectId, title: 'Integrate systems' });

    await snapshotService.regenerateOfficialSnapshot(projectId);
    await testDataSource.query(
      `UPDATE tasks
       SET title = 'Integrate platforms',
           duration_days = 5,
           planned_end_date = '2026-08-06'
       WHERE id = $1`,
      [taskId],
    );
    const second = await snapshotService.regenerateOfficialSnapshot(projectId);
    await testDataSource.query('DELETE FROM tasks WHERE id = $1', [taskId]);

    const rows = await testDataSource.query<
      Array<StoredSchedule & { schedule_version: number }>
    >(
      `SELECT
         schedule.id,
         schedule.snapshot_id,
         snapshot.schedule_version,
         schedule.task_id,
         schedule.task_title,
         schedule.parent_task_id,
         schedule.planned_start_date::text,
         schedule.planned_end_date::text,
         schedule.scheduled_start_date::text,
         schedule.scheduled_end_date::text,
         schedule.duration_days
       FROM planning_task_schedules AS schedule
       JOIN planning_schedule_snapshots AS snapshot
         ON snapshot.id = schedule.snapshot_id
       WHERE schedule.project_id = $1
       ORDER BY snapshot.schedule_version ASC`,
      [projectId],
    );
    const current = await findCurrentCalculatedSnapshot(
      testDataSource.getRepository(PlanningScheduleSnapshot),
      projectId,
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.schedule_version)).toEqual([1, 2]);
    expect(rows.every((row) => row.task_id === null)).toBe(true);
    expect(rows.map((row) => row.task_title)).toEqual([
      'Integrate systems',
      'Integrate platforms',
    ]);
    expect(current?.id).toBe(second.id);
    expect(current?.scheduleVersion).toBe(2);
  });

  it('continues regenerating official forecasts after a historical task is deleted', async () => {
    const projectId = randomUUID();
    const firstTaskId = randomUUID();
    const replacementTaskId = randomUUID();
    await insertProject(projectId, 'Regeneration project');
    await insertTask({
      id: firstTaskId,
      projectId,
      title: 'Original implementation',
    });
    const first = await snapshotService.regenerateOfficialSnapshot(projectId);
    await testDataSource.query('DELETE FROM tasks WHERE id = $1', [
      firstTaskId,
    ]);
    await insertTask({
      id: replacementTaskId,
      projectId,
      title: 'Replacement implementation',
    });

    const second = await snapshotService.regenerateOfficialSnapshot(projectId);
    const firstRows = await loadSchedules('WHERE schedule.snapshot_id = $1', [
      first.id,
    ]);
    const secondRows = await loadSchedules('WHERE schedule.snapshot_id = $1', [
      second.id,
    ]);

    expect(second.scheduleVersion).toBe(2);
    expect(firstRows).toEqual([
      expect.objectContaining({
        task_id: null,
        task_title: 'Original implementation',
      }),
    ]);
    expect(secondRows).toEqual([
      expect.objectContaining({
        task_id: replacementTaskId,
        task_title: 'Replacement implementation',
      }),
    ]);
  });

  it('keeps Working Schedule calculations transient and unchanged', async () => {
    const projectId = randomUUID();
    const taskId = randomUUID();
    await insertProject(projectId, 'Working forecast project');
    await insertTask({ id: taskId, projectId, title: 'Working calculation' });
    const [{ count: beforeCount }] = await testDataSource.query<
      { count: number }[]
    >(
      'SELECT COUNT(*)::int AS count FROM planning_schedule_snapshots WHERE project_id = $1',
      [projectId],
    );

    const working =
      await snapshotService.calculateOperationalForecast(projectId);
    const [{ count: afterCount }] = await testDataSource.query<
      { count: number }[]
    >(
      'SELECT COUNT(*)::int AS count FROM planning_schedule_snapshots WHERE project_id = $1',
      [projectId],
    );

    expect(working.scheduleVersion).toBe(0);
    expect(working.metadata).toEqual(
      expect.objectContaining({ lifecycle: 'operational' }),
    );
    expect(working.taskSchedules).toEqual([
      expect.objectContaining({ taskId, taskTitle: 'Working calculation' }),
    ]);
    expect(beforeCount).toBe(0);
    expect(afterCount).toBe(0);
  });

  it('does not alter baseline tables, rows, foreign keys, or immutability triggers', async () => {
    const projectId = randomUUID();
    const taskId = randomUUID();
    const roleId = randomUUID();
    const userId = randomUUID();
    const baselineId = randomUUID();
    const baselineTaskId = randomUUID();
    await testDataSource.query(`INSERT INTO roles (id, name) VALUES ($1, $2)`, [
      roleId,
      `Forecast history test role ${roleId}`,
    ]);
    await testDataSource.query(
      `INSERT INTO users (id, email, first_name, last_name, password_hash, role_id)
       VALUES ($1, $2, 'Forecast', 'Tester', 'not-used', $3)`,
      [userId, `${userId}@example.test`, roleId],
    );
    await insertProject(projectId, 'Baseline regression project');
    await insertTask({ id: taskId, projectId, title: 'Committed task' });
    await testDataSource.query(
      `INSERT INTO project_baselines (
         id, project_id, name, version_number, status, captured_at,
         captured_by_id, is_current
       ) VALUES ($1, $2, 'Approved commitment', 1, 'approved', now(), $3, true)`,
      [baselineId, projectId, userId],
    );
    await testDataSource.query(
      `INSERT INTO project_baseline_tasks (
         id, project_baseline_id, project_id, task_id, task_title, task_kind,
         planned_start_date, planned_end_date
       ) VALUES (
         $1, $2, $3, $4, 'Committed task', 'standard',
         '2026-08-01', '2026-08-04'
       )`,
      [baselineTaskId, baselineId, projectId, taskId],
    );

    await snapshotService.regenerateOfficialSnapshot(projectId);
    await snapshotService.calculateOperationalForecast(projectId);

    const [baseline] = await testDataSource.query<
      {
        id: string;
        is_current: boolean;
        status: string;
        version_number: number;
      }[]
    >(
      `SELECT id, version_number, status, is_current
       FROM project_baselines
       WHERE id = $1`,
      [baselineId],
    );
    const [baselineTask] = await testDataSource.query<
      { id: string; task_id: string; task_title: string }[]
    >(
      `SELECT id, task_id, task_title
       FROM project_baseline_tasks
       WHERE id = $1`,
      [baselineTaskId],
    );
    const [baselineTaskConstraint] = await testDataSource.query<
      { definition: string }[]
    >(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'project_baseline_tasks'::regclass
         AND confrelid = 'tasks'::regclass
         AND contype = 'f'`,
    );
    const triggers = await testDataSource.query<{ tgname: string }[]>(
      `SELECT tgname
       FROM pg_trigger
       WHERE tgrelid IN (
         'project_baselines'::regclass,
         'project_baseline_tasks'::regclass
       )
         AND NOT tgisinternal
       ORDER BY tgname`,
    );

    expect(baseline).toEqual({
      id: baselineId,
      is_current: true,
      status: 'approved',
      version_number: 1,
    });
    expect(baselineTask).toEqual({
      id: baselineTaskId,
      task_id: taskId,
      task_title: 'Committed task',
    });
    expect(baselineTaskConstraint.definition).toContain('ON DELETE SET NULL');
    expect(triggers.map((trigger) => trigger.tgname)).toEqual([
      'trg_project_baseline_tasks_immutable',
      'trg_project_baselines_immutable',
    ]);
  });

  async function insertProject(projectId: string, name: string) {
    await testDataSource.query(
      `INSERT INTO projects (id, name, status, start_date)
       VALUES ($1, $2, 'active', '2026-08-01')`,
      [projectId, name],
    );
  }

  async function insertTask(input: {
    id: string;
    parentTaskId?: string | null;
    projectId: string;
    taskKind?: TaskKind;
    title: string;
  }) {
    const taskKind = input.taskKind ?? TaskKind.Standard;
    const isSummary = taskKind === TaskKind.Summary;
    await testDataSource.query(
      `INSERT INTO tasks (
         id,
         project_id,
         parent_task_id,
         title,
         task_kind,
         sequence_number,
         planned_start_date,
         planned_end_date,
         duration_days
       ) VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8)`,
      [
        input.id,
        input.projectId,
        input.parentTaskId ?? null,
        input.title,
        taskKind,
        isSummary ? null : '2026-08-01',
        isSummary ? null : '2026-08-04',
        isSummary ? null : 3,
      ],
    );
  }

  function loadSchedules(whereClause: string, parameters: unknown[]) {
    return testDataSource.query<StoredSchedule[]>(
      `SELECT
         schedule.id,
         schedule.snapshot_id,
         schedule.task_id,
         schedule.task_title,
         schedule.parent_task_id,
         schedule.planned_start_date::text,
         schedule.planned_end_date::text,
         schedule.scheduled_start_date::text,
         schedule.scheduled_end_date::text,
         schedule.duration_days
       FROM planning_task_schedules AS schedule
       ${whereClause}`,
      parameters,
    );
  }
});

function createSnapshotService(dataSource: DataSource) {
  const engine = new PlanningScheduleEngineService(
    new PlanningGraphBuilderService(),
    new PlanningForwardPassService(),
    new PlanningBackwardPassService(),
    new PlanningFloatService(),
    new PlanningCriticalPathService(),
  );
  return new PlanningSnapshotService(
    dataSource.getRepository(PlanningScheduleSnapshot),
    new SchedulingContextFactory(),
    engine,
  );
}
