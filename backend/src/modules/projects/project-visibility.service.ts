import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { CanonicalCapabilityResolverService } from '../../common/authz/canonical-capability-resolver.service';
import { PermissionKey } from '../../common/authz/permissions';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { ProjectMember } from './entities/project-member.entity';
import { Project } from './entities/project.entity';

export type ProjectVisibilityActor = AuthorizationActor;

@Injectable()
export class ProjectVisibilityService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly canonicalCapabilityResolver: CanonicalCapabilityResolverService,
  ) {}

  async getVisibleProjects(actor?: ProjectVisibilityActor): Promise<Project[]> {
    const projectIds = await this.getVisibleProjectIds(actor);
    if (projectIds === 'all') {
      return this.projectsRepository.find({
        order: { createdAt: 'DESC' },
        relations: {
          customer: true,
          issues: true,
          members: { user: true },
          owner: true,
          risks: true,
          tasks: true,
        },
      });
    }

    if (projectIds.length === 0) {
      return [];
    }

    return this.projectsRepository.find({
      order: { createdAt: 'DESC' },
      relations: {
        customer: true,
        issues: true,
        members: { user: true },
        owner: true,
        risks: true,
        tasks: true,
      },
      where: { id: In(projectIds) },
    });
  }

  async getVisibleProjectIds(
    actor?: ProjectVisibilityActor,
  ): Promise<string[] | 'all'> {
    if (!actor) {
      return [];
    }

    if (
      !(await this.authorizationPolicyService.hasPermission(
        actor,
        PermissionKey.ProjectRead,
      ))
    ) {
      return [];
    }

    if (await this.hasCompanyWideVisibility(actor)) {
      return 'all';
    }

    const roleNames = await this.authorizationPolicyService.getActorRoleNames(actor);
    if (roleNames.includes(UserRole.ProgramManager)) {
      return this.programProjectIds(actor.userId);
    }

    const shouldIncludeTaskAssignedProjects =
      await this.authorizationPolicyService.hasAnyPermission(actor, [
        PermissionKey.TaskUpdate,
        PermissionKey.TaskComment,
        PermissionKey.TaskReassign,
      ]);

    const [governedProjects, memberships, assignedTasks] = await Promise.all([
      this.projectsRepository.find({
        select: { id: true },
        where: [
          { ownerId: actor.userId },
          { businessOwnerId: actor.userId },
          { deliveryLeadId: actor.userId },
          { executiveSponsorId: actor.userId },
        ],
      }),
      this.projectMembersRepository.find({
        select: { projectId: true },
        where: { userId: actor.userId },
      }),
      shouldIncludeTaskAssignedProjects
        ? this.tasksRepository.find({
            select: { projectId: true },
            where: { assigneeId: actor.userId },
          })
        : Promise.resolve([]),
    ]);

    return Array.from(
      new Set([
        ...governedProjects.map((project) => project.id),
        ...memberships.map((membership) => membership.projectId),
        ...assignedTasks.map((task) => task.projectId),
      ]),
    );
  }

  async canViewProject(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<boolean> {
    if (actor && (await this.isProgramScoped(actor))) {
      const projectIds = await this.getVisibleProjectIds(actor);
      return Array.isArray(projectIds) && projectIds.includes(projectId);
    }

    const legacyAllowed = await this.authorizationPolicyService.canViewProject(
      projectId,
      actor,
    );

    if (!actor) {
      return legacyAllowed;
    }

    return this.canonicalCapabilityResolver.compareWithLegacy({
      legacyAllowed,
      resolverInput: {
        actor,
        capability: 'project.view',
        resource: {
          projectId,
          type: 'project',
        },
      },
    });
  }

  private async programProjectIds(userId: string) {
    const rows: Array<{ id: string }> = await this.projectsRepository.query(
      `SELECT project.id
       FROM projects project
       INNER JOIN programs program ON program.id = project.program_id
       WHERE program.owner_id = $1
         AND program.deleted_at IS NULL
         AND project.deleted_at IS NULL`,
      [userId],
    );
    return rows.map((row) => row.id);
  }

  private async isProgramScoped(actor: ProjectVisibilityActor) {
    if (await this.hasCompanyWideVisibility(actor)) {
      return false;
    }
    const roleNames = await this.authorizationPolicyService.getActorRoleNames(actor);
    return roleNames.includes(UserRole.ProgramManager);
  }

  private async hasCompanyWideVisibility(actor: ProjectVisibilityActor) {
    const roleNames =
      await this.authorizationPolicyService.getActorRoleNames(actor);
    if (roleNames.includes(UserRole.Executive)) {
      return true;
    }
    return this.authorizationPolicyService.hasAnyPermission(actor, [
      PermissionKey.UserManage,
      PermissionKey.RoleManage,
      PermissionKey.PermissionManage,
    ]);
  }
}
