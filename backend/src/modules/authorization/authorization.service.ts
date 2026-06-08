import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../../common/enums/project-role.enum';
import { ProjectVisibilityLevel } from '../../common/enums/project-visibility-level.enum';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Role } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { PermissionKey } from './permissions';

export type AuthenticatedPrincipal = {
  userId: string;
  email: string;
  roleId: string;
};

export type EffectiveUser = {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
};

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

export const ExternalRoleName = {
  Partner: 'Partner',
  Customer: 'Customer',
} as const;

const teamMemberPermissions = [
  PermissionKey.DashboardReadSelf,
  PermissionKey.ProjectsReadAssigned,
  PermissionKey.ProjectMembersRead,
  PermissionKey.ProjectTasksRead,
  PermissionKey.ProjectTasksUpdateOwn,
  PermissionKey.RaidReadAssigned,
  PermissionKey.RaidCreate,
  PermissionKey.RaidUpdateOwn,
];

export const defaultPermissionsByRole: Record<string, PermissionKey[]> = {
  Admin: Object.values(PermissionKey),
  Executive: [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ExecutiveSummaryRead,
    PermissionKey.PortfolioSummaryRead,
    PermissionKey.ProjectsReadAll,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectTasksRead,
    PermissionKey.RaidReadAll,
  ],
  PMO: [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ExecutiveSummaryRead,
    PermissionKey.PortfolioSummaryRead,
    PermissionKey.ProjectsReadAll,
    PermissionKey.ProjectsCreate,
    PermissionKey.ProjectsUpdate,
    PermissionKey.ProjectsDelete,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectMembersManage,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksCreate,
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksDelete,
    PermissionKey.RaidReadAll,
    PermissionKey.RaidCreate,
    PermissionKey.RaidUpdateAny,
    PermissionKey.RaidDelete,
  ],
  'Portfolio Manager': [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ExecutiveSummaryRead,
    PermissionKey.PortfolioSummaryRead,
    PermissionKey.ProjectsReadAll,
    PermissionKey.ProjectsCreate,
    PermissionKey.ProjectsUpdate,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectMembersManage,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksCreate,
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksDelete,
    PermissionKey.RaidReadAll,
    PermissionKey.RaidCreate,
    PermissionKey.RaidUpdateAny,
  ],
  'Program Manager': [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ExecutiveSummaryRead,
    PermissionKey.PortfolioSummaryRead,
    PermissionKey.ProjectsReadAll,
    PermissionKey.ProjectsCreate,
    PermissionKey.ProjectsUpdate,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectMembersManage,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksCreate,
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksDelete,
    PermissionKey.RaidReadAll,
    PermissionKey.RaidCreate,
    PermissionKey.RaidUpdateAny,
  ],
  'Project Manager': [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ProjectsReadAssigned,
    PermissionKey.ProjectsCreate,
    PermissionKey.ProjectsUpdate,
    PermissionKey.ProjectsDelete,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectMembersManage,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksCreate,
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksUpdateOwn,
    PermissionKey.ProjectTasksDelete,
    PermissionKey.RaidReadAssigned,
    PermissionKey.RaidCreate,
    PermissionKey.RaidUpdateAny,
    PermissionKey.RaidUpdateOwn,
    PermissionKey.RaidDelete,
  ],
  'Delivery Lead': [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ProjectsReadAssigned,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksCreate,
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksUpdateOwn,
    PermissionKey.RaidReadAssigned,
    PermissionKey.RaidCreate,
    PermissionKey.RaidUpdateAny,
    PermissionKey.RaidUpdateOwn,
  ],
  'Technical Lead': [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ProjectsReadAssigned,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksCreate,
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksUpdateOwn,
    PermissionKey.RaidReadAssigned,
    PermissionKey.RaidCreate,
    PermissionKey.RaidUpdateAny,
    PermissionKey.RaidUpdateOwn,
  ],
  Engineer: [...teamMemberPermissions],
  'QA Engineer': [...teamMemberPermissions],
  Contributor: [...teamMemberPermissions],
  'Team Member': [...teamMemberPermissions],
  Viewer: [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ProjectsReadAssigned,
    PermissionKey.ProjectMembersRead,
    PermissionKey.ProjectTasksRead,
    PermissionKey.RaidReadAssigned,
  ],
  Partner: [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ProjectsReadAssigned,
    PermissionKey.ProjectTasksRead,
    PermissionKey.ProjectTasksUpdateOwn,
  ],
  Customer: [
    PermissionKey.DashboardReadSelf,
    PermissionKey.ProjectsReadAssigned,
    PermissionKey.ProjectTasksRead,
  ],
};

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
  ) {}

  async getEffectiveUser(userId: string): Promise<EffectiveUser> {
    const user = await this.usersRepository.findOne({
      relations: { role: { permissions: true } },
      where: { id: userId },
    });
    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }
    if (user.status !== 'active') {
      throw new ForbiddenException('User is not active');
    }

    const role =
      user.role ??
      (await this.rolesRepository.findOne({
        relations: { permissions: true },
        where: { id: user.roleId },
      }));
    if (!role) {
      throw new ForbiddenException('User role not found');
    }

    const persistedPermissions = (role.permissions ?? []).map(
      (permission) => permission.key,
    ) as PermissionKey[];
    const fallbackPermissions =
      role.name === 'Admin' || role.name === SUPER_ADMIN_ROLE
        ? Object.values(PermissionKey)
        : ((defaultPermissionsByRole[role.name] ?? []) as PermissionKey[]);
    const permissionKeys = new Set<PermissionKey>(
      persistedPermissions.length > 0
        ? persistedPermissions
        : fallbackPermissions,
    );

    return {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: role.name,
      permissions: [...permissionKeys].sort(),
    };
  }

  hasPermission(user: EffectiveUser, permission: PermissionKey): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }
    return user.permissions.includes(permission);
  }

  hasAnyPermission(user: EffectiveUser, permissions: PermissionKey[]): boolean {
    return permissions.some((permission) =>
      this.hasPermission(user, permission),
    );
  }

  assertHasAnyPermission(user: EffectiveUser, permissions: PermissionKey[]) {
    if (this.isSuperAdmin(user)) {
      return;
    }
    if (!this.hasAnyPermission(user, permissions)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  async assertCanReadProject(user: EffectiveUser, projectId: string) {
    if (this.isSuperAdmin(user)) {
      return;
    }
    if (this.hasPermission(user, PermissionKey.ProjectsReadAll)) {
      return;
    }

    await this.assertProjectMemberOrOwner(user.userId, projectId);
  }

  async assertCanReadProjectRaid(user: EffectiveUser, projectId: string) {
    if (this.isSuperAdmin(user)) {
      return;
    }
    this.assertHasAnyPermission(user, [
      PermissionKey.RaidReadAll,
      PermissionKey.RaidReadAssigned,
    ]);
    await this.assertCanReadProject(user, projectId);
  }

  async assertCanManageProjectMembers(user: EffectiveUser, projectId: string) {
    if (this.isSuperAdmin(user)) {
      return;
    }
    this.assertHasAnyPermission(user, [PermissionKey.ProjectMembersManage]);
    if (this.hasPermission(user, PermissionKey.ProjectsReadAll)) {
      return;
    }

    await this.assertProjectRole(user.userId, projectId, [
      ProjectRole.Owner,
      ProjectRole.Manager,
    ]);
  }

  async assertCanManageProjectTasks(user: EffectiveUser, projectId: string) {
    if (this.isSuperAdmin(user)) {
      return;
    }
    this.assertHasAnyPermission(user, [
      PermissionKey.ProjectTasksCreate,
      PermissionKey.ProjectTasksUpdateAny,
      PermissionKey.ProjectTasksDelete,
    ]);
    if (this.hasPermission(user, PermissionKey.ProjectsReadAll)) {
      return;
    }

    await this.assertProjectRole(user.userId, projectId, [
      ProjectRole.Owner,
      ProjectRole.Manager,
    ]);
  }

  async getAccessibleProjectIds(user: EffectiveUser): Promise<string[] | null> {
    if (this.isSuperAdmin(user)) {
      return null;
    }
    if (this.hasPermission(user, PermissionKey.ProjectsReadAll)) {
      return null;
    }

    const [ownedProjects, memberships] = await Promise.all([
      this.projectsRepository.find({
        select: { id: true },
        where: { ownerId: user.userId },
      }),
      this.projectMembersRepository.find({
        select: { projectId: true },
        where: { userId: user.userId },
      }),
    ]);

    return [
      ...new Set([
        ...ownedProjects.map((project) => project.id),
        ...memberships.map((membership) => membership.projectId),
      ]),
    ];
  }

  isExternalUser(user: EffectiveUser): boolean {
    return this.isPartnerUser(user) || this.isCustomerUser(user);
  }

  isSuperAdmin(user: EffectiveUser): boolean {
    return user.roleName === SUPER_ADMIN_ROLE;
  }

  isPartnerUser(user: EffectiveUser): boolean {
    return user.roleName === ExternalRoleName.Partner;
  }

  isCustomerUser(user: EffectiveUser): boolean {
    return user.roleName === ExternalRoleName.Customer;
  }

  isExternalVisibility(
    visibilityLevel?: ProjectVisibilityLevel | null,
  ): boolean {
    return (
      visibilityLevel === ProjectVisibilityLevel.Partner ||
      visibilityLevel === ProjectVisibilityLevel.Customer
    );
  }

  private async assertProjectMemberOrOwner(userId: string, projectId: string) {
    const project = await this.projectsRepository.findOne({
      select: { id: true, ownerId: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (project.ownerId === userId) {
      return;
    }

    const membership = await this.projectMembersRepository.findOne({
      select: { id: true },
      where: { projectId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('Project access denied');
    }
  }

  private async assertProjectRole(
    userId: string,
    projectId: string,
    roles: ProjectRole[],
  ) {
    const project = await this.projectsRepository.findOne({
      select: { id: true, ownerId: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    if (project.ownerId === userId) {
      return;
    }

    const membership = await this.projectMembersRepository.findOne({
      select: { id: true, role: true },
      where: { projectId, userId },
    });
    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenException('Project role access denied');
    }
  }
}
