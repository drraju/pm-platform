import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { UserIdentityType } from '../src/common/enums/user-identity-type.enum';
import { UserRole } from '../src/common/enums/user-role.enum';
import { createDataSourceOptions } from '../src/database/typeorm.config';
import { User } from '../src/modules/users/entities/user.entity';
import {
  GoogleIdentityLinkingRejectedError,
  GoogleIdentityLinkingService,
} from '../src/modules/users/google-identity-linking.service';

const databaseName = `pm_platform_google_jit_test_${randomBytes(6).toString('hex')}`;
const issuer = 'https://accounts.google.com';
const sqlRoot = join(__dirname, '..', 'src', 'database');

describe('Google JIT provisioning persistence', () => {
  jest.setTimeout(30_000);

  let adminDataSource: DataSource;
  let service: GoogleIdentityLinkingService;
  let testDataSource: DataSource;
  let teamMemberRoleId: string;

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
    await applySql('schema/001_initial_schema.sql');
    await applySql('migrations/029_stab_rbac_001_role_consolidation.sql');
    await applySql(
      'migrations/030_stab_auth_001_change_password_foundation.sql',
    );
    await applySql('migrations/033_stab_iam_002_user_administration.sql');
    await applySql('migrations/038_stab_iam_003_user_identity_foundation.sql');
    await applySql(
      'migrations/040_stab_iam_005_external_identity_foundation.sql',
    );
    await applySql(
      'migrations/041_stab_iam_006_google_jit_nullable_user_names.sql',
    );

    const roles = await testDataSource.query<Array<{ id: string }>>(
      'SELECT id FROM roles WHERE name = $1',
      [UserRole.TeamMember],
    );
    teamMemberRoleId = roles[0].id;
    service = new GoogleIdentityLinkingService(
      testDataSource.getRepository(User),
    );
  });

  beforeEach(async () => {
    await testDataSource.query('DELETE FROM external_identities');
    await testDataSource.query('DELETE FROM users');
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

  it('persists a passwordless active TEAM_MEMBER HUMAN with nullable names', async () => {
    const result = await service.resolveAndRecordAuthentication(
      input('new-user@cloudfabrix.com', 'new-subject', null, null),
    );

    const users = await rows('users');
    const identities = await rows('external_identities');
    expect(result).toMatchObject({
      principal: {
        email: 'new-user@cloudfabrix.com',
        identityType: UserIdentityType.Human,
        passwordChangedAt: null,
        roleId: teamMemberRoleId,
      },
      status: 'active',
    });
    expect(users).toEqual([
      expect.objectContaining({
        account_history: [],
        first_name: null,
        identity_type: UserIdentityType.Human,
        last_name: null,
        password_changed_at: null,
        password_hash: null,
        role_id: teamMemberRoleId,
        status: 'active',
      }),
    ]);
    expect(identities).toEqual([
      expect.objectContaining({
        email_at_last_authentication: 'new-user@cloudfabrix.com',
        issuer,
        provider: 'GOOGLE',
        subject: 'new-subject',
        user_id: result.principal.id,
      }),
    ]);
    expect(users[0].last_login_at).not.toBeNull();
    expect(identities[0].last_authenticated_at).not.toBeNull();
    await expect(count('project_members')).resolves.toBe(0);
  });

  it('converges identical concurrent attempts on one user and identity', async () => {
    const request = input(
      'same-request@cloudfabrix.com',
      'same-request-subject',
    );

    const results = await Promise.all([
      service.resolveAndRecordAuthentication(request),
      service.resolveAndRecordAuthentication(request),
    ]);

    expect(results[0].principal.id).toBe(results[1].principal.id);
    await expect(count('users')).resolves.toBe(1);
    await expect(count('external_identities')).resolves.toBe(1);
  });

  it('rolls back the losing user when one subject races with different emails', async () => {
    const results = await Promise.allSettled([
      service.resolveAndRecordAuthentication(
        input('subject-race-a@cloudfabrix.com', 'shared-subject'),
      ),
      service.resolveAndRecordAuthentication(
        input('subject-race-b@cloudfabrix.com', 'shared-subject'),
      ),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason instanceof GoogleIdentityLinkingRejectedError).toBe(
      true,
    );
    await expect(count('users')).resolves.toBe(1);
    await expect(count('external_identities')).resolves.toBe(1);
  });

  it('allows only one subject to claim a concurrently provisioned email', async () => {
    const results = await Promise.allSettled([
      service.resolveAndRecordAuthentication(
        input('email-race@cloudfabrix.com', 'email-race-subject-a'),
      ),
      service.resolveAndRecordAuthentication(
        input('email-race@cloudfabrix.com', 'email-race-subject-b'),
      ),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected?.reason instanceof GoogleIdentityLinkingRejectedError).toBe(
      true,
    );
    await expect(count('users')).resolves.toBe(1);
    await expect(count('external_identities')).resolves.toBe(1);
  });

  it('reconciles an administrative creation winner without overwriting it', async () => {
    const queryRunner = testDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `INSERT INTO users (
           email, first_name, last_name, password_hash, role_id, status, identity_type
         ) VALUES ($1, 'Administrative', 'Winner', 'preserved-hash', $2,
           'first_login_pending', 'HUMAN')`,
        ['admin-race@cloudfabrix.com', teamMemberRoleId],
      );

      const authentication = service.resolveAndRecordAuthentication(
        input('admin-race@cloudfabrix.com', 'admin-race-subject'),
      );
      await new Promise<void>((resolve) => setImmediate(resolve));
      await queryRunner.commitTransaction();
      await expect(authentication).resolves.toMatchObject({
        status: 'first_login_pending',
      });
    } finally {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      await queryRunner.release();
    }

    expect(await rows('users')).toEqual([
      expect.objectContaining({
        first_name: 'Administrative',
        last_name: 'Winner',
        password_hash: 'preserved-hash',
        status: 'first_login_pending',
      }),
    ]);
    await expect(count('external_identities')).resolves.toBe(1);
  });

  it('rolls back the JIT user when external identity insertion fails', async () => {
    await testDataSource.query(`
      CREATE FUNCTION reject_google_identity_insert() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced identity insertion failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_google_identity_insert
      BEFORE INSERT ON external_identities
      FOR EACH ROW EXECUTE FUNCTION reject_google_identity_insert();
    `);
    try {
      await expect(
        service.resolveAndRecordAuthentication(
          input('rollback-identity@cloudfabrix.com', 'rollback-identity'),
        ),
      ).rejects.toThrow('Google identity persistence failed');
    } finally {
      await testDataSource.query(`
        DROP TRIGGER reject_google_identity_insert ON external_identities;
        DROP FUNCTION reject_google_identity_insert();
      `);
    }

    await expect(count('users')).resolves.toBe(0);
    await expect(count('external_identities')).resolves.toBe(0);
  });

  it('rolls back user, identity, and metadata when lastLoginAt update fails', async () => {
    await testDataSource.query(`
      CREATE FUNCTION reject_last_login_update() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced last login update failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_last_login_update
      BEFORE UPDATE OF last_login_at ON users
      FOR EACH ROW EXECUTE FUNCTION reject_last_login_update();
    `);
    try {
      await expect(
        service.resolveAndRecordAuthentication(
          input('rollback-login@cloudfabrix.com', 'rollback-login'),
        ),
      ).rejects.toThrow('Google identity persistence failed');
    } finally {
      await testDataSource.query(`
        DROP TRIGGER reject_last_login_update ON users;
        DROP FUNCTION reject_last_login_update();
      `);
    }

    await expect(count('users')).resolves.toBe(0);
    await expect(count('external_identities')).resolves.toBe(0);
  });

  async function applySql(relativePath: string) {
    await testDataSource.query(
      readFileSync(join(sqlRoot, relativePath), 'utf8'),
    );
  }

  async function count(
    table: 'external_identities' | 'project_members' | 'users',
  ) {
    const result = await testDataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::int AS count FROM ${table}`,
    );
    return result[0].count;
  }

  function rows(table: 'external_identities' | 'users') {
    return testDataSource.query<Array<Record<string, unknown>>>(
      `SELECT * FROM ${table}`,
    );
  }
});

function input(
  normalizedEmail: string,
  subject: string,
  firstName: string | null = 'Ada',
  lastName: string | null = 'Lovelace',
) {
  return {
    firstName,
    issuer,
    lastName,
    normalizedEmail,
    subject,
  };
}
