/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Repository } from 'typeorm';
import { ExternalIdentityProvider } from '../../../common/enums/external-identity-provider.enum';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ExternalIdentity } from '../entities/external-identity.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import {
  GoogleIdentityLinkingPersistenceError,
  GoogleIdentityLinkingRejectedError,
  GoogleIdentityLinkingService,
} from '../google-identity-linking.service';

const input = {
  issuer: 'https://accounts.google.com',
  normalizedEmail: 'person@example.com',
  subject: 'google-subject',
};

type HarnessOptions = {
  beforeInsert?: (harness: PersistenceHarness) => void | Promise<void>;
  failUserUpdate?: boolean;
  identities?: ExternalIdentity[];
  roles?: Role[];
  users?: User[];
};

class PersistenceHarness {
  identities: ExternalIdentity[];
  roles: Role[];
  users: User[];
  readonly insertAttempts: Array<Partial<ExternalIdentity>> = [];
  readonly manager: any;
  readonly repository: Repository<User>;

  constructor(private readonly options: HarnessOptions = {}) {
    this.identities = [...(options.identities ?? [])];
    this.roles = [...(options.roles ?? [humanRole()])];
    this.users = [...(options.users ?? [humanUser()])];

    const manager: any = {
      createQueryBuilder: jest.fn((entity?: unknown) =>
        entity === User ? this.userLookupBuilder() : this.insertBuilder(),
      ),
      findOne: jest.fn((entity: unknown, findOptions: any) => {
        if (entity === User) {
          return Promise.resolve(
            this.users.find(({ id }) => id === findOptions.where.id) ?? null,
          );
        }
        if (entity === Role) {
          return Promise.resolve(
            this.roles.find(({ id }) => id === findOptions.where.id) ?? null,
          );
        }
        if (entity === ExternalIdentity) {
          const where = findOptions.where;
          return Promise.resolve(
            this.identities.find(
              (identity) =>
                (where.issuer === undefined ||
                  identity.issuer === where.issuer) &&
                (where.subject === undefined ||
                  identity.subject === where.subject) &&
                (where.provider === undefined ||
                  identity.provider === where.provider) &&
                (where.userId === undefined ||
                  identity.userId === where.userId),
            ) ?? null,
          );
        }
        return Promise.resolve(null);
      }),
      update: jest.fn(
        async (entity: unknown, criteria: { id: string }, changes: any) => {
          if (entity === User && this.options.failUserUpdate) {
            throw new Error('database unavailable');
          }
          const rows = entity === User ? this.users : this.identities;
          const row = rows.find(({ id }) => id === criteria.id);
          if (!row) {
            return { affected: 0 };
          }
          Object.assign(row, changes);
          return { affected: 1 };
        },
      ),
    };
    manager.transaction = jest.fn(async (work: (manager: any) => unknown) => {
      const usersSnapshot = this.users.map((user) => ({ ...user }) as User);
      const identitiesSnapshot = this.identities.map(
        (identity) => ({ ...identity }) as ExternalIdentity,
      );
      try {
        return await work(manager);
      } catch (error) {
        this.users = usersSnapshot;
        this.identities = identitiesSnapshot;
        throw error;
      }
    });
    this.manager = manager;
    this.repository = { manager } as Repository<User>;
  }

  private userLookupBuilder() {
    let normalizedEmail = '';
    const builder: any = {
      getOne: jest.fn(() =>
        Promise.resolve(
          this.users.find(
            ({ email }) => email.toLowerCase() === normalizedEmail,
          ) ?? null,
        ),
      ),
      select: jest.fn(),
      setLock: jest.fn(),
      where: jest.fn(
        (_sql: string, parameters: { normalizedEmail: string }) => {
          normalizedEmail = parameters.normalizedEmail;
          return builder;
        },
      ),
    };
    builder.select.mockReturnValue(builder);
    builder.setLock.mockReturnValue(builder);
    return builder;
  }

  private insertBuilder() {
    let values: Partial<ExternalIdentity> = {};
    const builder: any = {
      execute: jest.fn(async () => {
        await this.options.beforeInsert?.(this);
        this.insertAttempts.push(values);
        const conflicts = this.identities.some(
          (identity) =>
            (identity.issuer === values.issuer &&
              identity.subject === values.subject) ||
            (identity.userId === values.userId &&
              identity.provider === values.provider),
        );
        if (!conflicts) {
          this.identities.push(
            Object.assign(new ExternalIdentity(), values, {
              id: `identity-${this.identities.length + 1}`,
            }),
          );
        }
        return { identifiers: [] };
      }),
      insert: jest.fn(),
      into: jest.fn(),
      orIgnore: jest.fn(),
      values: jest.fn((nextValues: Partial<ExternalIdentity>) => {
        values = nextValues;
        return builder;
      }),
    };
    builder.insert.mockReturnValue(builder);
    builder.into.mockReturnValue(builder);
    builder.orIgnore.mockReturnValue(builder);
    return builder;
  }
}

function humanRole(overrides: Partial<Role> = {}): Role {
  return Object.assign(new Role(), {
    id: 'role-human',
    name: UserRole.TeamMember,
    ...overrides,
  });
}

function humanUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    email: 'Person@Example.com',
    id: 'user-1',
    identityType: UserIdentityType.Human,
    passwordChangedAt: new Date('2026-08-01T10:00:00.000Z'),
    passwordHash: 'preserved-password-hash',
    projectMemberships: [{ id: 'membership-1' }],
    roleId: 'role-human',
    status: 'active',
    ...overrides,
  });
}

function googleIdentity(
  overrides: Partial<ExternalIdentity> = {},
): ExternalIdentity {
  return Object.assign(new ExternalIdentity(), {
    emailAtLastAuthentication: 'old@example.com',
    id: 'identity-1',
    issuer: input.issuer,
    lastAuthenticatedAt: new Date('2026-08-01T09:00:00.000Z'),
    provider: ExternalIdentityProvider.Google,
    subject: input.subject,
    userId: 'user-1',
    ...overrides,
  });
}

describe('GoogleIdentityLinkingService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses an existing issuer and subject as authoritative after an email change', async () => {
    const linkedUser = humanUser({ email: 'current-pm@example.com' });
    const emailMatch = humanUser({
      email: input.normalizedEmail,
      id: 'user-2',
    });
    const harness = new PersistenceHarness({
      identities: [googleIdentity()],
      users: [linkedUser, emailMatch],
    });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).resolves.toEqual({
      principal: {
        email: 'current-pm@example.com',
        id: 'user-1',
        identityType: UserIdentityType.Human,
        passwordChangedAt: linkedUser.passwordChangedAt,
        roleId: 'role-human',
      },
      status: 'active',
    });
    expect(harness.insertAttempts).toHaveLength(0);
    expect(harness.identities[0]).toMatchObject({
      emailAtLastAuthentication: input.normalizedEmail,
      userId: 'user-1',
    });
    expect(harness.users[0].lastLoginAt).toEqual(
      new Date('2026-09-04T12:00:00.000Z'),
    );
  });

  it('links a case-insensitive existing HUMAN and preserves protected state', async () => {
    const user = humanUser({ status: 'first_login_pending' });
    const original = {
      passwordHash: user.passwordHash,
      projectMemberships: user.projectMemberships,
      roleId: user.roleId,
      status: user.status,
    };
    const harness = new PersistenceHarness({ users: [user] });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'first_login_pending' }),
    );
    expect(harness.identities).toEqual([
      expect.objectContaining({
        emailAtLastAuthentication: input.normalizedEmail,
        issuer: input.issuer,
        provider: ExternalIdentityProvider.Google,
        subject: input.subject,
        userId: user.id,
      }),
    ]);
    expect(harness.identities[0].lastAuthenticatedAt).toEqual(
      new Date('2026-09-04T12:00:00.000Z'),
    );
    expect(user.lastLoginAt).toEqual(new Date('2026-09-04T12:00:00.000Z'));
    expect(user).toMatchObject(original);
  });

  it.each([
    ['missing linked user', [], [humanRole()]],
    [
      'linked SERVICE user',
      [humanUser({ identityType: UserIdentityType.Service })],
      [humanRole()],
    ],
    [
      'disabled linked user',
      [humanUser({ status: 'disabled' })],
      [humanRole()],
    ],
    [
      'linked HUMAN with an invalid role',
      [humanUser()],
      [humanRole({ name: UserRole.ServiceUser })],
    ],
  ])('revalidates and rejects a %s', async (_label, users, roles) => {
    const harness = new PersistenceHarness({
      identities: [googleIdentity()],
      roles,
      users,
    });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
    expect(harness.identities[0]).toMatchObject({
      emailAtLastAuthentication: 'old@example.com',
    });
    expect(harness.manager.update).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown user', [], [humanRole()]],
    [
      'SERVICE user',
      [humanUser({ identityType: UserIdentityType.Service })],
      [humanRole()],
    ],
    ['disabled user', [humanUser({ status: 'disabled' })], [humanRole()]],
    [
      'invalid HUMAN role',
      [humanUser()],
      [humanRole({ name: UserRole.ServiceUser })],
    ],
    ['missing HUMAN role', [humanUser()], []],
  ])(
    'safely rejects an ineligible candidate: %s',
    async (_label, users, roles) => {
      const harness = new PersistenceHarness({ roles, users });
      const service = new GoogleIdentityLinkingService(harness.repository);

      await expect(
        service.resolveAndRecordAuthentication(input),
      ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
      expect(harness.identities).toHaveLength(0);
    },
  );

  it('accepts active and first_login_pending HUMAN statuses', async () => {
    for (const status of ['active', 'first_login_pending']) {
      const harness = new PersistenceHarness({
        users: [humanUser({ status })],
      });
      const service = new GoogleIdentityLinkingService(harness.repository);

      await expect(
        service.resolveAndRecordAuthentication(input),
      ).resolves.toMatchObject({ status });
    }
  });

  it('rejects a different Google identity already linked to the PM user', async () => {
    const harness = new PersistenceHarness({
      identities: [googleIdentity({ subject: 'different-subject' })],
    });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
    expect(harness.insertAttempts).toHaveLength(0);
  });

  it('accepts an identical mapping created by a concurrent attempt', async () => {
    const harness = new PersistenceHarness({
      beforeInsert: (state) => state.identities.push(googleIdentity()),
    });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).resolves.toMatchObject({ principal: { id: 'user-1' } });
    expect(harness.identities).toHaveLength(1);
  });

  it('rejects a subject concurrently linked to a competing user', async () => {
    const harness = new PersistenceHarness({
      beforeInsert: (state) =>
        state.identities.push(googleIdentity({ userId: 'user-2' })),
    });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingRejectedError);
    expect(harness.users[0].lastLoginAt).toBeUndefined();
  });

  it('rolls back metadata when an unexpected database update fails', async () => {
    const originalAuthenticatedAt = new Date('2026-08-01T09:00:00.000Z');
    const harness = new PersistenceHarness({
      failUserUpdate: true,
      identities: [
        googleIdentity({ lastAuthenticatedAt: originalAuthenticatedAt }),
      ],
    });
    const service = new GoogleIdentityLinkingService(harness.repository);

    await expect(
      service.resolveAndRecordAuthentication(input),
    ).rejects.toBeInstanceOf(GoogleIdentityLinkingPersistenceError);
    expect(harness.identities[0]).toMatchObject({
      emailAtLastAuthentication: 'old@example.com',
      lastAuthenticatedAt: originalAuthenticatedAt,
    });
    expect(harness.users[0].lastLoginAt).toBeUndefined();
  });
});
