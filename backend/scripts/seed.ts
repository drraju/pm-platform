import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';
import { ProjectRole } from '../src/common/enums/project-role.enum';
import { ProjectVisibilityLevel } from '../src/common/enums/project-visibility-level.enum';
import { RaidType } from '../src/common/enums/raid-type.enum';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import {
  defaultPermissionsByRole,
  SUPER_ADMIN_ROLE,
} from '../src/modules/authorization/authorization.service';
import { PermissionKey } from '../src/modules/authorization/permissions';
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

const seedNamespace = 'pm-platform-dev-seed-v2';
export const defaultPassword = 'Password123!';
export const defaultAdminPassword = 'Admin123!';
export const defaultSuperAdminPassword = 'Admin123!';

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

type SeedUser = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  roleName: string;
  username?: string | null;
};

const users: SeedUser[] = [
  {
    id: seedUuid('user-super-admin'),
    email: 'admin@example.com',
    username: 'admin',
    firstName: 'Super',
    lastName: 'Admin',
    roleName: SUPER_ADMIN_ROLE,
  },
  {
    id: seedUuid('user-admin'),
    email: 'platform.admin@example.com',
    username: 'platform-admin',
    firstName: 'Platform',
    lastName: 'Administrator',
    roleName: 'Admin',
  },
  {
    id: seedUuid('user-executive'),
    email: 'executive@example.com',
    firstName: 'Evelyn',
    lastName: 'Hart',
    roleName: 'Executive',
  },
  {
    id: seedUuid('user-portfolio-manager'),
    email: 'portfolio.manager@example.com',
    firstName: 'Miles',
    lastName: 'Chen',
    roleName: 'Portfolio Manager',
  },
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
    roleName: 'Team Member',
  },
  {
    id: seedUuid('user-engineer'),
    email: 'engineer@example.com',
    firstName: 'Priya',
    lastName: 'Kapoor',
    roleName: 'Team Member',
  },
  {
    id: seedUuid('user-qa-engineer'),
    email: 'qa.engineer@example.com',
    firstName: 'Elliot',
    lastName: 'Reed',
    roleName: 'Team Member',
  },
  {
    id: seedUuid('user-partner'),
    email: 'partner@example.com',
    firstName: 'Sofia',
    lastName: 'Marin',
    roleName: 'Partner',
  },
  {
    id: seedUuid('user-customer'),
    email: 'customer@example.com',
    firstName: 'Noah',
    lastName: 'Cole',
    roleName: 'Customer',
  },
];

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
  },
];

const memberships = [
  [
    'Customer Experience Platform Upgrade',
    'project.manager@example.com',
    ProjectRole.Owner,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Customer Experience Platform Upgrade',
    'delivery.lead@example.com',
    ProjectRole.Manager,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Customer Experience Platform Upgrade',
    'technical.lead@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Customer Experience Platform Upgrade',
    'engineer@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Customer Experience Platform Upgrade',
    'qa.engineer@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Customer Experience Platform Upgrade',
    'partner@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Partner,
  ],
  [
    'Customer Experience Platform Upgrade',
    'customer@example.com',
    ProjectRole.Viewer,
    ProjectVisibilityLevel.Customer,
  ],
  [
    'Observability Transformation Programme',
    'program.manager@example.com',
    ProjectRole.Owner,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Observability Transformation Programme',
    'technical.lead@example.com',
    ProjectRole.Manager,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Observability Transformation Programme',
    'engineer@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Observability Transformation Programme',
    'qa.engineer@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Data Centre Exit Programme',
    'delivery.lead@example.com',
    ProjectRole.Owner,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Data Centre Exit Programme',
    'project.manager@example.com',
    ProjectRole.Manager,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Data Centre Exit Programme',
    'technical.lead@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Data Centre Exit Programme',
    'engineer@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
  ],
  [
    'Data Centre Exit Programme',
    'qa.engineer@example.com',
    ProjectRole.Contributor,
    ProjectVisibilityLevel.Internal,
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

const seededRoleNames = [...new Set(users.map((user) => user.roleName))];

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
  defaultAdminPassword,
  defaultSuperAdminPassword,
  assumptionTitles,
  defaultPassword,
  dependencyTitles,
  issueTitles,
  memberships,
  projects,
  requiredEntityNames,
  riskTitles,
  taskTitlesByProject,
  users,
};

const appDataSource = new DataSource(createDataSourceOptions());

function permissionCategory(key: string): string {
  if (key.startsWith('dashboard:')) return 'Dashboard';
  if (key.startsWith('portfolio:')) return 'Portfolio';
  if (key.startsWith('executive:')) return 'Executive';
  if (key.startsWith('projects:')) return 'Projects';
  if (key.startsWith('project-tasks:')) return 'Tasks';
  if (key.startsWith('project-members:')) return 'Projects';
  if (key.startsWith('raid:')) return 'RAID';
  if (key.startsWith('users:')) return 'Users';
  if (key.startsWith('roles:')) return 'Roles';
  if (key.startsWith('notifications:')) return 'Notifications';
  return 'Administration';
}

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
    await manager
      .getRepository(ProjectMember)
      .delete({ id: In(membershipIds()) });
    await manager
      .getRepository(Project)
      .delete({ id: In(projects.map((project) => project.id)) });
    await manager.getRepository(RolePermission).delete({
      roleId: In(
        seededRoleNames.map((roleName) => seedUuid(`role-${roleName}`)),
      ),
    });
    await manager
      .getRepository(User)
      .delete({ id: In(users.map((user) => user.id)) });
    await manager.getRepository(Role).delete({
      id: In(seededRoleNames.map((roleName) => seedUuid(`role-${roleName}`))),
    });
  });
}

async function seedRolesAndUsers(dataSource: DataSource): Promise<SeedContext> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);
  const rolePermissionRepository = dataSource.getRepository(RolePermission);
  const userRepository = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const adminPasswordHash = await bcrypt.hash(defaultAdminPassword, 10);

  const roles: Role[] = [];
  for (const roleName of seededRoleNames) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleName },
    });
    roles.push(
      await roleRepository.save(
        roleRepository.create({
          ...(existingRole ?? { id: seedUuid(`role-${roleName}`) }),
          name: roleName,
          description: `Development seed role for ${roleName}`,
        }),
      ),
    );
  }
  const rolesByName = new Map(roles.map((role) => [role.name, role]));

  const permissionKeys = Object.values(PermissionKey);
  const savedPermissions = await saveEntities(
    permissionRepository,
    permissionKeys.map((key) =>
      permissionRepository.create({
        id: seedUuid(`permission-${key}`),
        key,
        category: permissionCategory(key),
        description: `Allows ${key}`,
        deletedAt: null,
      }),
    ),
  );
  const permissionsByKey = new Map(
    savedPermissions.map((permission) => [permission.key, permission]),
  );

  await saveEntities(
    rolePermissionRepository,
    seededRoleNames.flatMap((roleName) =>
      (defaultPermissionsByRole[roleName] ?? []).map((permissionKey) =>
        rolePermissionRepository.create({
          roleId: rolesByName.get(roleName)?.id,
          permissionId: permissionsByKey.get(permissionKey)?.id,
          createdAt: new Date(),
        }),
      ),
    ),
  );

  const savedUsers: User[] = [];
  for (const user of users) {
    const existingUser = await userRepository.findOne({
      where: user.username
        ? [{ email: user.email }, { username: user.username }]
        : { email: user.email },
    });
    savedUsers.push(
      await userRepository.save(
        userRepository.create({
          id: existingUser?.id ?? user.id,
          email: user.email,
          username: user.username ?? null,
          firstName: user.firstName,
          lastName: user.lastName,
          passwordHash:
            user.roleName === 'Admin' || user.roleName === SUPER_ADMIN_ROLE
              ? adminPasswordHash
              : passwordHash,
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

async function seedProjectsAndMemberships(
  dataSource: DataSource,
  context: SeedContext,
) {
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
        deletedAt: null,
      }),
    ),
  );
  context.projectsByName = new Map(
    savedProjects.map((project) => [project.name, project]),
  );

  await saveEntities(
    memberRepository,
    memberships.map(([projectName, email, role, visibilityLevel]) =>
      memberRepository.create({
        id: seedUuid(`membership-${projectName}-${email}`),
        projectId: context.projectsByName.get(projectName)?.id,
        userId: context.usersByEmail.get(email)?.id,
        role,
        visibilityLevel,
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
    'partner@example.com',
    'customer@example.com',
  ];

  let index = 0;
  const tasks: Task[] = [];
  for (const [projectName, titles] of Object.entries(taskTitlesByProject)) {
    const project = context.projectsByName.get(projectName);
    for (const title of titles) {
      const month = 6 + Math.floor(index / 8);
      const day = 8 + (index % 18);
      const dueDay = Math.min(day + 10, 28);
      const assignee = context.usersByEmail.get(
        assignees[index % assignees.length],
      );
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
  const projectCycle = projects.map((project) =>
    context.projectsByName.get(project.name),
  );
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
        dependsOn: [
          'Identity Platform',
          'Procurement',
          'Network Engineering',
          'Security Architecture',
          'Data Governance',
        ][index],
        dueDate: `2026-${String(7 + index).padStart(2, '0')}-15`,
        deletedAt: null,
      }),
    ),
  );
}

function membershipIds() {
  return memberships.map(([projectName, email]) =>
    seedUuid(`membership-${projectName}-${email}`),
  );
}

function taskIds() {
  return Array.from({ length: 30 }, (_, index) =>
    seedUuid(`task-${index + 1}`),
  );
}

function riskIds() {
  return Array.from({ length: 10 }, (_, index) =>
    seedUuid(`risk-${index + 1}`),
  );
}

function issueIds() {
  return Array.from({ length: 5 }, (_, index) =>
    seedUuid(`issue-${index + 1}`),
  );
}

function assumptionIds() {
  return Array.from({ length: 5 }, (_, index) =>
    seedUuid(`assumption-${index + 1}`),
  );
}

function dependencyIds() {
  return Array.from({ length: 5 }, (_, index) =>
    seedUuid(`dependency-${index + 1}`),
  );
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
    console.log(`- ${users.length} users`);
    console.log(`- ${seededRoleNames.length} roles`);
    console.log('- 3 projects');
    console.log(`- ${memberships.length} project memberships`);
    console.log('- 30 tasks');
    console.log('- 10 risks');
    console.log('- 5 issues');
    console.log('- 5 assumptions');
    console.log('- 5 dependencies');
    console.log(`Default development password: ${defaultPassword}`);
    console.log(`Default super admin username: admin`);
    console.log(
      `Default super admin temporary password: ${defaultSuperAdminPassword}`,
    );
    console.log(`Default admin user: platform.admin@example.com`);
    console.log(`Default admin temporary password: ${defaultAdminPassword}`);
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
