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

  beforeEach(async () => {
    projectGovernorAssignments = new Set();
    membershipsByKey = new Map();
    assignedTaskKeys = new Set();

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
        const permissionKeys = permissionsByRoleName[roleName] ?? [];
        return Promise.resolve({
          id: where.id,
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

  it('requires project management permissions even for formal governance assignments', async () => {
    projectGovernorAssignments.add(`${projectId}:executiveSponsorId:user-exec`);

    await expect(
      service.canManageProject(
        projectId,
        actor(UserRole.Executive, 'user-exec'),
      ),
    ).resolves.toBe(false);
  });

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
