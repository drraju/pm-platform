import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bootstrapEmail = 'admin@example.com';
const compromisedHash =
  '$2b$10$/BQx.Mv5F6ShmB3JqGxcxOOZkn1uk5bAWhW2yeQwVja2B/KUKfcty';
const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '037_stab_sec_002_bootstrap_credential_remediation.sql',
);

type UserRecord = {
  email: string;
  passwordHash: string;
  status: string;
};

describe('bootstrap credential remediation migration', () => {
  it('neutralizes the compromised active bootstrap account', () => {
    const [user] = applyRemediation([
      userRecord(bootstrapEmail, compromisedHash, 'active'),
    ]);

    expect(user).toEqual(
      userRecord(bootstrapEmail, compromisedHash, 'disabled'),
    );
  });

  it('preserves an administrator that has changed the password', () => {
    const changedHash = '$2b$10$legitimately-changed-password-hash';
    const [user] = applyRemediation([
      userRecord(bootstrapEmail, changedHash, 'active'),
    ]);

    expect(user).toEqual(userRecord(bootstrapEmail, changedHash, 'active'));
  });

  it('is harmless when the bootstrap account does not exist', () => {
    expect(applyRemediation([])).toEqual([]);
  });

  it('uses the exact compromised predicate without creating a replacement credential', () => {
    const migrationSql = readFileSync(migrationPath, 'utf8');

    expect(migrationSql).toContain("SET status = 'disabled'");
    expect(migrationSql).toContain(`WHERE email = '${bootstrapEmail}'`);
    expect(migrationSql).toContain(`AND password_hash = '${compromisedHash}'`);
    expect(migrationSql).not.toMatch(/\bINSERT\s+INTO\s+users\b/i);
    expect(migrationSql).not.toMatch(/\bSET\s+password_hash\b/i);
  });
});

function applyRemediation(users: UserRecord[]): UserRecord[] {
  return users.map((user) =>
    user.email === bootstrapEmail && user.passwordHash === compromisedHash
      ? { ...user, status: 'disabled' }
      : user,
  );
}

function userRecord(
  email: string,
  passwordHash: string,
  status: string,
): UserRecord {
  return { email, passwordHash, status };
}
