import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';
import {
  UserIdentityType,
  userIdentityTypes,
} from '../../common/enums/user-identity-type.enum';
import { CreateUserDto } from '../../modules/users/dto/create-user.dto';
import { UpdateUserDto } from '../../modules/users/dto/update-user.dto';
import { User } from '../../modules/users/entities/user.entity';

const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '038_stab_iam_003_user_identity_foundation.sql',
);

describe('user identity foundation', () => {
  const migrationSql = readFileSync(migrationPath, 'utf8');

  it('defines HUMAN and SERVICE as the only identity values', () => {
    expect(userIdentityTypes).toEqual([
      UserIdentityType.Human,
      UserIdentityType.Service,
    ]);
    expect(migrationSql).toMatch(
      /CREATE TYPE user_identity_type AS ENUM \('HUMAN', 'SERVICE'\)/,
    );
  });

  it('backfills existing users to HUMAN before enforcing non-null identity', () => {
    expect(migrationSql).toMatch(
      /UPDATE users\s+SET identity_type = 'HUMAN'::user_identity_type\s+WHERE identity_type IS NULL/,
    );
    expect(migrationSql).toMatch(
      /ALTER COLUMN identity_type SET DEFAULT 'HUMAN'::user_identity_type/,
    );
    expect(migrationSql).toMatch(/ALTER COLUMN identity_type SET NOT NULL/);
  });

  it('maps the entity identityType to the durable non-null database enum', () => {
    const identityColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === User && column.propertyName === 'identityType',
    );

    expect(identityColumn?.options).toEqual(
      expect.objectContaining({
        default: UserIdentityType.Human,
        enum: UserIdentityType,
        enumName: 'user_identity_type',
        name: 'identity_type',
        type: 'enum',
      }),
    );
    expect(identityColumn?.options.nullable).not.toBe(true);
  });

  it('represents a SERVICE principal without requiring a separate auth model', () => {
    const user = Object.assign(new User(), {
      email: 'automation@example.com',
      firstName: 'Release',
      identityType: UserIdentityType.Service,
      lastName: 'Automation',
    });

    expect(user).toBeInstanceOf(User);
    expect(user.identityType).toBe(UserIdentityType.Service);
  });

  it.each([
    [
      CreateUserDto,
      {
        email: 'human@example.com',
        firstName: 'Human',
        identityType: UserIdentityType.Service,
        lastName: 'User',
        password: 'TemporaryPass1!',
        roleId: '1251272e-7733-4d6a-835c-9bd20f4d4643',
      },
    ],
    [UpdateUserDto, { identityType: UserIdentityType.Service }],
  ])('rejects identityType supplied to %p', async (Dto, input) => {
    const errors = await validate(plainToInstance(Dto, input), {
      forbidNonWhitelisted: true,
      whitelist: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'identityType' }),
      ]),
    );
  });

  it('does not alter credentials, roles, permissions, or memberships', () => {
    expect(migrationSql).not.toMatch(/password_hash|role_id|permissions/i);
    expect(migrationSql).not.toMatch(/project_members|project_memberships/i);
  });
});
