import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../enums/project-role.enum';
import { UserRole } from '../enums/user-role.enum';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
import { Role } from '../../modules/users/entities/role.entity';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from './authorization-policy.service';
import { PermissionKey } from './permissions';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const projectId = 'project-1';

const permissionsByRoleName: Record<string, PermissionKey[]> = {
  [UserRole.PlatformAdmin]: Object.values(PermissionKey),
  [UserRole.PortfolioManager]: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
    PermissionKey.ProjectCreate,
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
    PermissionKey.ProjectUpdate,
    PermissionKey.RaidCreate,
    PermissionKey.RaidDelete,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskComment,
    PermissionKey.TaskCreate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskUpdate,
  ],
  [UserRole.Executive]: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
  ],
  [UserRole.ProjectManager]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectCreate,
    PermissionKey.ProjectDelete,
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
    PermissionKey.ProjectUpdate,
    PermissionKey.RaidCreate,
    PermissionKey.RaidDelete,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskComment,
    PermissionKey.TaskCreate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskUpdate,
  ],
  [UserRole.TeamMember]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskComment,
    PermissionKey.TaskReassign,
    PermissionKey.TaskUpdate,
  ],
  [UserRole.Partner]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
    PermissionKey.TaskComment,
    PermissionKey.TaskReassign,
    PermissionKey.TaskUpdate,
  ],
  [UserRole.Customer]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
  ],
};

describe('AuthorizationPolicyService', () => {
  let service: AuthorizationPolicyService;
  let projectsRepository: MockRepository<Project>;
  let projectMembersRepository: MockRepository<ProjectMember>;
  let tasksRepository: MockRepository<Task>;
  let rolesRepository: MockRepository<Role>;
  let projectGovernorAssignments: Set<string>;
  let membershipsByKey: Map<string, ProjectRole>;
  let assignedTaskKeys: Set<string>;
  let permissionOverridesByRoleName: Map<string, PermissionKey[]>;

  beforeEach(async () => {
    projectGovernorAssignments = new Set();
    membershipsByKey = new Map();
    assignedTaskKeys = new Set();
    permissionOverridesByRoleName = new Map();

    projectsRepository = {
      findOne: jest.fn(({ where }) => {
        const whereClauses = Array.isArray(where) ? where : [where];
        const governorFields = [
          'ownerId',
          'businessOwnerId',
          'deliveryLeadId',
          'executiveSponsorId',
        ];
        const matchingClause = whereClauses.find((clause) =>
          governorFields.some((field) => {
            const userId = clause?.[field as keyof typeof clause];
            return (
              clause?.id &&
              userId &&
              projectGovernorAssignments.has(`${clause.id}:${field}:${userId}`)
            );
          }),
        );

        if (matchingClause?.id) {
          return Promise.resolve({ id: matchingClause.id });
        }

        return Promise.resolve(null);
      }),
    };
    projectMembersRepository = {
      findOne: jest.fn(({ where }) => {
        const role = membershipsByKey.get(`${where.projectId}:${where.userId}`);
        return Promise.resolve(
          role ? { id: `${where.projectId}-${where.userId}`, role } : null,
        );
      }),
    };
    tasksRepository = {
      findOne: jest.fn(({ where }) => {
        const key = `${where.projectId}:${where.assigneeId}`;
        return Promise.resolve(
          assignedTaskKeys.has(key) ? { id: 'task-1' } : null,
        );
      }),
    };
    rolesRepository = {
      findOne: jest.fn(({ where }) => {
        const roleName = String(where.id).replace('role-', '');
        const permissionKeys =
          permissionOverridesByRoleName.get(roleName) ??
          permissionsByRoleName[roleName] ??
          [];
        return Promise.resolve({
          id: where.id,
          name: roleName,
          permissions: permissionKeys.map((key) => ({ key })),
        });
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthorizationPolicyService,
        { provide: getRepositoryToken(Project), useValue: projectsRepository },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: projectMembersRepository,
        },
        { provide: getRepositoryToken(Task), useValue: tasksRepository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
      ],
    }).compile();

    service = moduleRef.get(AuthorizationPolicyService);
  });

  it.each([
    [UserRole.PlatformAdmin, true],
    [UserRole.PortfolioManager, true],
    [UserRole.Executive, true],
    [UserRole.ProjectManager, false],
    [UserRole.TeamMember, false],
    [UserRole.Partner, false],
    [UserRole.Customer, false],
  ])('evaluates portfolio access for %s', async (roleName, expected) => {
    await expect(service.canViewPortfolio(actor(roleName))).resolves.toBe(
      expected,
    );
  });

  it.each([
    [UserRole.PlatformAdmin, true],
    [UserRole.PortfolioManager, true],
    [UserRole.Executive, true],
    [UserRole.ProjectManager, false],
    [UserRole.TeamMember, false],
    [UserRole.Partner, false],
    [UserRole.Customer, false],
  ])('evaluates executive access for %s', async (roleName, expected) => {
    await expect(service.canViewExecutive(actor(roleName))).resolves.toBe(
      expected,
    );
  });

  it.each([
    [UserRole.PlatformAdmin, true],
    [UserRole.Executive, false],
    [UserRole.PortfolioManager, false],
    [UserRole.ProjectManager, false],
    [UserRole.TeamMember, false],
    [UserRole.Customer, false],
    [UserRole.Partner, false],
  ])(
    'allows role-permission administration only for %s',
    async (roleName, expected) => {
      permissionOverridesByRoleName.set(roleName, Object.values(PermissionKey));

      await expect(
        service.canManageRolePermissions(actor(roleName)),
      ).resolves.toBe(expected);
    },
  );

  it.each([ProjectRole.Owner, ProjectRole.Manager])(
    'ignores hostile %s and governance authority when evaluating role-permission administration',
    async (projectRole) => {
      const executiveActor = actor(UserRole.Executive, 'user-exec');
      permissionOverridesByRoleName.set(
        UserRole.Executive,
        Object.values(PermissionKey),
      );
      membershipsByKey.set(`${projectId}:user-exec`, projectRole);
      projectGovernorAssignments.add(`${projectId}:ownerId:user-exec`);
      projectGovernorAssignments.add(`${projectId}:businessOwnerId:user-exec`);
      projectGovernorAssignments.add(`${projectId}:deliveryLeadId:user-exec`);
      projectGovernorAssignments.add(
        `${projectId}:executiveSponsorId:user-exec`,
      );

      await expect(
        service.canManageRolePermissions(executiveActor),
      ).resolves.toBe(false);
      expect(projectsRepository.findOne).not.toHaveBeenCalled();
      expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
      expect(tasksRepository.findOne).not.toHaveBeenCalled();
    },
  );

  it.each([
    [UserRole.PlatformAdmin, true],
    [UserRole.Executive, false],
    [UserRole.PortfolioManager, false],
    [UserRole.ProjectManager, false],
    [UserRole.TeamMember, false],
    [UserRole.Customer, false],
    [UserRole.Partner, false],
  ])(
    'allows global role administration only for %s',
    async (roleName, expected) => {
      permissionOverridesByRoleName.set(roleName, Object.values(PermissionKey));

      await expect(service.canManageRoles(actor(roleName))).resolves.toBe(
        expected,
      );
    },
  );

  it.each([ProjectRole.Owner, ProjectRole.Manager])(
    'ignores hostile %s and governance authority when evaluating global role administration',
    async (projectRole) => {
      const executiveActor = actor(UserRole.Executive, 'user-exec');
      permissionOverridesByRoleName.set(
        UserRole.Executive,
        Object.values(PermissionKey),
      );
      membershipsByKey.set(`${projectId}:user-exec`, projectRole);
      projectGovernorAssignments.add(`${projectId}:ownerId:user-exec`);
      projectGovernorAssignments.add(`${projectId}:businessOwnerId:user-exec`);
      projectGovernorAssignments.add(`${projectId}:deliveryLeadId:user-exec`);
      projectGovernorAssignments.add(
        `${projectId}:executiveSponsorId:user-exec`,
      );

      await expect(service.canManageRoles(executiveActor)).resolves.toBe(false);
      expect(projectsRepository.findOne).not.toHaveBeenCalled();
      expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
      expect(tasksRepository.findOne).not.toHaveBeenCalled();
    },
  );

  it.each([
    UserRole.PlatformAdmin,
    UserRole.PortfolioManager,
    UserRole.Executive,
  ])(
    'grants all-project visibility to %s through centralized policy',
    async (roleName) => {
      await expect(
        service.canViewProject(projectId, actor(roleName)),
      ).resolves.toBe(true);
    },
  );

  it('denies deliberately permissioned Executive project mutations before membership or governance authority', async () => {
    permissionOverridesByRoleName.set(
      UserRole.Executive,
      Object.values(PermissionKey),
    );
    const executiveActor = actor(UserRole.Executive, 'user-exec');
    projectGovernorAssignments.add(`${projectId}:ownerId:user-exec`);
    projectGovernorAssignments.add(`${projectId}:businessOwnerId:user-exec`);
    projectGovernorAssignments.add(`${projectId}:deliveryLeadId:user-exec`);
    projectGovernorAssignments.add(`${projectId}:executiveSponsorId:user-exec`);

    for (const projectRole of [
      ProjectRole.Owner,
      ProjectRole.Manager,
      ProjectRole.Contributor,
    ]) {
      membershipsByKey.set(`${projectId}:user-exec`, projectRole);

      await expect(
        service.canManageProject(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canDeleteProject(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canManageTask(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canManageRaid(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canContributeRaid(projectId, executiveActor),
      ).resolves.toBe(false);
    }

    await expect(service.canMutateProjectDomain(executiveActor)).resolves.toBe(
      false,
    );
    await expect(
      service.canViewProject(projectId, executiveActor),
    ).resolves.toBe(true);
    await expect(
      service.hasPermission(executiveActor, PermissionKey.ProjectRead),
    ).resolves.toBe(true);
    await expect(
      service.hasPermission(executiveActor, PermissionKey.RaidRead),
    ).resolves.toBe(true);

    const effectivePermissions =
      await service.getGrantedPermissionKeys(executiveActor);
    for (const mutationPermission of [
      PermissionKey.ProjectCreate,
      PermissionKey.ProjectDelete,
      PermissionKey.ProjectTeamManage,
      PermissionKey.ProjectUpdate,
      PermissionKey.RaidCreate,
      PermissionKey.RaidDelete,
      PermissionKey.RaidUpdate,
      PermissionKey.ResourceAssignmentArchive,
      PermissionKey.ResourceAssignmentCreate,
      PermissionKey.ResourceAssignmentUpdate,
      PermissionKey.TaskComment,
      PermissionKey.TaskCreate,
      PermissionKey.TaskDelete,
      PermissionKey.TaskReassign,
      PermissionKey.TaskUpdate,
    ]) {
      expect(effectivePermissions.has(mutationPermission)).toBe(false);
      await expect(
        service.hasPermission(executiveActor, mutationPermission),
      ).resolves.toBe(false);
    }
    expect(effectivePermissions.has(PermissionKey.ProjectRead)).toBe(true);
    expect(effectivePermissions.has(PermissionKey.RaidRead)).toBe(true);
    expect(effectivePermissions.has(PermissionKey.ResourceAssignmentRead)).toBe(
      true,
    );
    expect(projectsRepository.findOne).not.toHaveBeenCalled();
    expect(projectMembersRepository.findOne).not.toHaveBeenCalled();
  });

  it('preserves the Platform Admin project mutation override', async () => {
    const platformActor = actor(UserRole.PlatformAdmin, 'user-admin');

    await expect(service.canMutateProjectDomain(platformActor)).resolves.toBe(
      true,
    );
    await expect(
      service.canManageProject(projectId, platformActor),
    ).resolves.toBe(true);
    await expect(
      service.canDeleteProject(projectId, platformActor),
    ).resolves.toBe(true);
    await expect(service.canManageRaid(projectId, platformActor)).resolves.toBe(
      true,
    );
    await expect(
      service.canContributeRaid(projectId, platformActor),
    ).resolves.toBe(true);
  });

  it('fails closed when project visibility is evaluated without an actor', async () => {
    await expect(service.canViewProject(projectId)).resolves.toBe(false);
  });

  it('allows portfolio visibility but rejects unrelated project mutation', async () => {
    const portfolioActor = actor(UserRole.PortfolioManager, 'portfolio-user');

    await expect(
      service.canViewProject(projectId, portfolioActor),
    ).resolves.toBe(true);
    await expect(
      service.canManageProject(projectId, portfolioActor),
    ).resolves.toBe(false);
    await expect(
      service.canManageTask(projectId, portfolioActor),
    ).resolves.toBe(false);
  });

  it('allows a portfolio manager to mutate a project they manage', async () => {
    membershipsByKey.set(`${projectId}:portfolio-user`, ProjectRole.Manager);

    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.PortfolioManager, 'portfolio-user'),
      ),
    ).resolves.toBe(true);
  });

  it('grants project visibility from membership without role-name logic', async () => {
    membershipsByKey.set(
      `${projectId}:user-team-member`,
      ProjectRole.Contributor,
    );

    await expect(
      service.canViewProject(
        projectId,
        actor(UserRole.TeamMember, 'user-team-member'),
      ),
    ).resolves.toBe(true);
  });

  it('grants project visibility from assigned tasks for task-capable roles', async () => {
    assignedTaskKeys.add(`${projectId}:user-partner`);

    await expect(
      service.canViewProject(
        projectId,
        actor(UserRole.Partner, 'user-partner'),
      ),
    ).resolves.toBe(true);
  });

  it('does not grant customer project visibility from task assignment alone', async () => {
    assignedTaskKeys.add(`${projectId}:user-customer`);

    await expect(
      service.canViewProject(
        projectId,
        actor(UserRole.Customer, 'user-customer'),
      ),
    ).resolves.toBe(false);
  });

  it('allows project management for project managers and owners via policy checks', async () => {
    membershipsByKey.set(`${projectId}:user-pm`, ProjectRole.Manager);
    projectGovernorAssignments.add(`${projectId}:ownerId:user-owner`);

    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.ProjectManager, 'user-pm'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.ProjectManager, 'user-owner'),
      ),
    ).resolves.toBe(true);
  });

  it('allows project management for formal project governance assignments', async () => {
    projectGovernorAssignments.add(
      `${projectId}:businessOwnerId:user-business-owner`,
    );
    projectGovernorAssignments.add(
      `${projectId}:deliveryLeadId:user-delivery-lead`,
    );
    projectGovernorAssignments.add(
      `${projectId}:executiveSponsorId:user-executive-sponsor`,
    );

    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.ProjectManager, 'user-business-owner'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.ProjectManager, 'user-delivery-lead'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.PortfolioManager, 'user-executive-sponsor'),
      ),
    ).resolves.toBe(true);
  });

  it.each([
    'ownerId',
    'businessOwnerId',
    'deliveryLeadId',
    'executiveSponsorId',
  ])(
    'keeps Executive mutation denied for %s governance',
    async (governanceField) => {
      projectGovernorAssignments.add(
        `${projectId}:${governanceField}:user-exec`,
      );

      const executiveActor = actor(UserRole.Executive, 'user-exec');
      await expect(
        service.canManageProject(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canDeleteProject(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canManageTask(projectId, executiveActor),
      ).resolves.toBe(false);
      await expect(
        service.canManageRaid(projectId, executiveActor),
      ).resolves.toBe(false);
    },
  );

  it('restricts project deletion to roles that have explicit delete permission', async () => {
    membershipsByKey.set(`${projectId}:user-pm`, ProjectRole.Manager);

    await expect(
      service.canDeleteProject(
        projectId,
        actor(UserRole.ProjectManager, 'user-pm'),
      ),
    ).resolves.toBe(true);
  });

  it('grants broad task and RAID management only to project governors', async () => {
    membershipsByKey.set(`${projectId}:user-pm`, ProjectRole.Manager);
    membershipsByKey.set(`${projectId}:user-team`, ProjectRole.Contributor);

    await expect(
      service.canManageTask(
        projectId,
        actor(UserRole.ProjectManager, 'user-pm'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.canManageRaid(
        projectId,
        actor(UserRole.ProjectManager, 'user-pm'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.canManageTask(projectId, actor(UserRole.TeamMember, 'user-team')),
    ).resolves.toBe(false);
    await expect(
      service.canManageRaid(projectId, actor(UserRole.TeamMember, 'user-team')),
    ).resolves.toBe(false);
  });

  it('does not require project creation ownership for task execution authority', async () => {
    membershipsByKey.set(
      `${projectId}:user-technical-manager`,
      ProjectRole.Manager,
    );

    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.TeamMember, 'user-technical-manager'),
      ),
    ).resolves.toBe(false);
    await expect(
      service.canManageTask(
        projectId,
        actor(UserRole.TeamMember, 'user-technical-manager'),
      ),
    ).resolves.toBe(true);
  });
});

function actor(
  roleName: string,
  userId = `user-${roleName.toLowerCase()}`,
): AuthorizationActor {
  return {
    email: `${userId}@example.com`,
    roleId: `role-${roleName}`,
    userId,
  };
}
