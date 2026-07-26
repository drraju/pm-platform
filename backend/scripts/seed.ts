import 'reflect-metadata';
import { createHash } from 'crypto';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';
import {
  canonicalUserRoles,
  UserRole,
  userRoleDescriptions,
} from '../src/common/enums/user-role.enum';
import { ProjectRole } from '../src/common/enums/project-role.enum';
import { RaidType } from '../src/common/enums/raid-type.enum';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import { ProjectMember } from '../src/modules/projects/entities/project-member.entity';
import { Project } from '../src/modules/projects/entities/project.entity';
import { Assumption } from '../src/modules/raid/entities/assumption.entity';
import { Dependency } from '../src/modules/raid/entities/dependency.entity';
import { Issue } from '../src/modules/raid/entities/issue.entity';
import { Risk } from '../src/modules/raid/entities/risk.entity';
import { Task } from '../src/modules/tasks/entities/task.entity';
import { Permission } from '../src/modules/users/entities/permission.entity';
import { Role } from '../src/modules/users/entities/role.entity';
import { RolePermission } from '../src/modules/users/entities/role-permission.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { PermissionKey } from '../src/common/authz/permissions';
import { PasswordService } from '../src/modules/auth/password.service';

const seedNamespace = 'pm-platform-dev-seed-v2';
export const defaultPassword = 'Password123!';

export function seedUuid(key: string): string {
  const hash = createHash('sha1')
    .update(`${seedNamespace}:${key}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) +
      hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-');
}

const users = [
  {
    id: seedUuid('user-program-manager'),
    email: 'program.manager@example.com',
    firstName: 'Amelia',
    lastName: 'Grant',
    roleName: UserRole.PortfolioManager,
  },
  {
    id: seedUuid('user-project-manager'),
    email: 'project.manager@example.com',
    firstName: 'Marcus',
    lastName: 'Shah',
    roleName: UserRole.ProjectManager,
  },
  {
    id: seedUuid('user-delivery-lead'),
    email: 'delivery.lead@example.com',
    firstName: 'Nora',
    lastName: 'Bennett',
    roleName: UserRole.ProjectManager,
  },
  {
    id: seedUuid('user-technical-lead'),
    email: 'technical.lead@example.com',
    firstName: 'Theo',
    lastName: 'Ivers',
    roleName: UserRole.TeamMember,
  },
  {
    id: seedUuid('user-engineer'),
    email: 'engineer@example.com',
    firstName: 'Priya',
    lastName: 'Kapoor',
    roleName: UserRole.TeamMember,
  },
  {
    id: seedUuid('user-qa-engineer'),
    email: 'qa.engineer@example.com',
    firstName: 'Elliot',
    lastName: 'Reed',
    roleName: UserRole.TeamMember,
  },
];

const superAdminUser = {
  id: seedUuid('user-super-admin'),
  email: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com',
  firstName: 'Super',
  lastName: 'Admin',
  password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'admin',
  roleName: UserRole.PlatformAdmin,
};

const allSeedUsers = [superAdminUser, ...users];

const permissions = [
  {
    key: PermissionKey.DashboardView,
    description: 'View personal dashboard',
  },
  {
    key: PermissionKey.ExecutiveView,
    description: 'View executive dashboard and reports',
  },
  {
    key: PermissionKey.IntegrationManage,
    description: 'Manage external integrations',
  },
  {
    key: PermissionKey.NotificationManage,
    description: 'Manage notifications',
  },
  {
    key: PermissionKey.NotificationRead,
    description: 'Read notifications',
  },
  {
    key: PermissionKey.PermissionManage,
    description: 'Manage role permissions',
  },
  {
    key: PermissionKey.PortfolioView,
    description: 'View portfolio reporting',
  },
  {
    key: PermissionKey.ProjectCreate,
    description: 'Create projects',
  },
  {
    key: PermissionKey.ProjectDelete,
    description: 'Delete projects',
  },
  {
    key: PermissionKey.ProjectRead,
    description: 'Read projects',
  },
  {
    key: PermissionKey.ProjectTeamManage,
    description: 'Manage project team membership',
  },
  {
    key: PermissionKey.ProjectUpdate,
    description: 'Update projects',
  },
  {
    key: PermissionKey.RaidCreate,
    description: 'Create RAID items',
  },
  {
    key: PermissionKey.RaidDelete,
    description: 'Delete RAID items',
  },
  {
    key: PermissionKey.RaidRead,
    description: 'Read RAID items',
  },
  {
    key: PermissionKey.RaidUpdate,
    description: 'Update RAID items',
  },
  {
    key: PermissionKey.ResourceArchive,
    description: 'Archive enterprise resources',
  },
  {
    key: PermissionKey.ResourceAvailabilityArchive,
    description: 'Archive resource availability overrides',
  },
  {
    key: PermissionKey.ResourceAvailabilityCreate,
    description: 'Create resource availability overrides',
  },
  {
    key: PermissionKey.ResourceAvailabilityRead,
    description: 'Read resource availability overrides',
  },
  {
    key: PermissionKey.ResourceAvailabilityUpdate,
    description: 'Update resource availability overrides',
  },
  {
    key: PermissionKey.ResourceCapacityArchive,
    description: 'Archive resource capacity policies',
  },
  {
    key: PermissionKey.ResourceCapacityCreate,
    description: 'Create resource capacity policies',
  },
  {
    key: PermissionKey.ResourceCapacityRead,
    description: 'Read resource capacity policies',
  },
  {
    key: PermissionKey.ResourceCapacityUpdate,
    description: 'Update resource capacity policies',
  },
  {
    key: PermissionKey.ResourceSkillArchive,
    description: 'Archive resource skill associations',
  },
  {
    key: PermissionKey.ResourceSkillCreate,
    description: 'Create resource skill associations',
  },
  {
    key: PermissionKey.ResourceSkillRead,
    description: 'Read resource skill associations',
  },
  {
    key: PermissionKey.ResourceSkillUpdate,
    description: 'Update resource skill associations',
  },
  {
    key: PermissionKey.ResourceCreate,
    description: 'Create enterprise resources',
  },
  {
    key: PermissionKey.ResourceRead,
    description: 'Read enterprise resources',
  },
  {
    key: PermissionKey.ResourceUpdate,
    description: 'Update enterprise resources',
  },
  {
    key: PermissionKey.RoleManage,
    description: 'Manage roles',
  },
  {
    key: PermissionKey.SkillArchive,
    description: 'Archive enterprise skills',
  },
  {
    key: PermissionKey.SkillCreate,
    description: 'Create enterprise skills',
  },
  {
    key: PermissionKey.SkillRead,
    description: 'Read enterprise skills',
  },
  {
    key: PermissionKey.SkillUpdate,
    description: 'Update enterprise skills',
  },
  {
    key: PermissionKey.TaskCreate,
    description: 'Create project tasks',
  },
  {
    key: PermissionKey.TaskUpdate,
    description: 'Update project tasks',
  },
  {
    key: PermissionKey.TaskDelete,
    description: 'Delete project tasks',
  },
  {
    key: PermissionKey.TaskReassign,
    description: 'Reassign project tasks',
  },
  {
    key: PermissionKey.TaskComment,
    description: 'Update task remarks',
  },
  {
    key: PermissionKey.UserManage,
    description: 'Manage users',
  },
] as const;

const permissionsByRoleName: Record<UserRole, PermissionKey[]> = {
  [UserRole.PlatformAdmin]: permissions.map((permission) => permission.key),
  [UserRole.PortfolioManager]: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
    PermissionKey.ProjectCreate,
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
    PermissionKey.ProjectUpdate,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.RaidDelete,
    PermissionKey.ResourceArchive,
    PermissionKey.ResourceAvailabilityArchive,
    PermissionKey.ResourceAvailabilityCreate,
    PermissionKey.ResourceAvailabilityRead,
    PermissionKey.ResourceAvailabilityUpdate,
    PermissionKey.ResourceSkillArchive,
    PermissionKey.ResourceSkillCreate,
    PermissionKey.ResourceSkillRead,
    PermissionKey.ResourceSkillUpdate,
    PermissionKey.ResourceCapacityArchive,
    PermissionKey.ResourceCapacityCreate,
    PermissionKey.ResourceCapacityRead,
    PermissionKey.ResourceCapacityUpdate,
    PermissionKey.ResourceCreate,
    PermissionKey.ResourceRead,
    PermissionKey.ResourceUpdate,
    PermissionKey.SkillArchive,
    PermissionKey.SkillCreate,
    PermissionKey.SkillRead,
    PermissionKey.SkillUpdate,
    PermissionKey.TaskCreate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
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
    PermissionKey.ResourceArchive,
    PermissionKey.ResourceAvailabilityArchive,
    PermissionKey.ResourceAvailabilityCreate,
    PermissionKey.ResourceAvailabilityRead,
    PermissionKey.ResourceAvailabilityUpdate,
    PermissionKey.ResourceSkillArchive,
    PermissionKey.ResourceSkillCreate,
    PermissionKey.ResourceSkillRead,
    PermissionKey.ResourceSkillUpdate,
    PermissionKey.ResourceCapacityArchive,
    PermissionKey.ResourceCapacityCreate,
    PermissionKey.ResourceCapacityRead,
    PermissionKey.ResourceCapacityUpdate,
    PermissionKey.ResourceCreate,
    PermissionKey.ResourceRead,
    PermissionKey.ResourceUpdate,
    PermissionKey.SkillArchive,
    PermissionKey.SkillCreate,
    PermissionKey.SkillRead,
    PermissionKey.SkillUpdate,
    PermissionKey.TaskCreate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  [UserRole.TeamMember]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.ResourceAvailabilityRead,
    PermissionKey.ResourceCapacityRead,
    PermissionKey.ResourceRead,
    PermissionKey.ResourceSkillRead,
    PermissionKey.SkillRead,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  [UserRole.Executive]: [
    PermissionKey.DashboardView,
    PermissionKey.ExecutiveView,
    PermissionKey.PortfolioView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
    PermissionKey.NotificationRead,
  ],
  [UserRole.Customer]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
    PermissionKey.NotificationRead,
  ],
  [UserRole.Partner]: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidRead,
    PermissionKey.TaskComment,
    PermissionKey.TaskReassign,
    PermissionKey.TaskUpdate,
    PermissionKey.NotificationRead,
  ],
};

const projects = [
  {
    id: seedUuid('project-cx-upgrade'),
    name: 'Customer Experience Platform Upgrade',
    description:
      'Modernize the customer engagement platform, improve self-service journeys, and consolidate service workflows.',
    status: 'active',
    startDate: '2026-06-10',
    targetEndDate: '2026-11-20',
    ownerEmail: 'project.manager@example.com',
    businessOwnerEmail: 'program.manager@example.com',
    executiveSponsorEmail: 'program.manager@example.com',
    deliveryLeadEmail: 'delivery.lead@example.com',
  },
  {
    id: seedUuid('project-observability'),
    name: 'Observability Transformation Programme',
    description:
      'Standardize logging, metrics, tracing, alerting, and operational dashboards across critical product platforms.',
    status: 'at_risk',
    startDate: '2026-06-17',
    targetEndDate: '2026-12-11',
    ownerEmail: 'program.manager@example.com',
    businessOwnerEmail: 'project.manager@example.com',
    executiveSponsorEmail: 'program.manager@example.com',
    deliveryLeadEmail: 'delivery.lead@example.com',
  },
  {
    id: seedUuid('project-dc-exit'),
    name: 'Data Centre Exit Programme',
    description:
      'Migrate remaining workloads from legacy data centres into managed cloud and colocation services.',
    status: 'active',
    startDate: '2026-07-01',
    targetEndDate: '2027-02-27',
    ownerEmail: 'delivery.lead@example.com',
    businessOwnerEmail: 'project.manager@example.com',
    executiveSponsorEmail: 'program.manager@example.com',
    deliveryLeadEmail: 'delivery.lead@example.com',
  },
];

const memberships = [
  [
    'Customer Experience Platform Upgrade',
    'project.manager@example.com',
    ProjectRole.Owner,
  ],
  [
    'Customer Experience Platform Upgrade',
    'delivery.lead@example.com',
    ProjectRole.Manager,
  ],
  [
    'Customer Experience Platform Upgrade',
    'technical.lead@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Customer Experience Platform Upgrade',
    'engineer@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Customer Experience Platform Upgrade',
    'qa.engineer@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Observability Transformation Programme',
    'program.manager@example.com',
    ProjectRole.Owner,
  ],
  [
    'Observability Transformation Programme',
    'technical.lead@example.com',
    ProjectRole.Manager,
  ],
  [
    'Observability Transformation Programme',
    'engineer@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Observability Transformation Programme',
    'qa.engineer@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Data Centre Exit Programme',
    'delivery.lead@example.com',
    ProjectRole.Owner,
  ],
  [
    'Data Centre Exit Programme',
    'project.manager@example.com',
    ProjectRole.Manager,
  ],
  [
    'Data Centre Exit Programme',
    'technical.lead@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Data Centre Exit Programme',
    'engineer@example.com',
    ProjectRole.Contributor,
  ],
  [
    'Data Centre Exit Programme',
    'qa.engineer@example.com',
    ProjectRole.Contributor,
  ],
] as const;

const taskTitlesByProject: Record<string, string[]> = {
  'Customer Experience Platform Upgrade': [
    'Complete customer journey discovery workshops',
    'Approve target service blueprint',
    'Configure identity handoff for customer portal',
    'Build case escalation workflow',
    'Migrate knowledge base articles',
    'Implement customer notification templates',
    'Complete accessibility regression testing',
    'Run pilot with strategic account team',
    'Prepare customer support training pack',
    'Complete release readiness review',
  ],
  'Observability Transformation Programme': [
    'Define enterprise telemetry standards',
    'Build golden signal dashboard template',
    'Configure distributed tracing baseline',
    'Migrate payment service alerts',
    'Complete log retention policy review',
    'Implement service ownership catalogue',
    'Run alert noise reduction workshop',
    'Publish incident dashboard runbook',
    'Complete SRE enablement session',
    'Measure adoption across priority services',
  ],
  'Data Centre Exit Programme': [
    'Finalize application disposition plan',
    'Complete network dependency mapping',
    'Validate backup and restore approach',
    'Migrate batch processing workload',
    'Retire legacy monitoring agent',
    'Complete firewall rules review',
    'Run production migration rehearsal',
    'Confirm vendor connectivity plan',
    'Complete data centre exit risk review',
    'Prepare executive migration checkpoint',
  ],
};

const riskTitles = [
  'Customer identity cutover may disrupt active sessions',
  'Legacy API rate limits may slow data synchronization',
  'Regional service teams may not complete training before pilot',
  'Alert migration could temporarily increase operational noise',
  'Telemetry storage costs may exceed forecast',
  'Service ownership data may be incomplete for older products',
  'Network dependency discovery may miss undocumented integrations',
  'Migration freeze windows may reduce available cutover dates',
  'Vendor lead times may delay circuit decommissioning',
  'Backup validation may uncover restore time gaps',
];

const issueTitles = [
  'Customer portal staging environment is unstable',
  'Observability dashboard permissions are blocking pilot users',
  'Data centre firewall rule export is missing metadata',
  'Training content sign-off is overdue',
  'Batch workload migration failed performance benchmark',
];

const assumptionTitles = [
  'Customer support teams will adopt the new case taxonomy',
  'Core product services can emit required tracing fields',
  'Legacy workloads have current ownership records',
  'Cloud landing zone capacity will be available before migration wave two',
  'Business stakeholders can support two UAT cycles',
];

const dependencyTitles = [
  'Identity team must complete SSO policy update',
  'Procurement must approve observability tooling contract extension',
  'Network team must provide final circuit inventory',
  'Security architecture board must approve migration pattern',
  'Data governance team must approve retention classification',
];

type SeedContext = {
  rolesByName: Map<string, Role>;
  usersByEmail: Map<string, User>;
  projectsByName: Map<string, Project>;
};

const requiredEntityNames = [
  'User',
  'Role',
  'Permission',
  'RolePermission',
  'Project',
  'ProjectMember',
  'Task',
  'Risk',
  'Issue',
  'Assumption',
  'Dependency',
  'Notification',
];

export const developmentSeedData = {
  assumptionTitles,
  defaultPassword,
  dependencyTitles,
  issueTitles,
  memberships,
  permissions,
  permissionsByRoleName,
  projects,
  requiredEntityNames,
  riskTitles,
  taskTitlesByProject,
  users,
};

const appDataSource = new DataSource(createDataSourceOptions());

async function findSeedEntity<
  T extends { deletedAt?: Date | null; id: string },
>(
  repository: Repository<T>,
  id: string,
  naturalWhere?: FindOptionsWhere<T>,
): Promise<T | null> {
  if (naturalWhere) {
    const existingByNaturalKey = await repository.findOne({
      where: naturalWhere,
      withDeleted: true,
    });
    if (existingByNaturalKey) {
      return existingByNaturalKey;
    }
  }

  return repository.findOne({
    where: { id } as FindOptionsWhere<T>,
    withDeleted: true,
  });
}

async function saveSeedEntity<
  T extends { deletedAt?: Date | null; id: string },
>(
  repository: Repository<T>,
  id: string,
  values: DeepPartial<T>,
  naturalWhere?: FindOptionsWhere<T>,
): Promise<T> {
  const existing = await findSeedEntity(repository, id, naturalWhere);
  const entity = repository.create({
    ...(existing ?? { id }),
    ...values,
    deletedAt: null,
  } as DeepPartial<T>);
  return repository.save(entity);
}

async function seedRolesAndUsers(manager: EntityManager): Promise<SeedContext> {
  const roleRepository = manager.getRepository(Role);
  const permissionRepository = manager.getRepository(Permission);
  const rolePermissionRepository = manager.getRepository(RolePermission);
  const userRepository = manager.getRepository(User);
  const passwordService = new PasswordService();
  const passwordHash = await passwordService.hashPassword(defaultPassword);
  const superAdminPasswordHash = await passwordService.hashPassword(
    superAdminUser.password,
  );

  const roles: Role[] = [];
  for (const roleName of canonicalUserRoles) {
    roles.push(
      await saveSeedEntity(
        roleRepository,
        seedUuid(`role-${roleName}`),
        {
          name: roleName,
          description: userRoleDescriptions[roleName],
        },
        { name: roleName },
      ),
    );
  }
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  const savedPermissions: Permission[] = [];
  for (const permission of permissions) {
    savedPermissions.push(
      await saveSeedEntity(
        permissionRepository,
        seedUuid(`permission-${permission.key}`),
        {
          key: permission.key,
          description: permission.description,
        },
        { key: permission.key },
      ),
    );
  }
  const permissionsByKey = new Map(
    savedPermissions.map((permission) => [permission.key, permission]),
  );

  for (const [roleName, permissionKeys] of Object.entries(
    permissionsByRoleName,
  )) {
    const role = rolesByName.get(roleName);
    if (!role) {
      continue;
    }

    for (const permissionKey of permissionKeys) {
      const permission = permissionsByKey.get(permissionKey);
      if (!permission) {
        continue;
      }
      const existingRolePermission = await rolePermissionRepository.findOne({
        where: { permissionId: permission.id, roleId: role.id },
      });
      if (!existingRolePermission) {
        await rolePermissionRepository.save(
          rolePermissionRepository.create({
            createdAt: new Date(),
            permissionId: permission.id,
            roleId: role.id,
          }),
        );
      }
    }
  }

  const savedUsers: User[] = [];
  for (const user of allSeedUsers) {
    const existingUser = await userRepository.findOne({
      where: [{ id: user.id }, { email: user.email }],
    });
    const passwordForNewUser =
      user.email === superAdminUser.email
        ? superAdminPasswordHash
        : passwordHash;
    savedUsers.push(
      await userRepository.save(
        userRepository.create({
          ...(existingUser ?? {
            id: user.id,
            passwordHash: passwordForNewUser,
          }),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: rolesByName.get(user.roleName)?.id,
          status: 'active',
        }),
      ),
    );
  }

  return {
    rolesByName,
    usersByEmail: new Map(savedUsers.map((user) => [user.email, user])),
    projectsByName: new Map(),
  };
}

async function seedProjectsAndMemberships(
  manager: EntityManager,
  context: SeedContext,
) {
  const projectRepository = manager.getRepository(Project);
  const memberRepository = manager.getRepository(ProjectMember);

  const savedProjects: Project[] = [];
  for (const project of projects) {
    savedProjects.push(
      await saveSeedEntity(
        projectRepository,
        project.id,
        {
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          targetEndDate: project.targetEndDate,
          ownerId: context.usersByEmail.get(project.ownerEmail)?.id,
          businessOwnerId: context.usersByEmail.get(project.businessOwnerEmail)
            ?.id,
          executiveSponsorId: context.usersByEmail.get(
            project.executiveSponsorEmail,
          )?.id,
          deliveryLeadId: context.usersByEmail.get(project.deliveryLeadEmail)
            ?.id,
        },
        { name: project.name },
      ),
    );
  }
  context.projectsByName = new Map(
    savedProjects.map((project) => [project.name, project]),
  );

  for (const [projectName, email, role] of memberships) {
    const projectId = context.projectsByName.get(projectName)?.id;
    const userId = context.usersByEmail.get(email)?.id;
    if (!projectId || !userId) {
      continue;
    }
    await saveSeedEntity(
      memberRepository,
      seedUuid(`membership-${projectName}-${email}`),
      {
        projectId,
        userId,
        role,
      },
      { projectId, userId },
    );
  }
}

async function seedTasks(manager: EntityManager, context: SeedContext) {
  const taskRepository = manager.getRepository(Task);
  const statuses = [
    TaskStatus.Todo,
    TaskStatus.InProgress,
    TaskStatus.Blocked,
    TaskStatus.Done,
    TaskStatus.Todo,
    TaskStatus.InProgress,
  ];
  const priorities = ['medium', 'high', 'critical', 'medium', 'low'];
  const assignees = [
    'delivery.lead@example.com',
    'technical.lead@example.com',
    'engineer@example.com',
    'qa.engineer@example.com',
    'project.manager@example.com',
  ];

  let index = 0;
  for (const [projectName, titles] of Object.entries(taskTitlesByProject)) {
    const project = context.projectsByName.get(projectName);
    if (!project) {
      continue;
    }
    for (const title of titles) {
      const month = 6 + Math.floor(index / 8);
      const day = 8 + (index % 18);
      const dueDay = Math.min(day + 10, 28);
      const assignee = context.usersByEmail.get(
        assignees[index % assignees.length],
      );
      await saveSeedEntity(
        taskRepository,
        seedUuid(`task-${index + 1}`),
        {
          projectId: project?.id,
          title,
          description: `Development seed task for ${projectName}.`,
          assigneeId: assignee?.id,
          status: statuses[index % statuses.length],
          priority: priorities[index % priorities.length],
          startDate: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          dueDate: `2026-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
        },
        { title, projectId: project?.id },
      );
      index += 1;
    }
  }
}

async function seedRaid(manager: EntityManager, context: SeedContext) {
  const riskRepository = manager.getRepository(Risk);
  const issueRepository = manager.getRepository(Issue);
  const assumptionRepository = manager.getRepository(Assumption);
  const dependencyRepository = manager.getRepository(Dependency);
  const projectCycle = projects.map((project) =>
    context.projectsByName.get(project.name),
  );
  const ownerCycle = users.map((user) => context.usersByEmail.get(user.email));

  for (const [index, title] of riskTitles.entries()) {
    await saveSeedEntity(
      riskRepository,
      seedUuid(`risk-${index + 1}`),
      {
        projectId: projectCycle[index % projectCycle.length]?.id,
        type: RaidType.Risk,
        title,
        description: `Development seed risk tracked for ${
          projectCycle[index % projectCycle.length]?.name
        }.`,
        ownerId: ownerCycle[(index + 1) % ownerCycle.length]?.id,
        status: index % 4 === 0 ? 'monitoring' : 'open',
        probability: ['low', 'medium', 'high'][index % 3],
        impact: ['medium', 'high', 'critical'][index % 3],
        mitigationPlan:
          'Review weekly with the project team, assign mitigation actions, and escalate unresolved decisions to governance.',
      },
      { title, projectId: projectCycle[index % projectCycle.length]?.id },
    );
  }

  for (const [index, title] of issueTitles.entries()) {
    await saveSeedEntity(
      issueRepository,
      seedUuid(`issue-${index + 1}`),
      {
        projectId: projectCycle[index % projectCycle.length]?.id,
        type: RaidType.Issue,
        title,
        description: `Development seed issue requiring action for ${
          projectCycle[index % projectCycle.length]?.name
        }.`,
        ownerId: ownerCycle[(index + 2) % ownerCycle.length]?.id,
        status: index % 2 === 0 ? 'open' : 'in_progress',
        severity: ['medium', 'high', 'critical'][index % 3],
        resolutionPlan:
          'Confirm accountable owner, agree target resolution date, and review progress in the delivery standup.',
      },
      { title, projectId: projectCycle[index % projectCycle.length]?.id },
    );
  }

  for (const [index, title] of assumptionTitles.entries()) {
    await saveSeedEntity(
      assumptionRepository,
      seedUuid(`assumption-${index + 1}`),
      {
        projectId: projectCycle[index % projectCycle.length]?.id,
        type: RaidType.Assumption,
        title,
        description: `Development seed assumption for ${
          projectCycle[index % projectCycle.length]?.name
        }.`,
        ownerId: ownerCycle[(index + 3) % ownerCycle.length]?.id,
        status: 'open',
        validationStatus: index % 2 === 0 ? 'unvalidated' : 'in_review',
        validationNotes: 'Validate during the next planning checkpoint.',
      },
      { title, projectId: projectCycle[index % projectCycle.length]?.id },
    );
  }

  for (const [index, title] of dependencyTitles.entries()) {
    await saveSeedEntity(
      dependencyRepository,
      seedUuid(`dependency-${index + 1}`),
      {
        projectId: projectCycle[index % projectCycle.length]?.id,
        type: RaidType.Dependency,
        title,
        description: `Development seed dependency for ${
          projectCycle[index % projectCycle.length]?.name
        }.`,
        ownerId: ownerCycle[(index + 4) % ownerCycle.length]?.id,
        status: index % 2 === 0 ? 'open' : 'in_progress',
        dependsOn: [
          'Identity Platform',
          'Procurement',
          'Network Engineering',
          'Security Architecture',
          'Data Governance',
        ][index],
        dueDate: `2026-${String(7 + index).padStart(2, '0')}-15`,
      },
      { title, projectId: projectCycle[index % projectCycle.length]?.id },
    );
  }
}

async function main() {
  const shouldReset = process.argv.includes('--reset');
  await appDataSource.initialize();
  verifyRequiredEntities(appDataSource);

  try {
    if (shouldReset) {
      console.log(
        'Seed reset requested; running non-destructive idempotent seed instead.',
      );
    }

    await appDataSource.transaction(async (manager) => {
      const context = await seedRolesAndUsers(manager);
      await seedProjectsAndMemberships(manager, context);
      await seedTasks(manager, context);
      await seedRaid(manager, context);
    });

    console.log('Seed complete:');
    console.log('- 6 users');
    console.log('- 3 projects');
    console.log(`- ${memberships.length} project memberships`);
    console.log('- 30 tasks');
    console.log('- 10 risks');
    console.log('- 5 issues');
    console.log('- 5 assumptions');
    console.log('- 5 dependencies');
    console.log(`Default development password: ${defaultPassword}`);
  } finally {
    await appDataSource.destroy();
  }
}

export function verifyRequiredEntities(dataSource: DataSource) {
  const loadedEntityNames = new Set(
    dataSource.entityMetadatas.map((metadata) => metadata.targetName),
  );
  const missingEntityNames = requiredEntityNames.filter(
    (entityName) => !loadedEntityNames.has(entityName),
  );

  if (missingEntityNames.length > 0) {
    throw new Error(
      `Seed DataSource missing entity metadata: ${missingEntityNames.join(', ')}`,
    );
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Seed failed');
    console.error(error);
    process.exitCode = 1;
  });
}
