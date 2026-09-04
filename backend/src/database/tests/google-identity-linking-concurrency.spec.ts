/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { ExternalIdentityProvider } from '../../common/enums/external-identity-provider.enum';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { ExternalIdentity } from '../../modules/users/entities/external-identity.entity';
import { Role } from '../../modules/users/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import {
  GoogleIdentityLinkingRejectedError,
  GoogleIdentityLinkingService,
} from '../../modules/users/google-identity-linking.service';

const servicePath = join(
  __dirname,
  '..',
  '..',
  'modules',
  'users',
  'google-identity-linking.service.ts',
);
const request = {
  issuer: 'https://accounts.google.com',
  normalizedEmail: 'person@example.com',
  subject: 'subject-one',
};

function user(id = 'user-1', email = 'person@example.com'): User {
  return Object.assign(new User(), {
    email,
    id,
    identityType: UserIdentityType.Human,
    passwordChangedAt: null,
    roleId: 'role-human',
    status: 'active',
  });
}

function identity(
  subject = request.subject,
  userId = 'user-1',
): ExternalIdentity {
  return Object.assign(new ExternalIdentity(), {
    emailAtLastAuthentication: request.normalizedEmail,
    id: `${userId}-${subject}`,
    issuer: request.issuer,
    lastAuthenticatedAt: new Date(),
    provider: ExternalIdentityProvider.Google,
    subject,
    userId,
  });
}

function raceManager(
  externalFindResults: Array<ExternalIdentity | null>,
  candidate = user(),
) {
  const insert = {
    execute: jest.fn().mockResolvedValue({ identifiers: [] }),
    insert: jest.fn(),
    into: jest.fn(),
    orIgnore: jest.fn(),
    values: jest.fn(),
  } as any;
  insert.insert.mockReturnValue(insert);
  insert.into.mockReturnValue(insert);
  insert.orIgnore.mockReturnValue(insert);
  insert.values.mockReturnValue(insert);

  const userLookup = {
    getOne: jest.fn().mockResolvedValue(candidate),
    select: jest.fn(),
    setLock: jest.fn(),
    where: jest.fn(),
  } as any;
  userLookup.select.mockReturnValue(userLookup);
  userLookup.setLock.mockReturnValue(userLookup);
  userLookup.where.mockReturnValue(userLookup);

  const manager: any = {
    createQueryBuilder: jest.fn((entity?: unknown) =>
      entity === User ? userLookup : insert,
    ),
    findOne: jest.fn((entity: unknown) => {
      if (entity === ExternalIdentity) {
        return Promise.resolve(externalFindResults.shift() ?? null);
      }
      if (entity === Role) {
        return Promise.resolve(
          Object.assign(new Role(), {
            id: 'role-human',
            name: UserRole.TeamMember,
          }),
        );
      }
      return Promise.resolve(candidate);
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  manager.transaction = jest.fn((work: (entityManager: any) => unknown) =>
    work(manager),
  );
  return { insert, manager };
}

describe('Google identity PostgreSQL race reconciliation', () => {
  it('uses ON CONFLICT DO NOTHING so a uniqueness race does not abort the transaction', () => {
    const source = readFileSync(servicePath, 'utf8');

    expect(source).toContain('.orIgnore()');
    expect(source).not.toMatch(/catch[\s\S]{0,200}23505/);
  });

  it('treats the winner of an identical concurrent insert as idempotent', async () => {
    const winner = identity();
    const { insert, manager } = raceManager([null, null, null, winner, winner]);
    const service = new GoogleIdentityLinkingService({
      manager,
    } as Repository<User>);

    await expect(
      service.resolveAndRecordAuthentication(request),
    ).resolves.toMatchObject({ principal: { id: 'user-1' } });
    expect(insert.orIgnore).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledTimes(2);
  });

  it('rejects different subjects racing for the same PM user', async () => {
    const differentIdentity = identity('subject-two');
    const { insert, manager } = raceManager([null, null, differentIdentity]);
    const service = new GoogleIdentityLinkingService({
      manager,
    } as Repository<User>);

    await expect(
      service.resolveAndRecordAuthentication(request),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
    expect(insert.execute).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects the post-insert winner when the subject belongs to another user', async () => {
    const competingWinner = identity(request.subject, 'user-2');
    const { manager } = raceManager([null, null, null, competingWinner, null]);
    const service = new GoogleIdentityLinkingService({
      manager,
    } as Repository<User>);

    await expect(
      service.resolveAndRecordAuthentication(request),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects inconsistent pre-existing mappings without partial metadata', async () => {
    const { manager } = raceManager([
      null,
      identity(request.subject, 'user-2'),
      identity('subject-two', 'user-1'),
    ]);
    const service = new GoogleIdentityLinkingService({
      manager,
    } as Repository<User>);

    await expect(
      service.resolveAndRecordAuthentication(request),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
    expect(manager.update).not.toHaveBeenCalled();
  });
});
