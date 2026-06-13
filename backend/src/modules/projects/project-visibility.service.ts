import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../users/entities/role.entity';
import { Task } from '../tasks/entities/task.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Project } from './entities/project.entity';

export type ProjectVisibilityActor = {
  userId: string;
  email?: string;
  roleId: string;
};

const allProjectRoleNames = new Set([
  'SUPER_ADMIN',
  'Admin',
  'Program Manager',
  'Portfolio Manager',
  'Executive',
]);

const taskAssignmentProjectRoleNames = new Set([
  'Project Manager',
  'Delivery Lead',
  'Team Member',
  'Technical Lead',
  'Engineer',
  'QA Engineer',
]);

@Injectable()
export class ProjectVisibilityService {
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

  async getVisibleProjects(actor?: ProjectVisibilityActor): Promise<Project[]> {
    const projectIds = await this.getVisibleProjectIds(actor);
    if (projectIds === 'all') {
      return this.projectsRepository.find({
        order: { createdAt: 'DESC' },
        relations: { issues: true, owner: true, risks: true, tasks: true },
      });
    }

    if (projectIds.length === 0) {
      return [];
    }

    return this.projectsRepository.find({
      order: { createdAt: 'DESC' },
      relations: { issues: true, owner: true, risks: true, tasks: true },
      where: { id: In(projectIds) },
    });
  }

  async getVisibleProjectIds(
    actor?: ProjectVisibilityActor,
  ): Promise<string[] | 'all'> {
    if (!actor) {
      return 'all';
    }

    const roleName = await this.getRoleName(actor.roleId);
    if (roleName && allProjectRoleNames.has(roleName)) {
      return 'all';
    }

    const shouldIncludeTaskAssignedProjects =
      roleName !== null && taskAssignmentProjectRoleNames.has(roleName);

    const [ownedProjects, memberships, assignedTasks] = await Promise.all([
      this.projectsRepository.find({
        select: { id: true },
        where: { ownerId: actor.userId },
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
        ...ownedProjects.map((project) => project.id),
        ...memberships.map((membership) => membership.projectId),
        ...assignedTasks.map((task) => task.projectId),
      ]),
    );
  }

  async canViewProject(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<boolean> {
    const visibleProjectIds = await this.getVisibleProjectIds(actor);
    return visibleProjectIds === 'all' || visibleProjectIds.includes(projectId);
  }

  async getRoleName(roleId: string): Promise<string | null> {
    const role = await this.rolesRepository.findOne({
      select: { id: true, name: true },
      where: { id: roleId },
    });

    return role?.name ?? null;
  }
}
