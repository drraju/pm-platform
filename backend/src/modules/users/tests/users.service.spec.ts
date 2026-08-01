import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('UsersService', () => {
  let service: UsersService;
  let rolesRepository: MockRepository<Role>;
  let usersRepository: MockRepository<User>;

  beforeEach(async () => {
    const createUserMock = jest.fn((input: Partial<User>) => input);
    const saveUserMock = jest.fn((input: Partial<User>) =>
      Promise.resolve({ id: 'user-1', ...input }),
    );

    usersRepository = {
      create: createUserMock,
      find: jest.fn(),
      findOne: jest.fn(),
      save: saveUserMock,
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    rolesRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'role-1',
        name: UserRole.TeamMember,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: getRepositoryToken(Permission), useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('does not return passwordHash when creating users', async () => {
    const result = await service.create({
      email: 'user@example.com',
      firstName: 'Ava',
      lastName: 'Patel',
      passwordHash: 'hashed-password',
      roleId: 'role-1',
    });

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Ava',
      lastName: 'Patel',
      role: null,
      roleId: 'role-1',
      accountHistory: [],
      createdAt: undefined,
      lastLoginAt: null,
      status: 'first_login_pending',
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('does not return passwordHash when listing users', async () => {
    usersRepository.find?.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        passwordHash: 'hashed-password',
        roleId: 'role-1',
        createdAt: undefined,
        lastLoginAt: null,
        status: 'active',
        accountHistory: [],
      },
    ]);

    const result = await service.findAll();

    expect(usersRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC', email: 'ASC' },
      relations: { role: { permissions: true } },
    });

    expect(result).toEqual([
      {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        role: null,
        roleId: 'role-1',
        accountHistory: [],
        createdAt: undefined,
        lastLoginAt: null,
        status: 'active',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('returns active assignable users with organisation role names', async () => {
    usersRepository.find?.mockResolvedValue([
      {
        id: 'user-1',
        email: 'ava@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        passwordHash: 'hashed-password',
        role: { id: 'role-1', name: UserRole.ProjectManager },
        roleId: 'role-1',
        status: 'active',
      },
    ]);

    const result = await service.findAssignableUsers();

    expect(usersRepository.find).toHaveBeenCalledWith({
      order: { firstName: 'ASC', lastName: 'ASC', email: 'ASC' },
      relations: { role: true },
      where: { status: 'active' },
    });
    expect(result).toEqual([
      {
        id: 'user-1',
        email: 'ava@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        displayName: 'Ava Patel',
        role: UserRole.ProjectManager,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it.each([
    {
      fromName: UserRole.TeamMember,
      fromRoleId: 'role-team-member',
      toName: UserRole.ProjectManager,
      toRoleId: 'role-project-manager',
    },
    {
      fromName: UserRole.ProjectManager,
      fromRoleId: 'role-project-manager',
      toName: UserRole.PortfolioManager,
      toRoleId: 'role-portfolio-manager',
    },
    {
      fromName: UserRole.PlatformAdmin,
      fromRoleId: 'role-platform-admin',
      toName: UserRole.ProjectManager,
      toRoleId: 'role-project-manager',
    },
  ])(
    'persists role changes from $fromName to $toName',
    async ({ fromName, fromRoleId, toName, toRoleId }) => {
      const existingUser = {
        id: 'user-1',
        email: 'ava@example.com',
        firstName: 'Ava',
        lastName: 'Patel',
        role: { id: fromRoleId, name: fromName },
        roleId: fromRoleId,
        status: 'active',
        accountHistory: [],
      } as User;
      const updatedRole = { id: toRoleId, name: toName } as Role;
      const reloadedUser = {
        ...existingUser,
        role: updatedRole,
        roleId: toRoleId,
      } as User;

      usersRepository.findOne
        ?.mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(reloadedUser);
      rolesRepository.findOne?.mockResolvedValueOnce(updatedRole);

      const result = await service.update('user-1', { roleId: toRoleId });

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accountHistory: expect.arrayContaining([
            expect.objectContaining({ action: 'RoleChanged' }),
          ]),
          id: 'user-1',
          role: updatedRole,
          roleId: toRoleId,
        }),
      );
      expect(usersRepository.findOne).toHaveBeenLastCalledWith({
        where: { id: 'user-1' },
        relations: { role: { permissions: true } },
      });
      expect(result.roleId).toBe(toRoleId);
      expect(result.role?.name).toBe(toName);
    },
  );

  it('rejects unsupported role changes before saving', async () => {
    usersRepository.findOne?.mockResolvedValueOnce({
      id: 'user-1',
      email: 'ava@example.com',
      firstName: 'Ava',
      lastName: 'Patel',
      role: { id: 'role-team-member', name: UserRole.TeamMember },
      roleId: 'role-team-member',
      status: 'active',
      accountHistory: [],
    });
    rolesRepository.findOne?.mockResolvedValueOnce({
      id: 'role-custom',
      name: 'DELIVERY_LEAD',
    });

    await expect(
      service.update('user-1', { roleId: 'role-custom' }),
    ).rejects.toThrow('Role is not supported for user administration');
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('updates password hash and passwordChangedAt together', async () => {
    const passwordChangedAt = new Date('2026-07-26T10:00:00.000Z');

    await service.updatePassword(
      'user-1',
      'new-hashed-password',
      passwordChangedAt,
    );

    expect(usersRepository.update).toHaveBeenCalledWith(
      { id: 'user-1' },
      {
        passwordChangedAt,
        passwordHash: 'new-hashed-password',
      },
    );
  });
});
