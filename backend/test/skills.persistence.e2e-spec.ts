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

describe('Skills persistence', () => {
  const databaseName = `pm_platform_skills_test_${randomBytes(6).toString('hex')}`;
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

  it('creates skills tables, constraints, and indexes for upgraded databases', async () => {
    await testDataSource.query(readFileSync(skillsMigrationPath, 'utf8'));

    const tables = await testDataSource.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename IN ('enterprise_skills', 'enterprise_resource_skills')
       ORDER BY tablename`,
    );
    expect(tables.map((row: { tablename: string }) => row.tablename)).toEqual([
      'enterprise_resource_skills',
      'enterprise_skills',
    ]);

    const indexes = await testDataSource.query(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname IN (
           'idx_enterprise_skills_active_name_unique',
           'idx_enterprise_resource_skills_active_unique'
         )
       ORDER BY indexname`,
    );
    expect(indexes.map((row: { indexname: string }) => row.indexname)).toEqual([
      'idx_enterprise_resource_skills_active_unique',
      'idx_enterprise_skills_active_name_unique',
    ]);
  });

  it('supports fresh installs that apply the full ERM migration chain through skills', async () => {
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
      ]) {
        await freshDataSource.query(readFileSync(sqlPath, 'utf8'));
      }

      await freshDataSource.query(
        `INSERT INTO enterprise_skills (name, category, status)
         VALUES ('Architecture', 'Delivery', 'active')`,
      );

      const skills = await freshDataSource.query(
        `SELECT name, category, status
         FROM enterprise_skills
         WHERE name = 'Architecture'`,
      );
      expect(skills).toEqual([
        {
          name: 'Architecture',
          category: 'Delivery',
          status: 'active',
        },
      ]);
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

  it('rejects duplicate non-deleted resource skills at the PostgreSQL layer', async () => {
    await testDataSource.query(readFileSync(skillsMigrationPath, 'utf8'));

    const resourceId = '33333333-3333-4333-8333-333333333333';
    const skillId = '44444444-4444-4444-8444-444444444444';

    await testDataSource.query(
      `INSERT INTO enterprise_resources (id, name, resource_type, status)
       VALUES ($1, 'Skill Test Resource', 'human', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [resourceId],
    );
    await testDataSource.query(
      `INSERT INTO enterprise_skills (id, name, category, status)
       VALUES ($1, 'TypeScript', 'Engineering', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [skillId],
    );

    await testDataSource.query(
      `INSERT INTO enterprise_resource_skills (
         resource_id,
         skill_id,
         proficiency_level,
         years_experience,
         months_experience,
         status
       ) VALUES ($1, $2, 'advanced', 5, 6, 'active')`,
      [resourceId, skillId],
    );

    await expect(
      testDataSource.query(
        `INSERT INTO enterprise_resource_skills (
           resource_id,
           skill_id,
           proficiency_level,
           years_experience,
           months_experience,
           status
         ) VALUES ($1, $2, 'expert', 7, 0, 'draft')`,
        [resourceId, skillId],
      ),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'idx_enterprise_resource_skills_active_unique',
    });
  });
});
