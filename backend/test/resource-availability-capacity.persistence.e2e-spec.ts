import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';

const bootstrapSchemaPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'schema',
  '001_initial_schema.sql',
);
const resourceMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '017_v1_2_1_erm_domain_model.sql',
);
const assignmentFoundationMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '018_v1_2_3_resource_assignment_foundation.sql',
);
const assignmentPermissionsMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '019_v1_2_3_resource_assignment_api_permissions.sql',
);
const assignmentDuplicateGuardMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '020_v1_2_3_resource_assignment_duplicate_guard.sql',
);
const skillsMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '021_v1_2_4_skills_management_foundation.sql',
);
const skillsPermissionsMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '022_v1_2_4_skills_api_permissions.sql',
);
const availabilityCapacityMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '023_v1_2_5_resource_availability_capacity_foundation.sql',
);

describe('Resource availability and capacity persistence', () => {
  const databaseName = `pm_platform_capacity_test_${randomBytes(6).toString('hex')}`;
  let adminDataSource: DataSource;
  let testDataSource: DataSource;

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

    for (const sqlPath of [
      bootstrapSchemaPath,
      resourceMigrationPath,
      assignmentFoundationMigrationPath,
      assignmentPermissionsMigrationPath,
      assignmentDuplicateGuardMigrationPath,
      skillsMigrationPath,
      skillsPermissionsMigrationPath,
    ]) {
      await testDataSource.query(readFileSync(sqlPath, 'utf8'));
    }
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

  it('creates capacity and availability tables, constraints, and overlap exclusion for upgraded databases', async () => {
    await testDataSource.query(
      readFileSync(availabilityCapacityMigrationPath, 'utf8'),
    );

    const tables = await testDataSource.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename IN (
           'enterprise_resource_capacity_policies',
           'enterprise_resource_availability_overrides'
         )
       ORDER BY tablename`,
    );
    expect(tables.map((row: { tablename: string }) => row.tablename)).toEqual([
      'enterprise_resource_availability_overrides',
      'enterprise_resource_capacity_policies',
    ]);

    const constraints = await testDataSource.query(
      `SELECT conname
       FROM pg_constraint
       WHERE conname IN (
         'chk_enterprise_resource_capacity_policies_capacity',
         'chk_enterprise_resource_capacity_policies_dates',
         'chk_enterprise_resource_availability_overrides_shape',
         'excl_enterprise_resource_capacity_policies_active_period'
       )
       ORDER BY conname`,
    );
    expect(constraints.map((row: { conname: string }) => row.conname)).toEqual([
      'chk_enterprise_resource_availability_overrides_shape',
      'chk_enterprise_resource_capacity_policies_capacity',
      'chk_enterprise_resource_capacity_policies_dates',
      'excl_enterprise_resource_capacity_policies_active_period',
    ]);
  });

  it('supports fresh installs that apply the full ERM migration chain through capacity management', async () => {
    const freshDatabaseName = `${databaseName}_fresh`;
    const freshDataSource = new DataSource({
      ...createDataSourceOptions(),
      database: freshDatabaseName,
    });

    await adminDataSource.query(`CREATE DATABASE "${freshDatabaseName}"`);

    try {
      await freshDataSource.initialize();

      for (const sqlPath of [
        bootstrapSchemaPath,
        resourceMigrationPath,
        assignmentFoundationMigrationPath,
        assignmentPermissionsMigrationPath,
        assignmentDuplicateGuardMigrationPath,
        skillsMigrationPath,
        skillsPermissionsMigrationPath,
        availabilityCapacityMigrationPath,
      ]) {
        await freshDataSource.query(readFileSync(sqlPath, 'utf8'));
      }

      await freshDataSource.query(
        `INSERT INTO enterprise_resources (name, resource_type, status)
         VALUES ('Capacity Fresh Resource', 'human', 'active')`,
      );

      const resources = await freshDataSource.query(
        `SELECT name
         FROM enterprise_resources
         WHERE name = 'Capacity Fresh Resource'`,
      );
      expect(resources).toEqual([{ name: 'Capacity Fresh Resource' }]);
    } finally {
      if (freshDataSource.isInitialized) {
        await freshDataSource.destroy();
      }
      await adminDataSource.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [freshDatabaseName],
      );
      await adminDataSource.query(`DROP DATABASE IF EXISTS "${freshDatabaseName}"`);
    }
  });

  it('rejects overlapping active capacity policies for the same resource at the PostgreSQL layer', async () => {
    await testDataSource.query(
      readFileSync(availabilityCapacityMigrationPath, 'utf8'),
    );

    const resourceId = '55555555-5555-4555-8555-555555555555';

    await testDataSource.query(
      `INSERT INTO enterprise_resources (id, name, resource_type, status)
       VALUES ($1, 'Capacity Test Resource', 'human', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [resourceId],
    );

    await testDataSource.query(
      `INSERT INTO enterprise_resource_capacity_policies (
         resource_id,
         capacity_minutes_per_working_day,
         effective_start_date,
         effective_end_date,
         status
       ) VALUES ($1, 480, '2026-07-01', '2026-07-31', 'active')`,
      [resourceId],
    );

    await expect(
      testDataSource.query(
        `INSERT INTO enterprise_resource_capacity_policies (
           resource_id,
           capacity_minutes_per_working_day,
           effective_start_date,
           effective_end_date,
           status
         ) VALUES ($1, 420, '2026-07-15', '2026-08-15', 'active')`,
        [resourceId],
      ),
    ).rejects.toMatchObject({
      code: '23P01',
      constraint: 'excl_enterprise_resource_capacity_policies_active_period',
    });
  });

  it('rejects invalid reduced-capacity overrides without a quantitative value', async () => {
    await testDataSource.query(
      readFileSync(availabilityCapacityMigrationPath, 'utf8'),
    );

    const resourceId = '66666666-6666-4666-8666-666666666666';

    await testDataSource.query(
      `INSERT INTO enterprise_resources (id, name, resource_type, status)
       VALUES ($1, 'Availability Override Resource', 'human', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [resourceId],
    );

    await expect(
      testDataSource.query(
        `INSERT INTO enterprise_resource_availability_overrides (
           resource_id,
           override_type,
           available_minutes_per_working_day,
           start_date,
           end_date
         ) VALUES ($1, 'reduced_capacity', NULL, '2026-08-01', '2026-08-03')`,
        [resourceId],
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'chk_enterprise_resource_availability_overrides_shape',
    });
  });
});
