import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
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
  let permissionsRepository: MockRepository<Permission>;
  let usersRepository: MockRepository<User>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let authorizationPolicyService: {
    canManageRolePermissions: jest.Mock;
    canManageRoles: jest.Mock;
    canManageProject: jest.Mock;
    canViewProject: jest.Mock;
    hasAnyPermission: jest.Mock;
    isExternalActor: jest.Mock;
  };
  const actor = {
    email: 'pm@example.com',
    roleId: 'role-project-manager',
    userId: 'pm-1',
  };

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
      create: jest.fn((input: Partial<Role>) => input),
      findOne: jest.fn().mockResolvedValue({
        id: 'role-1',
        name: UserRole.TeamMember,
      }),
      save: jest.fn((input: Role) => Promise.resolve(input)),
    };
    permissionsRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    projectMembersRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    authorizationPolicyService = {
      canManageRolePermissions: jest.fn().mockResolvedValue(false),
      canManageRoles: jest.fn().mockResolvedValue(false),
      canManageProject: jest.fn().mockResolvedValue(true),
      canViewProject: jest.fn().mockResolvedValue(true),
      hasAnyPermission: jest.fn().mockResolvedValue(true),
      isExternalActor: jest.fn().mockResolvedValue(false),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionsRepository,
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicyService,
        },
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

    const result = await service.findAssignableUsers(actor);

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
    ['Customer', 'customer-role', 'customer-1'],
    ['Partner', 'partner-role', 'partner-1'],
  ])(
    'denies assignable-user discovery to %s actors',
    async (_audience, roleId, externalUserId) => {
      authorizationPolicyService.isExternalActor.mockResolvedValueOnce(true);

      await expect(
        service.findAssignableUsers(
          { roleId, userId: externalUserId },
          'project-1',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepository.find).not.toHaveBeenCalled();
    },
  );

  it('scopes assignable users to project members for read-only actors', async () => {
    authorizationPolicyService.canManageProject.mockResolvedValueOnce(false);
    projectMembersRepository.find?.mockResolvedValue([
      { projectId: 'project-1', userId: 'member-1' },
    ]);
    usersRepository.find?.mockResolvedValue([
      {
        email: 'member@example.com',
        firstName: 'Project',
        id: 'member-1',
        lastName: 'Member',
        role: { id: 'role-team', name: UserRole.TeamMember },
        roleId: 'role-team',
        status: 'active',
      },
    ]);

    await expect(
      service.findAssignableUsers(actor, 'project-1'),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'member-1', role: UserRole.TeamMember }),
    ]);
    expect(projectMembersRepository.find).toHaveBeenCalledWith({
      select: { userId: true },
      where: { projectId: 'project-1' },
    });
    expect(authorizationPolicyService.canViewProject).toHaveBeenCalledWith(
      'project-1',
      actor,
    );
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

  it('allows a Platform Admin to create a global role', async () => {
    const platformAdmin = {
      roleId: 'role-platform-admin',
      userId: 'admin-1',
    };
    const input = {
      description: 'Analytics metadata role',
      name: 'ANALYTICS_METADATA',
    };
    authorizationPolicyService.canManageRoles.mockResolvedValueOnce(true);

    await expect(service.createRole(input, platformAdmin)).resolves.toEqual({
      description: input.description,
      id: undefined,
      name: input.name,
      permissions: [],
    });
    expect(authorizationPolicyService.canManageRoles).toHaveBeenCalledWith(
      platformAdmin,
    );
    expect(rolesRepository.create).toHaveBeenCalledWith(input);
    expect(rolesRepository.save).toHaveBeenCalledWith(input);
  });

  it.each([
    UserRole.Executive,
    UserRole.PortfolioManager,
    UserRole.ProjectManager,
    UserRole.TeamMember,
    UserRole.Customer,
    UserRole.Partner,
  ])(
    'denies %s creation of a privileged global role before persistence',
    async (roleName) => {
      const nonAdmin = {
        roleId: `role-${roleName}`,
        userId: 'non-admin-1',
      };

      await expect(
        service.createRole(
          {
            description: 'Attempted privileged role',
            name: UserRole.PlatformAdmin,
          },
          nonAdmin,
        ),
      ).rejects.toThrow('Insufficient permissions');
      expect(authorizationPolicyService.canManageRoles).toHaveBeenCalledWith(
        nonAdmin,
      );
      expect(rolesRepository.create).not.toHaveBeenCalled();
      expect(rolesRepository.save).not.toHaveBeenCalled();
    },
  );

  it('allows a Platform Admin to update role permissions', async () => {
    const platformAdmin = {
      roleId: 'role-platform-admin',
      userId: 'admin-1',
    };
    const targetRole = {
      description: 'Executive role',
      id: 'role-executive',
      name: UserRole.Executive,
      permissions: [],
    } as Role;
    const permission = {
      description: 'Manage role permissions',
      id: 'permission-manage',
      key: 'permission.manage',
    } as Permission;
    authorizationPolicyService.canManageRolePermissions.mockResolvedValueOnce(
      true,
    );
    rolesRepository.findOne?.mockResolvedValueOnce(targetRole);
    permissionsRepository.find?.mockResolvedValueOnce([permission]);

    await expect(
      service.updateRolePermissions(
        targetRole.id,
        { permissionKeys: [permission.key] },
        platformAdmin,
      ),
    ).resolves.toEqual({
      description: targetRole.description,
      id: targetRole.id,
      name: targetRole.name,
      permissions: [
        {
          description: permission.description,
          id: permission.id,
          key: permission.key,
        },
      ],
    });
    expect(
      authorizationPolicyService.canManageRolePermissions,
    ).toHaveBeenCalledWith(platformAdmin);
    expect(rolesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: [permission] }),
    );
  });

  it.each([
    [UserRole.Executive, 'role-executive', 'role-executive'],
    [UserRole.PortfolioManager, 'role-portfolio-manager', 'role-other'],
    [UserRole.ProjectManager, 'role-project-manager', 'role-platform-admin'],
    [UserRole.TeamMember, 'role-team-member', 'role-other'],
    [UserRole.Customer, 'role-customer', 'role-other'],
    [UserRole.Partner, 'role-partner', 'role-other'],
  ])(
    'denies %s role-permission changes before persistence',
    async (_roleName, actorRoleId, targetRoleId) => {
      const nonAdmin = {
        roleId: actorRoleId,
        userId: 'non-admin-1',
      };

      await expect(
        service.updateRolePermissions(
          targetRoleId,
          {
            permissionKeys: ['permission.manage', 'role.manage', 'user.manage'],
          },
          nonAdmin,
        ),
      ).rejects.toThrow('Insufficient permissions');
      expect(
        authorizationPolicyService.canManageRolePermissions,
      ).toHaveBeenCalledWith(nonAdmin);
      expect(rolesRepository.findOne).not.toHaveBeenCalled();
      expect(permissionsRepository.find).not.toHaveBeenCalled();
      expect(rolesRepository.save).not.toHaveBeenCalled();
    },
  );
});
