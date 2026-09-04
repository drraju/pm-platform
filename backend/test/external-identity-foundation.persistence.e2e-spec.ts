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
const identityTypeMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '038_stab_iam_003_user_identity_foundation.sql',
);
const externalIdentityMigrationPath = join(
  __dirname,
  '..',
  'src',
  'database',
  'migrations',
  '040_stab_iam_005_external_identity_foundation.sql',
);

const roleId = '11111111-1111-4111-8111-111111111111';

describe('External identity foundation persistence', () => {
  const databaseName = `pm_platform_external_identity_test_${randomBytes(6).toString('hex')}`;
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
    await applyFoundation(testDataSource, true);
  });

  afterAll(async () => {
    await dropTestDatabase(databaseName, testDataSource);
    if (adminDataSource?.isInitialized) {
      await adminDataSource.destroy();
    }
  });

  it('creates and reads an external identity', async () => {
    const userId = '20000000-0000-4000-8000-000000000001';
    await insertUser(testDataSource, userId, 'identity@example.com', 'HUMAN');

    await testDataSource.query(
      `INSERT INTO external_identities (
         user_id,
         provider,
         issuer,
         subject,
         email_at_last_authentication
       ) VALUES ($1, 'GOOGLE', $2, $3, $4)`,
      [
        userId,
        'https://accounts.example',
        'subject-create',
        'identity@example.com',
      ],
    );

    await expect(
      testDataSource.query(
        `SELECT user_id, provider, issuer, subject, email_at_last_authentication
         FROM external_identities
         WHERE subject = 'subject-create'`,
      ),
    ).resolves.toEqual([
      {
        email_at_last_authentication: 'identity@example.com',
        issuer: 'https://accounts.example',
        provider: 'GOOGLE',
        subject: 'subject-create',
        user_id: userId,
      },
    ]);
  });

  it('rejects duplicate issuer and subject mappings', async () => {
    const firstUserId = '20000000-0000-4000-8000-000000000002';
    const secondUserId = '20000000-0000-4000-8000-000000000003';
    await insertUser(
      testDataSource,
      firstUserId,
      'subject-one@example.com',
      'HUMAN',
    );
    await insertUser(
      testDataSource,
      secondUserId,
      'subject-two@example.com',
      'HUMAN',
    );
    await insertIdentity(testDataSource, firstUserId, 'duplicate-subject');

    await expect(
      insertIdentity(testDataSource, secondUserId, 'duplicate-subject'),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'uq_external_identities_issuer_subject',
    });
  });

  it('rejects duplicate provider mappings for one user', async () => {
    const userId = '20000000-0000-4000-8000-000000000004';
    await insertUser(testDataSource, userId, 'provider@example.com', 'HUMAN');
    await insertIdentity(testDataSource, userId, 'provider-subject-one');

    await expect(
      insertIdentity(testDataSource, userId, 'provider-subject-two'),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'uq_external_identities_user_provider',
    });
  });

  it('deletes external identities when their user is deleted', async () => {
    const userId = '20000000-0000-4000-8000-000000000005';
    await insertUser(testDataSource, userId, 'cascade@example.com', 'HUMAN');
    await insertIdentity(testDataSource, userId, 'cascade-subject');

    await testDataSource.query('DELETE FROM users WHERE id = $1', [userId]);

    const result = await testDataSource.query<Array<{ count: number }>>(
      'SELECT count(*)::int AS count FROM external_identities WHERE user_id = $1',
      [userId],
    );
    expect(result).toEqual([{ count: 0 }]);
  });

  it('allows HUMAN passwords to be null or populated and requires SERVICE passwords', async () => {
    await expect(
      insertUser(
        testDataSource,
        '20000000-0000-4000-8000-000000000006',
        'human-oidc@example.com',
        'HUMAN',
        null,
      ),
    ).resolves.toBeDefined();
    await expect(
      insertUser(
        testDataSource,
        '20000000-0000-4000-8000-000000000007',
        'human-local@example.com',
        'HUMAN',
        'human-password-hash',
      ),
    ).resolves.toBeDefined();
    await expect(
      insertUser(
        testDataSource,
        '20000000-0000-4000-8000-000000000008',
        'service-local@example.com',
        'SERVICE',
        'service-password-hash',
      ),
    ).resolves.toBeDefined();
    await expect(
      insertUser(
        testDataSource,
        '20000000-0000-4000-8000-000000000009',
        'service-without-password@example.com',
        'SERVICE',
        null,
      ),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'chk_users_service_password_required',
    });
  });

  it('rejects case-insensitive email collisions', async () => {
    await insertUser(
      testDataSource,
      '20000000-0000-4000-8000-000000000010',
      'CaseSensitive@example.com',
      'HUMAN',
    );

    await expect(
      insertUser(
        testDataSource,
        '20000000-0000-4000-8000-000000000011',
        'casesensitive@example.com',
        'HUMAN',
      ),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'idx_users_email_normalized_unique',
    });
  });

  it('retains the original exact email uniqueness constraint', async () => {
    const constraints = await testDataSource.query<Array<{ conname: string }>>(
      `SELECT conname
       FROM pg_constraint
       WHERE conrelid = 'users'::regclass
         AND contype = 'u'`,
    );
    expect(constraints.map(({ conname }) => conname)).toContain(
      'users_email_key',
    );

    await insertUser(
      testDataSource,
      '20000000-0000-4000-8000-000000000012',
      'exact-duplicate@example.com',
      'HUMAN',
    );
    await expect(
      insertUser(
        testDataSource,
        '20000000-0000-4000-8000-000000000013',
        'exact-duplicate@example.com',
        'HUMAN',
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('stops before schema changes when existing emails collide by case', async () => {
    const collisionDatabaseName = `${databaseName}_collision`;
    let collisionDataSource: DataSource | undefined;
    await adminDataSource.query(`CREATE DATABASE "${collisionDatabaseName}"`);

    try {
      collisionDataSource = new DataSource({
        ...createDataSourceOptions(),
        database: collisionDatabaseName,
      });
      await collisionDataSource.initialize();
      await applyFoundation(collisionDataSource, false);
      await insertUser(
        collisionDataSource,
        '30000000-0000-4000-8000-000000000001',
        'Collision@example.com',
        'HUMAN',
      );
      await insertUser(
        collisionDataSource,
        '30000000-0000-4000-8000-000000000002',
        'collision@example.com',
        'HUMAN',
      );

      const migrationAttempt: Promise<unknown> = collisionDataSource.query(
        readFileSync(externalIdentityMigrationPath, 'utf8'),
      );
      await expect(migrationAttempt).rejects.toMatchObject({
        code: '23505',
      });
      await expect(migrationAttempt).rejects.toThrow(
        'case-colliding user emails exist',
      );

      const passwordColumn = await collisionDataSource.query<
        Array<{ is_nullable: string }>
      >(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'password_hash'`,
      );
      expect(passwordColumn).toEqual([{ is_nullable: 'NO' }]);
    } finally {
      await dropTestDatabase(collisionDatabaseName, collisionDataSource);
    }
  });

  async function applyFoundation(
    dataSource: DataSource,
    includeExternal: boolean,
  ) {
    await dataSource.query(readFileSync(bootstrapSchemaPath, 'utf8'));
    await dataSource.query(readFileSync(identityTypeMigrationPath, 'utf8'));
    if (includeExternal) {
      await dataSource.query(
        readFileSync(externalIdentityMigrationPath, 'utf8'),
      );
    }
    await dataSource.query(
      `INSERT INTO roles (id, name)
       VALUES ($1, 'External Identity Test Role')`,
      [roleId],
    );
  }

  async function dropTestDatabase(
    name: string,
    dataSource: DataSource | undefined,
  ) {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [name],
      );
      await adminDataSource.query(`DROP DATABASE IF EXISTS "${name}"`);
    }
  }
});

function insertUser(
  dataSource: DataSource,
  id: string,
  email: string,
  identityType: 'HUMAN' | 'SERVICE',
  passwordHash: string | null = 'password-hash',
) {
  return dataSource.query(
    `INSERT INTO users (
       id,
       email,
       first_name,
       last_name,
       password_hash,
       role_id,
       status,
       identity_type
     ) VALUES ($1, $2, 'Test', 'User', $3, $4, 'active', $5)`,
    [id, email, passwordHash, roleId, identityType],
  );
}

function insertIdentity(
  dataSource: DataSource,
  userId: string,
  subject: string,
) {
  return dataSource.query(
    `INSERT INTO external_identities (
       user_id,
       provider,
       issuer,
       subject,
       email_at_last_authentication
     ) VALUES ($1, 'GOOGLE', 'https://accounts.example', $2, 'user@example.com')`,
    [userId, subject],
  );
}
