import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';
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

const seedNamespace = 'pm-platform-dev-seed-v2';
export const defaultPassword = 'Password123!';

export function seedUuid(key: string): string {
  const hash = createHash('sha1').update(`${seedNamespace}:${key}`).digest('hex');
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
    roleName: 'Program Manager',
  },
  {
    id: seedUuid('user-project-manager'),
    email: 'project.manager@example.com',
    firstName: 'Marcus',
    lastName: 'Shah',
    roleName: 'Project Manager',
  },
  {
    id: seedUuid('user-delivery-lead'),
    email: 'delivery.lead@example.com',
    firstName: 'Nora',
    lastName: 'Bennett',
    roleName: 'Delivery Lead',
  },
  {
    id: seedUuid('user-technical-lead'),
    email: 'technical.lead@example.com',
    firstName: 'Theo',
    lastName: 'Ivers',
    roleName: 'Technical Lead',
  },
  {
    id: seedUuid('user-engineer'),
    email: 'engineer@example.com',
    firstName: 'Priya',
    lastName: 'Kapoor',
    roleName: 'Engineer',
  },
  {
    id: seedUuid('user-qa-engineer'),
    email: 'qa.engineer@example.com',
    firstName: 'Elliot',
    lastName: 'Reed',
    roleName: 'QA Engineer',
  },
];

const superAdminUser = {
  id: seedUuid('user-super-admin'),
  email: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@example.com',
  firstName: 'Super',
  lastName: 'Admin',
  password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'admin',
  roleName: 'SUPER_ADMIN',
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
    key: PermissionKey.RoleManage,
    description: 'Manage roles',
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

const permissionsByRoleName: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: permissions.map((permission) => permission.key),
  'Program Manager': [
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
    PermissionKey.TaskCreate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  'Project Manager': [
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
    PermissionKey.TaskCreate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  'Delivery Lead': [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
    PermissionKey.ProjectUpdate,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskCreate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskDelete,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  'Technical Lead': [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  Engineer: [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
    PermissionKey.NotificationRead,
  ],
  'QA Engineer': [
    PermissionKey.DashboardView,
    PermissionKey.ProjectRead,
    PermissionKey.RaidCreate,
    PermissionKey.RaidRead,
    PermissionKey.RaidUpdate,
    PermissionKey.TaskUpdate,
    PermissionKey.TaskReassign,
    PermissionKey.TaskComment,
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
  ['Customer Experience Platform Upgrade', 'project.manager@example.com', ProjectRole.Owner],
  ['Customer Experience Platform Upgrade', 'delivery.lead@example.com', ProjectRole.Manager],
  ['Customer Experience Platform Upgrade', 'technical.lead@example.com', ProjectRole.Contributor],
  ['Customer Experience Platform Upgrade', 'engineer@example.com', ProjectRole.Contributor],
  ['Customer Experience Platform Upgrade', 'qa.engineer@example.com', ProjectRole.Contributor],
  ['Observability Transformation Programme', 'program.manager@example.com', ProjectRole.Owner],
  ['Observability Transformation Programme', 'technical.lead@example.com', ProjectRole.Manager],
  ['Observability Transformation Programme', 'engineer@example.com', ProjectRole.Contributor],
  ['Observability Transformation Programme', 'qa.engineer@example.com', ProjectRole.Contributor],
  ['Data Centre Exit Programme', 'delivery.lead@example.com', ProjectRole.Owner],
  ['Data Centre Exit Programme', 'project.manager@example.com', ProjectRole.Manager],
  ['Data Centre Exit Programme', 'technical.lead@example.com', ProjectRole.Contributor],
  ['Data Centre Exit Programme', 'engineer@example.com', ProjectRole.Contributor],
  ['Data Centre Exit Programme', 'qa.engineer@example.com', ProjectRole.Contributor],
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

async function saveEntities<T extends object>(
  repository: Repository<T>,
  entities: T[],
): Promise<T[]> {
  return repository.save(entities);
}

async function resetSeedData(dataSource: DataSource) {
  await dataSource.transaction(async (manager) => {
    await manager.getRepository(Dependency).delete({ id: In(dependencyIds()) });
    await manager.getRepository(Assumption).delete({ id: In(assumptionIds()) });
    await manager.getRepository(Issue).delete({ id: In(issueIds()) });
    await manager.getRepository(Risk).delete({ id: In(riskIds()) });
    await manager.getRepository(Task).delete({ id: In(taskIds()) });
    await manager.getRepository(ProjectMember).delete({ id: In(membershipIds()) });
    await manager.getRepository(Project).delete({ id: In(projects.map((project) => project.id)) });
    await manager
      .getRepository(RolePermission)
      .delete({ roleId: In(allSeedUsers.map((user) => seedUuid(`role-${user.roleName}`))) });
    await manager
      .getRepository(Permission)
      .delete({ id: In(permissions.map((permission) => seedUuid(`permission-${permission.key}`))) });
    await manager.getRepository(User).delete({ id: In(allSeedUsers.map((user) => user.id)) });
    await manager
      .getRepository(Role)
      .delete({ id: In(allSeedUsers.map((user) => seedUuid(`role-${user.roleName}`))) });
  });
}

async function seedRolesAndUsers(dataSource: DataSource): Promise<SeedContext> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);
  const rolePermissionRepository = dataSource.getRepository(RolePermission);
  const userRepository = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const superAdminPasswordHash = await bcrypt.hash(superAdminUser.password, 10);

  const roles: Role[] = [];
  for (const user of allSeedUsers) {
    const existingRole = await roleRepository.findOne({
      where: { name: user.roleName },
    });
    roles.push(
      await roleRepository.save(
        roleRepository.create({
          ...(existingRole ?? { id: seedUuid(`role-${user.roleName}`) }),
          name: user.roleName,
          description: `Development seed role for ${user.roleName}`,
        }),
      ),
    );
  }
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  const savedPermissions = await saveEntities(
    permissionRepository,
    permissions.map((permission) =>
      permissionRepository.create({
        id: seedUuid(`permission-${permission.key}`),
        key: permission.key,
        description: permission.description,
        deletedAt: null,
      }),
    ),
  );
  const permissionsByKey = new Map(
    savedPermissions.map((permission) => [permission.key, permission]),
  );

  await saveEntities(
    rolePermissionRepository,
    Object.entries(permissionsByRoleName).flatMap(([roleName, permissionKeys]) => {
      const role = rolesByName.get(roleName);
      if (!role) {
        return [];
      }

      return permissionKeys.map((permissionKey) =>
        rolePermissionRepository.create({
          roleId: role.id,
          permissionId: permissionsByKey.get(permissionKey)?.id,
        }),
      );
    }),
  );

  const savedUsers: User[] = [];
  for (const user of allSeedUsers) {
    const existingUser = await userRepository.findOne({
      where: { email: user.email },
    });
    savedUsers.push(
      await userRepository.save(
        userRepository.create({
          id: existingUser?.id ?? user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          passwordHash:
            user.email === superAdminUser.email ? superAdminPasswordHash : passwordHash,
          roleId: rolesByName.get(user.roleName)?.id,
          status: 'active',
        }) as unknown as User,
      ),
    );
  }

  return {
    rolesByName,
    usersByEmail: new Map(savedUsers.map((user) => [user.email, user])),
    projectsByName: new Map(),
  };
}

async function seedProjectsAndMemberships(dataSource: DataSource, context: SeedContext) {
  const projectRepository = dataSource.getRepository(Project);
  const memberRepository = dataSource.getRepository(ProjectMember);

  const savedProjects = await saveEntities(
    projectRepository,
    projects.map((project) =>
      projectRepository.create({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        targetEndDate: project.targetEndDate,
        ownerId: context.usersByEmail.get(project.ownerEmail)?.id,
        businessOwnerId: context.usersByEmail.get(project.businessOwnerEmail)?.id,
        executiveSponsorId: context.usersByEmail.get(project.executiveSponsorEmail)?.id,
        deliveryLeadId: context.usersByEmail.get(project.deliveryLeadEmail)?.id,
        deletedAt: null,
      }),
    ),
  );
  context.projectsByName = new Map(savedProjects.map((project) => [project.name, project]));

  await saveEntities(
    memberRepository,
    memberships.map(([projectName, email, role]) =>
      memberRepository.create({
        id: seedUuid(`membership-${projectName}-${email}`),
        projectId: context.projectsByName.get(projectName)?.id,
        userId: context.usersByEmail.get(email)?.id,
        role,
        deletedAt: null,
      }),
    ),
  );
}

async function seedTasks(dataSource: DataSource, context: SeedContext) {
  const taskRepository = dataSource.getRepository(Task);
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
  const tasks: Task[] = [];
  for (const [projectName, titles] of Object.entries(taskTitlesByProject)) {
    const project = context.projectsByName.get(projectName);
    for (const title of titles) {
      const month = 6 + Math.floor(index / 8);
      const day = 8 + (index % 18);
      const dueDay = Math.min(day + 10, 28);
      const assignee = context.usersByEmail.get(assignees[index % assignees.length]);
      tasks.push(
        taskRepository.create({
          id: seedUuid(`task-${index + 1}`),
          projectId: project?.id,
          title,
          description: `Development seed task for ${projectName}.`,
          assigneeId: assignee?.id,
          status: statuses[index % statuses.length],
          priority: priorities[index % priorities.length],
          startDate: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          dueDate: `2026-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
          deletedAt: null,
        }),
      );
      index += 1;
    }
  }

  await saveEntities(taskRepository, tasks);
}

async function seedRaid(dataSource: DataSource, context: SeedContext) {
  const riskRepository = dataSource.getRepository(Risk);
  const issueRepository = dataSource.getRepository(Issue);
  const assumptionRepository = dataSource.getRepository(Assumption);
  const dependencyRepository = dataSource.getRepository(Dependency);
  const projectCycle = projects.map((project) => context.projectsByName.get(project.name));
  const ownerCycle = users.map((user) => context.usersByEmail.get(user.email));

  await saveEntities(
    riskRepository,
    riskTitles.map((title, index) =>
      riskRepository.create({
        id: seedUuid(`risk-${index + 1}`),
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
        deletedAt: null,
      }),
    ),
  );

  await saveEntities(
    issueRepository,
    issueTitles.map((title, index) =>
      issueRepository.create({
        id: seedUuid(`issue-${index + 1}`),
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
        deletedAt: null,
      }),
    ),
  );

  await saveEntities(
    assumptionRepository,
    assumptionTitles.map((title, index) =>
      assumptionRepository.create({
        id: seedUuid(`assumption-${index + 1}`),
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
        deletedAt: null,
      }),
    ),
  );

  await saveEntities(
    dependencyRepository,
    dependencyTitles.map((title, index) =>
      dependencyRepository.create({
        id: seedUuid(`dependency-${index + 1}`),
        projectId: projectCycle[index % projectCycle.length]?.id,
        type: RaidType.Dependency,
        title,
        description: `Development seed dependency for ${
          projectCycle[index % projectCycle.length]?.name
        }.`,
        ownerId: ownerCycle[(index + 4) % ownerCycle.length]?.id,
        status: index % 2 === 0 ? 'open' : 'in_progress',
        dependsOn: ['Identity Platform', 'Procurement', 'Network Engineering', 'Security Architecture', 'Data Governance'][index],
        dueDate: `2026-${String(7 + index).padStart(2, '0')}-15`,
        deletedAt: null,
      }),
    ),
  );
}

function membershipIds() {
  return memberships.map(([projectName, email]) => seedUuid(`membership-${projectName}-${email}`));
}

function taskIds() {
  return Array.from({ length: 30 }, (_, index) => seedUuid(`task-${index + 1}`));
}

function riskIds() {
  return Array.from({ length: 10 }, (_, index) => seedUuid(`risk-${index + 1}`));
}

function issueIds() {
  return Array.from({ length: 5 }, (_, index) => seedUuid(`issue-${index + 1}`));
}

function assumptionIds() {
  return Array.from({ length: 5 }, (_, index) => seedUuid(`assumption-${index + 1}`));
}

function dependencyIds() {
  return Array.from({ length: 5 }, (_, index) => seedUuid(`dependency-${index + 1}`));
}

async function main() {
  const shouldReset = process.argv.includes('--reset');
  await appDataSource.initialize();
  verifyRequiredEntities(appDataSource);

  try {
    if (shouldReset) {
      await resetSeedData(appDataSource);
    }

    await appDataSource.transaction(async () => {
      const context = await seedRolesAndUsers(appDataSource);
      await seedProjectsAndMemberships(appDataSource, context);
      await seedTasks(appDataSource, context);
      await seedRaid(appDataSource, context);
    });

    console.log(`${shouldReset ? 'Seed reset and reload' : 'Seed'} complete:`);
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
