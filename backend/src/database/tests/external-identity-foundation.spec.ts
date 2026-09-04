import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';
import {
  ExternalIdentityProvider,
  externalIdentityProviders,
} from '../../common/enums/external-identity-provider.enum';
import { ExternalIdentity } from '../../modules/users/entities/external-identity.entity';
import { User } from '../../modules/users/entities/user.entity';

const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '040_stab_iam_005_external_identity_foundation.sql',
);

describe('external identity persistence foundation', () => {
  const migrationSql = readFileSync(migrationPath, 'utf8');

  it('preflights normalized email collisions before changing the schema', () => {
    const collisionCheck = migrationSql.indexOf('GROUP BY lower(email)');
    const passwordChange = migrationSql.indexOf(
      'ALTER COLUMN password_hash DROP NOT NULL',
    );
    const normalizedEmailIndex = migrationSql.indexOf(
      'idx_users_email_normalized_unique',
    );

    expect(collisionCheck).toBeGreaterThan(-1);
    expect(collisionCheck).toBeLessThan(passwordChange);
    expect(collisionCheck).toBeLessThan(normalizedEmailIndex);
    expect(migrationSql).toContain(
      'Cannot enforce normalized user email uniqueness: case-colliding user emails exist',
    );
  });

  it('defines database constraints for identities, service passwords, and normalized email', () => {
    expect(migrationSql).toMatch(
      /CONSTRAINT fk_external_identities_user[\s\S]*ON DELETE CASCADE/,
    );
    expect(migrationSql).toContain(
      'CONSTRAINT uq_external_identities_issuer_subject',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT uq_external_identities_user_provider',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT chk_users_service_password_required',
    );
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX idx_users_email_normalized_unique\s+ON users \(lower\(email\)\)/,
    );
  });

  it('maps the external identity entity to the persistence model', () => {
    const table = getMetadataArgsStorage().tables.find(
      ({ target }) => target === ExternalIdentity,
    );
    const columns = getMetadataArgsStorage().columns.filter(
      ({ target }) => target === ExternalIdentity,
    );
    const uniqueConstraints = getMetadataArgsStorage().uniques.filter(
      ({ target }) => target === ExternalIdentity,
    );

    expect(table?.name).toBe('external_identities');
    expect(columns.map(({ propertyName }) => propertyName)).toEqual(
      expect.arrayContaining([
        'userId',
        'provider',
        'issuer',
        'subject',
        'emailAtLastAuthentication',
        'lastAuthenticatedAt',
      ]),
    );
    expect(uniqueConstraints.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'uq_external_identities_issuer_subject',
        'uq_external_identities_user_provider',
      ]),
    );
  });

  it('makes passwords nullable in the entity without changing identity types', () => {
    const passwordColumn = getMetadataArgsStorage().columns.find(
      ({ propertyName, target }) =>
        target === User && propertyName === 'passwordHash',
    );

    expect(passwordColumn?.options).toEqual(
      expect.objectContaining({
        name: 'password_hash',
        nullable: true,
        select: false,
      }),
    );
    expect(externalIdentityProviders).toEqual([
      ExternalIdentityProvider.Google,
    ]);
  });
});
