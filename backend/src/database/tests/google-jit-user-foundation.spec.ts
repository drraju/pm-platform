import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';

const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '041_stab_iam_006_google_jit_nullable_user_names.sql',
);

describe('Google JIT user foundation', () => {
  const migrationSql = readFileSync(migrationPath, 'utf8');

  it('changes only first and last name nullability', () => {
    expect(migrationSql.trim()).toBe(
      `ALTER TABLE users
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL;`,
    );
  });

  it.each(['firstName', 'lastName'])(
    'maps %s to a nullable database column',
    (propertyName) => {
      const column = getMetadataArgsStorage().columns.find(
        (candidate) =>
          candidate.target === User && candidate.propertyName === propertyName,
      );

      expect(column?.options.nullable).toBe(true);
      expect(column?.options.type).toBe('varchar');
    },
  );
});
