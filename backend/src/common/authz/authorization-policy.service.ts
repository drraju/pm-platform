import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../enums/project-role.enum';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
import { Role } from '../../modules/users/entities/role.entity';
import { PermissionKey } from './permissions';

export type AuthorizationActor = {
  userId: string;
  email?: string;
  roleId: string;
};

const projectManagerMembershipRoles = new Set([
  ProjectRole.Owner,
  ProjectRole.Manager,
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
  ) {}

  async canViewProject(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor) {
      return true;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (!permissionKeys.has(PermissionKey.ProjectRead)) {
      return false;
    }

    if (this.hasGlobalProjectAccess(permissionKeys)) {
      return true;
    }

    const [ownsProject, membership, assignedTask] = await Promise.all([
      this.isProjectOwner(projectId, actor.userId),
      this.findMembership(projectId, actor.userId),
      this.shouldExpandProjectVisibilityFromTasks(permissionKeys)
        ? this.findAssignedTask(projectId, actor.userId)
        : Promise.resolve(null),
    ]);

    return Boolean(ownsProject || membership || assignedTask);
  }

  async canManageProject(
    projectId: string,
    actor?: AuthorizationActor,
  ): Promise<boolean> {
    if (!actor) {
      return false;
    }

    const permissionKeys = await this.getPermissionKeys(actor);
    if (!permissionKeys.has(PermissionKey.ProjectUpdate)) {
      return false;
    }

    return this.canManageProjectWithPermissions(projectId, actor, permissionKeys);
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

    return this.canManageProjectWithPermissions(projectId, actor, permissionKeys);
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

    return this.canManageProjectWithPermissions(projectId, actor, permissionKeys);
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

    return this.canManageProjectWithPermissions(projectId, actor, permissionKeys);
  }

  async canViewPortfolio(actor?: AuthorizationActor): Promise<boolean> {
    return this.hasPermission(actor, PermissionKey.PortfolioView);
  }

  async canViewExecutive(actor?: AuthorizationActor): Promise<boolean> {
    return this.hasPermission(actor, PermissionKey.ExecutiveView);
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

  private async canManageProjectWithPermissions(
    projectId: string,
    actor: AuthorizationActor,
    permissionKeys: Set<string>,
  ): Promise<boolean> {
    if (this.hasGlobalProjectAccess(permissionKeys)) {
      return true;
    }

    const [ownsProject, membership] = await Promise.all([
      this.isProjectOwner(projectId, actor.userId),
      this.findMembership(projectId, actor.userId),
    ]);

    return Boolean(
      ownsProject ||
        (membership && projectManagerMembershipRoles.has(membership.role)),
    );
  }

  private async isProjectOwner(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const project = await this.projectsRepository.findOne({
      select: { id: true },
      where: { id: projectId, ownerId: userId },
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

  private hasGlobalProjectAccess(permissionKeys: Set<string>) {
    return (
      permissionKeys.has(PermissionKey.ProjectRead) &&
      (permissionKeys.has(PermissionKey.PortfolioView) ||
        permissionKeys.has(PermissionKey.ExecutiveView) ||
        permissionKeys.has(PermissionKey.UserManage) ||
        permissionKeys.has(PermissionKey.RoleManage) ||
        permissionKeys.has(PermissionKey.PermissionManage))
    );
  }

  private hasAnyGrantedPermission(
    grantedPermissions: Set<string>,
    permissionKeys: PermissionKey[],
  ) {
    return permissionKeys.some((permissionKey) =>
      grantedPermissions.has(permissionKey),
    );
  }

  private async getPermissionKeys(actor: AuthorizationActor) {
    const role = await this.rolesRepository.findOne({
      relations: { permissions: true },
      where: { id: actor.roleId },
    });

    return new Set(role?.permissions?.map((permission) => permission.key) ?? []);
  }
}
