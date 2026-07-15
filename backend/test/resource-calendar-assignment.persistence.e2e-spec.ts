import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';
import { MigrationRunnerService } from '../src/modules/health/migration-runner.service';

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
const calendarAssignmentMigration =
  '024_v1_2_6_resource_calendar_assignment.sql';

const migrationFiles = readdirSync(migrationDirectory)
  .filter((filename) => filename.endsWith('.sql'))
  .sort();

describe('Resource calendar assignment persistence', () => {
  const databasePrefix = `pm_platform_calendar_assignment_test_${randomBytes(6).toString('hex')}`;
  let adminDataSource: DataSource;
  const testDataSources: DataSource[] = [];
  const testDatabaseNames: string[] = [];

  beforeAll(async () => {
    adminDataSource = new DataSource({
      ...createDataSourceOptions(),
      database: process.env.POSTGRES_ADMIN_DB ?? 'postgres',
    });
    await adminDataSource.initialize();
  });

  afterAll(async () => {
    for (const dataSource of testDataSources) {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }

    if (adminDataSource?.isInitialized) {
      for (const databaseName of testDatabaseNames) {
        await adminDataSource.query(
          `SELECT pg_terminate_backend(pid)
           FROM pg_stat_activity
           WHERE datname = $1
             AND pid <> pg_backend_pid()`,
          [databaseName],
        );
        await adminDataSource.query(
          `DROP DATABASE IF EXISTS "${databaseName}"`,
        );
      }
      await adminDataSource.destroy();
    }
  });

  const createTestDataSource = async (suffix: string) => {
    const databaseName = `${databasePrefix}_${suffix}`;
    await adminDataSource.query(`CREATE DATABASE "${databaseName}"`);
    testDatabaseNames.push(databaseName);

    const dataSource = new DataSource({
      ...createDataSourceOptions(),
      database: databaseName,
    });
    await dataSource.initialize();
    testDataSources.push(dataSource);
    await dataSource.query(readFileSync(bootstrapSchemaPath, 'utf8'));
    return dataSource;
  };

  const applyMigrationsThrough = async (
    dataSource: DataSource,
    finalFilename: string,
  ) => {
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const filename of migrationFiles) {
      if (filename > finalFilename) {
        break;
      }

      await dataSource.transaction(async (manager) => {
        await manager.query(
          readFileSync(join(migrationDirectory, filename), 'utf8'),
        );
        await manager.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        );
      });
    }
  };

  it('applies migration 024 to a Feature 1.2.5 upgraded database', async () => {
    const dataSource = await createTestDataSource('upgrade');
    await applyMigrationsThrough(
      dataSource,
      '023_v1_2_5_resource_availability_capacity_foundation.sql',
    );

    const existingResourceId = '11111111-1111-4111-8111-111111111111';
    await dataSource.query(
      `INSERT INTO enterprise_resources (id, name, resource_type, status)
       VALUES ($1, 'Existing Resource', 'human', 'active')`,
      [existingResourceId],
    );

    await new MigrationRunnerService(dataSource).runPendingMigrations();

    const columns = await dataSource.query<
      { column_name: string; is_nullable: string }[]
    >(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'enterprise_resources'
         AND column_name = 'calendar_id'`,
    );
    expect(columns).toEqual([
      { column_name: 'calendar_id', is_nullable: 'YES' },
    ]);

    const resources = await dataSource.query<{ calendar_id: string | null }[]>(
      `SELECT calendar_id
       FROM enterprise_resources
       WHERE id = $1`,
      [existingResourceId],
    );
    expect(resources).toEqual([{ calendar_id: null }]);

    const appliedMigration = await dataSource.query<{ filename: string }[]>(
      `SELECT filename
       FROM schema_migrations
       WHERE filename = $1`,
      [calendarAssignmentMigration],
    );
    expect(appliedMigration).toEqual([
      { filename: calendarAssignmentMigration },
    ]);
  });

  it('supports fresh databases and enforces the Calendar foreign key invariants', async () => {
    const dataSource = await createTestDataSource('fresh');
    await new MigrationRunnerService(dataSource).runPendingMigrations();

    const calendarId = '22222222-2222-4222-8222-222222222222';
    const firstResourceId = '33333333-3333-4333-8333-333333333333';
    const secondResourceId = '44444444-4444-4444-8444-444444444444';

    await dataSource.query(
      `INSERT INTO enterprise_calendars (id, name, status)
       VALUES ($1, 'Shared Calendar', 'active')`,
      [calendarId],
    );
    await dataSource.query(
      `INSERT INTO enterprise_resources (
         id,
         name,
         resource_type,
         status,
         calendar_id
       ) VALUES
         ($1, 'First Calendar Resource', 'human', 'active', $3),
         ($2, 'Second Calendar Resource', 'contractor', 'active', $3)`,
      [firstResourceId, secondResourceId, calendarId],
    );

    const assignedResources = await dataSource.query<{ calendar_id: string }[]>(
      `SELECT calendar_id
       FROM enterprise_resources
       WHERE id IN ($1, $2)
       ORDER BY id`,
      [firstResourceId, secondResourceId],
    );
    expect(assignedResources).toEqual([
      { calendar_id: calendarId },
      { calendar_id: calendarId },
    ]);

    await expect(
      dataSource.query(
        `INSERT INTO enterprise_resources (
           name,
           resource_type,
           status,
           calendar_id
         ) VALUES ('Invalid Calendar Resource', 'human', 'active', $1)`,
        ['55555555-5555-4555-8555-555555555555'],
      ),
    ).rejects.toMatchObject({
      code: '23503',
      constraint: 'fk_enterprise_resources_calendar',
    });

    await expect(
      dataSource.query('DELETE FROM enterprise_calendars WHERE id = $1', [
        calendarId,
      ]),
    ).rejects.toMatchObject({
      code: '23503',
      constraint: 'fk_enterprise_resources_calendar',
    });

    const indexes = await dataSource.query<{ indexname: string }[]>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = 'idx_enterprise_resources_calendar'`,
    );
    expect(indexes).toEqual([
      { indexname: 'idx_enterprise_resources_calendar' },
    ]);

    const appliedMigration = await dataSource.query<{ filename: string }[]>(
      `SELECT filename
       FROM schema_migrations
       WHERE filename = $1`,
      [calendarAssignmentMigration],
    );
    expect(appliedMigration).toEqual([
      { filename: calendarAssignmentMigration },
    ]);
  });
});
