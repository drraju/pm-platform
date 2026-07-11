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
const assignmentMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '018_v1_2_3_resource_assignment_foundation.sql',
);
const assignmentDuplicateGuardMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '020_v1_2_3_resource_assignment_duplicate_guard.sql',
);

describe('Resource assignment persistence', () => {
  const databaseName = `pm_platform_assignment_test_${randomBytes(6).toString('hex')}`;
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

    for (const sqlPath of [bootstrapSchemaPath, resourceMigrationPath]) {
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

  it('rejects duplicate non-deleted assignments at the PostgreSQL layer', async () => {
    await testDataSource.query(readFileSync(assignmentMigrationPath, 'utf8'));
    await testDataSource.query(
      readFileSync(assignmentDuplicateGuardMigrationPath, 'utf8'),
    );

    const roleId = '11111111-1111-4111-8111-111111111111';
    const projectId = '22222222-2222-4222-8222-222222222222';
    const resourceId = '33333333-3333-4333-8333-333333333333';

    await testDataSource.query(
      `INSERT INTO roles (id, name)
       VALUES ($1, 'Assignment Test Role')`,
      [roleId],
    );
    await testDataSource.query(
      `INSERT INTO projects (id, name, status)
       VALUES ($1, 'Assignment Test Project', 'active')`,
      [projectId],
    );
    await testDataSource.query(
      `INSERT INTO enterprise_resources (id, name, resource_type, status)
       VALUES ($1, 'Assignment Test Resource', 'human', 'active')`,
      [resourceId],
    );

    await testDataSource.query(
      `INSERT INTO enterprise_resource_assignments (
         resource_id,
         project_id,
         allocation_percent,
         start_date,
         end_date,
         status
       ) VALUES ($1, $2, 50, '2026-07-11', '2026-07-18', 'draft')`,
      [resourceId, projectId],
    );

    await expect(
      testDataSource.query(
        `INSERT INTO enterprise_resource_assignments (
           resource_id,
           project_id,
           allocation_percent,
           start_date,
           end_date,
           status
         ) VALUES ($1, $2, 75, '2026-07-11', '2026-07-18', 'archived')`,
        [resourceId, projectId],
      ),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'idx_enterprise_resource_assignments_active_unique',
    });
  });

  it('adds the duplicate guard cleanly for databases that already applied migration 018', async () => {
    const upgradedDatabaseName = `${databaseName}_upgrade`;
    const upgradedDataSource = new DataSource({
      ...createDataSourceOptions(),
      database: upgradedDatabaseName,
    });

    await adminDataSource.query(`CREATE DATABASE "${upgradedDatabaseName}"`);

    try {
      await upgradedDataSource.initialize();

      for (const sqlPath of [
        bootstrapSchemaPath,
        resourceMigrationPath,
        assignmentMigrationPath,
      ]) {
        await upgradedDataSource.query(readFileSync(sqlPath, 'utf8'));
      }

      const beforeCount = await upgradedDataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM pg_indexes
         WHERE tablename = 'enterprise_resource_assignments'
           AND indexname = 'idx_enterprise_resource_assignments_active_unique'`,
      );
      expect(beforeCount[0]?.count).toBe(0);

      await upgradedDataSource.query(
        readFileSync(assignmentDuplicateGuardMigrationPath, 'utf8'),
      );

      const afterCount = await upgradedDataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM pg_indexes
         WHERE tablename = 'enterprise_resource_assignments'
           AND indexname = 'idx_enterprise_resource_assignments_active_unique'`,
      );
      expect(afterCount[0]?.count).toBe(1);
    } finally {
      if (upgradedDataSource.isInitialized) {
        await upgradedDataSource.destroy();
      }
      await adminDataSource.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [upgradedDatabaseName],
      );
      await adminDataSource.query(
        `DROP DATABASE IF EXISTS "${upgradedDatabaseName}"`,
      );
    }
  });
});
