import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { Role } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { AuthorizationService } from '../authorization.service';
import { PermissionKey } from '../permissions';

describe('AuthorizationService', () => {
  const userId = 'user-1';
  const projectId = 'project-1';
  const roleId = 'role-1';
  let usersRepository: { findOne: jest.Mock };
  let rolesRepository: { findOne: jest.Mock };
  let projectsRepository: { find: jest.Mock; findOne: jest.Mock };
  let projectMembersRepository: { find: jest.Mock; findOne: jest.Mock };
  let service: AuthorizationService;

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        email: 'project.manager@example.com',
        roleId,
        status: 'active',
        role: {
          id: roleId,
          name: 'Project Manager',
          permissions: [],
        },
      }),
    };
    rolesRepository = { findOne: jest.fn() };
    projectsRepository = {
      find: jest.fn().mockResolvedValue([{ id: projectId }]),
      findOne: jest
        .fn()
        .mockResolvedValue({ id: projectId, ownerId: 'owner-1' }),
    };
    projectMembersRepository = {
      find: jest.fn().mockResolvedValue([{ projectId }]),
      findOne: jest.fn().mockResolvedValue({
        id: 'membership-1',
        role: ProjectRole.Manager,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthorizationService);
  });

  it('returns default permissions for existing seeded roles', async () => {
    const user = await service.getEffectiveUser(userId);

    expect(user.roleName).toBe('Project Manager');
    expect(user.permissions).toEqual(
      expect.arrayContaining([
        PermissionKey.DashboardReadSelf,
        PermissionKey.ProjectsReadAssigned,
        PermissionKey.ProjectMembersManage,
        PermissionKey.ProjectTasksCreate,
        PermissionKey.RaidCreate,
      ]),
    );
    expect(user.permissions).not.toContain(PermissionKey.PortfolioSummaryRead);
  });

  it('uses persisted role permissions when configured through administration', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'project.manager@example.com',
      roleId,
      status: 'active',
      role: {
        id: roleId,
        name: 'Project Manager',
        permissions: [{ key: PermissionKey.PortfolioSummaryRead }],
      },
    });

    const user = await service.getEffectiveUser(userId);

    expect(user.permissions).toContain(PermissionKey.PortfolioSummaryRead);
    expect(user.permissions).not.toContain(PermissionKey.ProjectsReadAssigned);
  });

  it('blocks inactive users', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'inactive@example.com',
      roleId,
      status: 'inactive',
      role: {
        id: roleId,
        name: 'Project Manager',
        permissions: [],
      },
    });

    await expect(service.getEffectiveUser(userId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows project access for project members', async () => {
    const user = await service.getEffectiveUser(userId);

    await expect(
      service.assertCanReadProject(user, projectId),
    ).resolves.toBeUndefined();
  });

  it('rejects project access for non-members without portfolio permission', async () => {
    projectMembersRepository.findOne.mockResolvedValueOnce(null);
    const user = await service.getEffectiveUser(userId);

    await expect(
      service.assertCanReadProject(user, projectId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns null accessible project ids for global project readers', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'program.manager@example.com',
      roleId,
      status: 'active',
      role: {
        id: roleId,
        name: 'Program Manager',
        permissions: [],
      },
    });

    const user = await service.getEffectiveUser(userId);

    await expect(service.getAccessibleProjectIds(user)).resolves.toBeNull();
  });

  it('grants portfolio-level permissions to portfolio managers', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'portfolio.manager@example.com',
      roleId,
      status: 'active',
      role: {
        id: roleId,
        name: 'Portfolio Manager',
        permissions: [],
      },
    });

    const user = await service.getEffectiveUser(userId);

    expect(user.permissions).toEqual(
      expect.arrayContaining([
        PermissionKey.ExecutiveSummaryRead,
        PermissionKey.PortfolioSummaryRead,
        PermissionKey.ProjectsReadAll,
      ]),
    );
  });

  it('limits team members to assigned project execution permissions', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'team.member@example.com',
      roleId,
      status: 'active',
      role: {
        id: roleId,
        name: 'Team Member',
        permissions: [],
      },
    });

    const user = await service.getEffectiveUser(userId);

    expect(user.permissions).toContain(PermissionKey.ProjectsReadAssigned);
    expect(user.permissions).toContain(PermissionKey.ProjectTasksUpdateOwn);
    expect(user.permissions).not.toContain(PermissionKey.PortfolioSummaryRead);
    expect(user.permissions).not.toContain(PermissionKey.ExecutiveSummaryRead);
  });

  it('limits partners to assigned projects and own task work', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'partner@example.com',
      roleId,
      status: 'active',
      role: {
        id: roleId,
        name: 'Partner',
        permissions: [],
      },
    });

    const user = await service.getEffectiveUser(userId);

    expect(user.permissions).toEqual(
      expect.arrayContaining([
        PermissionKey.DashboardReadSelf,
        PermissionKey.ProjectsReadAssigned,
        PermissionKey.ProjectTasksRead,
        PermissionKey.ProjectTasksUpdateOwn,
      ]),
    );
    expect(user.permissions).not.toContain(PermissionKey.PortfolioSummaryRead);
    expect(user.permissions).not.toContain(PermissionKey.ExecutiveSummaryRead);
    expect(user.permissions).not.toContain(PermissionKey.RaidReadAssigned);
  });

  it('limits customers to assigned project read access and task visibility', async () => {
    usersRepository.findOne.mockResolvedValueOnce({
      id: userId,
      email: 'customer@example.com',
      roleId,
      status: 'active',
      role: {
        id: roleId,
        name: 'Customer',
        permissions: [],
      },
    });

    const user = await service.getEffectiveUser(userId);

    expect(user.permissions).toEqual(
      expect.arrayContaining([
        PermissionKey.DashboardReadSelf,
        PermissionKey.ProjectsReadAssigned,
        PermissionKey.ProjectTasksRead,
      ]),
    );
    expect(user.permissions).not.toContain(PermissionKey.ProjectMembersRead);
    expect(user.permissions).not.toContain(PermissionKey.RaidReadAssigned);
    expect(user.permissions).not.toContain(PermissionKey.PortfolioSummaryRead);
    expect(user.permissions).not.toContain(PermissionKey.ExecutiveSummaryRead);
  });
});
