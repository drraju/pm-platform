import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectRole } from '../enums/project-role.enum';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
import { Role } from '../../modules/users/entities/role.entity';
import { UserRoleAssignment } from '../../modules/users/entities/user-role-assignment.entity';
import { PermissionKey } from './permissions';
import { UserRole } from '../enums/user-role.enum';
import { UserIdentityType } from '../enums/user-identity-type.enum';

export type AuthorizationActor = {
  userId: string;
  email?: string;
  identityType?: UserIdentityType;
  roleId: string;
};

const projectManagerMembershipRoles = new Set([
  ProjectRole.Owner,
  ProjectRole.Manager,
]);

const executiveDeniedLegacyProjectMutationPermissions = new Set<string>([
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
]);

const serviceDeniedProjectMutationPermissions = new Set<string>([
  PermissionKey.ProjectCreate,
  PermissionKey.ProjectDelete,
  PermissionKey.ProjectTeamManage,
  PermissionKey.ProjectUpdate,
  PermissionKey.RaidCreate,
  PermissionKey.RaidDelete,
  PermissionKey.RaidUpdate,
  PermissionKey.ResourceArchive,
  PermissionKey.ResourceAvailabilityArchive,
  PermissionKey.ResourceAvailabilityCreate,
  PermissionKey.ResourceAvailabilityUpdate,
  PermissionKey.ResourceAssignmentArchive,
  PermissionKey.ResourceAssignmentCreate,
  PermissionKey.ResourceAssignmentUpdate,
  PermissionKey.ResourceCapacityArchive,
  PermissionKey.ResourceCapacityCreate,
  PermissionKey.ResourceCapacityUpdate,
  PermissionKey.ResourceCreate,
  PermissionKey.ResourceSkillArchive,
  PermissionKey.ResourceSkillCreate,
  PermissionKey.ResourceSkillUpdate,
  PermissionKey.ResourceUpdate,
  PermissionKey.SkillArchive,
  PermissionKey.SkillCreate,
  PermissionKey.SkillUpdate,
  PermissionKey.TaskComment,
  PermissionKey.TaskCreate,
  PermissionKey.TaskDelete,
  PermissionKey.TaskReassign,
  PermissionKey.TaskUpdate,
  PermissionKey.AuthConfigure,
  PermissionKey.CustomerManage,
  PermissionKey.CustomerSuccessView,
  PermissionKey.ProgramView,
  PermissionKey.ProjectLead,
  PermissionKey.WorkUpdate,
]);

@Injectable()
export class AuthorizationPolicyService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRolesRepository: Repository<UserRoleAssignment>,
  ) {}

  async canViewProject(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (!permissionKeys.has(PermissionKey.ProjectRead)) {
      return false;
    }

    if (await this.isCustomerOnly(actor)) {
      return Boolean(await this.findMembership(projectId, actor.userId));
    }

    if (await this.hasCompanyProjectAccess(actor, permissionKeys)) {
      return true;
    }

    const [governsProject, membership, assignedTask] = await Promise.all([
      this.isProjectGovernor(projectId, actor.userId),
      this.findMembership(projectId, actor.userId),
      this.shouldExpandProjectVisibilityFromTasks(permissionKeys)
        ? this.findAssignedTask(projectId, actor.userId)
        : Promise.resolve(null),
    ]);

    return Boolean(governsProject || membership || assignedTask);
  }

  async canManageProject(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor || actor.identityType === UserIdentityType.Service) {
      return false;
    }
    if (await this.isExternalActor(actor)) {
      return false;
    }
    if (await this.isExecutiveOnly(actor)) {
      return false;
    }
    if (await this.isPlatformAdministrator(actor)) {
      return true;
    }
    if ((await this.getActorRoleNames(actor)).includes(UserRole.Admin)) {
      return true;
    }

    const membership = await this.findMembership(projectId, actor.userId);
    if (membership && projectManagerMembershipRoles.has(membership.role)) {
      return true;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (!permissionKeys.has(PermissionKey.ProjectUpdate)) {
      return false;
    }

    return this.canManageProjectWithPermissions(projectId, actor);
  }

  async canDeleteProject(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (!permissionKeys.has(PermissionKey.ProjectDelete)) {
      return false;
    }

    return this.canManageProjectWithPermissions(projectId, actor);
  }

  async canManageTask(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (
      !this.hasAnyGrantedPermission(permissionKeys, [
        PermissionKey.TaskCreate,
        PermissionKey.TaskUpdate,
        PermissionKey.TaskDelete,
        PermissionKey.TaskReassign,
        PermissionKey.TaskComment,
      ])
    ) {
      return false;
    }

    return this.canManageProjectWithPermissions(projectId, actor);
  }

  async canManageRaid(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (
      !this.hasAnyGrantedPermission(permissionKeys, [
        PermissionKey.RaidCreate,
        PermissionKey.RaidUpdate,
        PermissionKey.RaidDelete,
      ])
    ) {
      return false;
    }

    return this.canManageProjectWithPermissions(projectId, actor);
  }

  async canContributeRaid(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor || (await this.isExternalActor(actor))) {
      return false;
    }
    const permissionKeys = await this.getPermissionKeys(actor);
    if (!permissionKeys.has(PermissionKey.RaidCreate)) {
      return false;
    }
    if (await this.isPlatformAdministrator(actor)) {
      return true;
    }
    const [governsProject, membership] = await Promise.all([
      this.isProjectGovernor(projectId, actor.userId),
      this.findMembership(projectId, actor.userId),
    ]);
    return Boolean(governsProject || membership);
  }

  async canViewPortfolio(actor?: AuthorizationActor): Promise<boolean> {
    return this.hasPermission(actor, PermissionKey.PortfolioView);
  }

  async canViewExecutive(actor?: AuthorizationActor): Promise<boolean> {
    return this.hasPermission(actor, PermissionKey.ExecutiveView);
  }

  async canManageRolePermissions(
    actor: AuthorizationActor | undefined,
  ): Promise<boolean> {
    return actor ? this.isPlatformAdministrator(actor) : false;
  }

  async canManageRoles(
    actor: AuthorizationActor | undefined,
  ): Promise<boolean> {
    return actor ? this.isPlatformAdministrator(actor) : false;
  }

  async hasPermission(
    actor: AuthorizationActor | undefined,
    permissionKey: PermissionKey,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    return permissionKeys.has(permissionKey);
  }

  async hasAnyPermission(
    actor: AuthorizationActor | undefined,
    permissionKeys: PermissionKey[],
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const grantedPermissions = await this.getPermissionKeys(actor);
    return this.hasAnyGrantedPermission(grantedPermissions, permissionKeys);
  }

  async getGrantedPermissionKeys(
    actor: AuthorizationActor | undefined,
  ): Promise<Set<string>> {
    if (!actor) {
      return new Set();
    }

    return this.getPermissionKeys(actor);
  }

  async getActorRoleName(
    actor: AuthorizationActor | undefined,
  ): Promise<string | null> {
    if (!actor) {
      return null;
    }
    const role = await this.rolesRepository.findOne({
      select: { id: true, name: true },
      where: { id: actor.roleId },
    });
    return role?.name ?? null;
  }

  async isExternalActor(
    actor: AuthorizationActor | undefined,
  ): Promise<boolean> {
    const roleNames = await this.getActorRoleNames(actor);
    return (
      roleNames.length > 0 &&
      roleNames.every(
        (roleName) =>
          roleName === UserRole.Customer || roleName === UserRole.Partner,
      )
    );
  }

  async canMutateProjectDomain(
    actor: AuthorizationActor | undefined,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    if (actor.identityType === UserIdentityType.Service) {
      return false;
    }

    const roleNames = await this.getActorRoleNames(actor);
    if (roleNames.length === 0) {
      return true;
    }
    return roleNames.some(
      (roleName) =>
        roleName !== UserRole.Executive && roleName !== UserRole.Customer,
    );
  }

  private async canManageProjectWithPermissions(
    projectId: string,
    actor: AuthorizationActor,
  ): Promise<boolean> {
    if (await this.isExternalActor(actor)) {
      return false;
    }
    if (await this.isPlatformAdministrator(actor)) {
      return true;
    }

    const [governsProject, membership] = await Promise.all([
      this.isProjectGovernor(projectId, actor.userId),
      this.findMembership(projectId, actor.userId),
    ]);

    return Boolean(
      governsProject ||
      (membership && projectManagerMembershipRoles.has(membership.role)),
    );
  }

  private async isProjectGovernor(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const project = await this.projectsRepository.findOne({
      select: { id: true },
      where: [
        { id: projectId, ownerId: userId },
        { id: projectId, businessOwnerId: userId },
        { id: projectId, deliveryLeadId: userId },
        { id: projectId, executiveSponsorId: userId },
      ],
    });

    return Boolean(project);
  }

  private async findMembership(projectId: string, userId: string) {
    return this.projectMembersRepository.findOne({
      select: { id: true, role: true },
      where: { projectId, userId },
    });
  }

  private async findAssignedTask(projectId: string, userId: string) {
    return this.tasksRepository.findOne({
      select: { id: true },
      where: { projectId, assigneeId: userId },
    });
  }

  private shouldExpandProjectVisibilityFromTasks(permissionKeys: Set<string>) {
    return this.hasAnyGrantedPermission(permissionKeys, [
      PermissionKey.TaskUpdate,
      PermissionKey.TaskComment,
      PermissionKey.TaskReassign,
    ]);
  }

  private async hasCompanyProjectAccess(
    actor: AuthorizationActor,
    permissionKeys: Set<string>,
  ) {
    if (!permissionKeys.has(PermissionKey.ProjectRead)) {
      return false;
    }
    if (
      permissionKeys.has(PermissionKey.UserManage) ||
      permissionKeys.has(PermissionKey.RoleManage) ||
      permissionKeys.has(PermissionKey.PermissionManage)
    ) {
      return true;
    }
    const roleNames = await this.getActorRoleNames(actor);
    return roleNames.includes(UserRole.Executive);
  }

  async isPlatformAdministrator(actor: AuthorizationActor): Promise<boolean> {
    const roleNames = await this.getActorRoleNames(actor);
    return roleNames.includes(UserRole.PlatformAdmin);
  }

  async isCustomerOnly(
    actor: AuthorizationActor | undefined,
  ): Promise<boolean> {
    const roleNames = await this.getActorRoleNames(actor);
    return (
      roleNames.length > 0 &&
      roleNames.every((roleName) => roleName === UserRole.Customer)
    );
  }

  async isExecutiveOnly(
    actor: AuthorizationActor | undefined,
  ): Promise<boolean> {
    const roleNames = await this.getActorRoleNames(actor);
    return (
      roleNames.length > 0 &&
      roleNames.every((roleName) => roleName === UserRole.Executive)
    );
  }

  async getActorRoleNames(
    actor: AuthorizationActor | undefined,
  ): Promise<string[]> {
    const roles = await this.loadActorRoles(actor);
    return roles.map((role) => role.name);
  }

  async getProjectMembershipRole(
    projectId: string,
    userId: string,
  ): Promise<ProjectRole | null> {
    const membership = await this.findMembership(projectId, userId);
    return membership?.role ?? null;
  }

  private hasAnyGrantedPermission(
    grantedPermissions: Set<string>,
    permissionKeys: PermissionKey[],
  ) {
    return permissionKeys.some((permissionKey) =>
      grantedPermissions.has(permissionKey),
    );
  }

  private async loadActorRoles(
    actor: AuthorizationActor | undefined,
  ): Promise<Role[]> {
    if (!actor) {
      return [];
    }

    const assignments = this.userRolesRepository
      ? await this.userRolesRepository.find({
          where: { userId: actor.userId },
        })
      : [];
    const assignedRoleIds = [
      ...new Set(assignments.map((assignment) => assignment.roleId)),
    ];
    if (assignedRoleIds.length > 0) {
      return this.rolesRepository.find({
        relations: { permissions: true },
        where: { id: In(assignedRoleIds) },
      });
    }

    const primaryRole = await this.rolesRepository.findOne({
      relations: { permissions: true },
      where: { id: actor.roleId },
    });
    return primaryRole ? [primaryRole] : [];
  }

  private async getPermissionKeys(actor: AuthorizationActor) {
    const roles = await this.loadActorRoles(actor);
    const permissionKeys = roles.flatMap(
      (role) => role.permissions?.map((permission) => permission.key) ?? [],
    );
    const roleNames = roles.map((role) => role.name);
    const deniedPermissions = new Set<string>();
    if (actor.identityType === UserIdentityType.Service) {
      for (const permissionKey of serviceDeniedProjectMutationPermissions) {
        deniedPermissions.add(permissionKey);
      }
    }
    const exclusivelyRestricted =
      roleNames.length > 0 &&
      roleNames.every(
        (roleName) =>
          roleName === UserRole.Executive || roleName === UserRole.Customer,
      );
    if (exclusivelyRestricted) {
      for (const permissionKey of executiveDeniedLegacyProjectMutationPermissions) {
        deniedPermissions.add(permissionKey);
      }
    }

    return new Set(
      permissionKeys.filter(
        (permissionKey) => !deniedPermissions.has(permissionKey),
      ),
    );
  }
}
