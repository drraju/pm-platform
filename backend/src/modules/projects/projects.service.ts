import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../../common/enums/project-role.enum';
import { ProjectHealthDto } from '../health/dto/project-health.dto';
import { ProjectHealthService } from '../health/project-health.service';
import { Task } from '../tasks/entities/task.entity';
import { Assumption } from '../raid/entities/assumption.entity';
import { Dependency } from '../raid/entities/dependency.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { User } from '../users/entities/user.entity';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { ProjectTaskQueryDto } from './dto/project-task-query.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { ProjectMember } from './entities/project-member.entity';
import { Project } from './entities/project.entity';

type ProjectWithHealth = Project & { health: ProjectHealthDto };
type AuthenticatedActor = {
  userId: string;
  email: string;
  roleId: string;
};

const managerRoleNames = new Set(['Program Manager', 'Project Manager']);
const projectManagerRoles = new Set([ProjectRole.Owner, ProjectRole.Manager]);
const teamMemberEditableTaskFields = new Set([
  'assigneeId',
  'remarks',
  'percentComplete',
  'status',
]);

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  create(createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsRepository.save(
      this.projectsRepository.create(createProjectDto),
    );
  }

  async findAll(): Promise<ProjectWithHealth[]> {
    const projects = await this.projectsRepository.find({
      order: { createdAt: 'DESC' },
      relations: { issues: true, owner: true, risks: true, tasks: true },
    });

    return projects.map((project) => this.withHealth(project));
  }

  async findOne(id: string): Promise<ProjectWithHealth> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        assumptions: { owner: true },
        dependencies: { owner: true },
        issues: { owner: true },
        members: { user: { role: true } },
        owner: true,
        risks: { owner: true },
        tasks: { assignee: true },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return this.withHealth(project);
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findProjectEntity(id);
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findProjectEntity(id);
    await this.projectsRepository.softRemove(project);
  }

  async addMember(
    projectId: string,
    createProjectMemberDto: CreateProjectMemberDto,
    actor?: AuthenticatedActor,
  ): Promise<ProjectMemberResponseDto> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);
    await this.ensureUserExists(createProjectMemberDto.userId);

    const existingMember = await this.projectMembersRepository.findOne({
      where: {
        projectId,
        userId: createProjectMemberDto.userId,
      },
    });
    if (existingMember) {
      throw new ConflictException('User is already a project member');
    }

    const member = this.projectMembersRepository.create({
      projectId,
      userId: createProjectMemberDto.userId,
      role: createProjectMemberDto.role ?? ProjectRole.Contributor,
    });

    const savedMember = await this.projectMembersRepository.save(member);
    return this.toProjectMemberResponse(
      await this.findMember(projectId, savedMember.id),
    );
  }

  async findMembers(projectId: string): Promise<ProjectMemberResponseDto[]> {
    await this.ensureProjectExists(projectId);

    const members = await this.projectMembersRepository.find({
      order: { createdAt: 'ASC' },
      relations: { user: { role: true } },
      where: { projectId },
    });

    return members.map((member) => this.toProjectMemberResponse(member));
  }

  async updateMember(
    projectId: string,
    memberId: string,
    updateProjectMemberDto: UpdateProjectMemberDto,
    actor?: AuthenticatedActor,
  ): Promise<ProjectMemberResponseDto> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);

    const member = await this.findMember(projectId, memberId);
    member.role = updateProjectMemberDto.role;

    const savedMember = await this.projectMembersRepository.save(member);
    return this.toProjectMemberResponse(
      await this.findMember(projectId, savedMember.id),
    );
  }

  async removeMember(
    projectId: string,
    memberId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);

    const member = await this.findMember(projectId, memberId);
    await this.projectMembersRepository.softRemove(member);
  }

  async findProjectTasks(
    projectId: string,
    query: ProjectTaskQueryDto = {},
  ): Promise<Task[]> {
    await this.ensureProjectExists(projectId);

    return this.tasksRepository.find({
      order: { createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        projectId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
    });
  }

  async createProjectTask(
    projectId: string,
    createProjectTaskDto: CreateProjectTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);
    await this.validateAssigneeMembership(
      projectId,
      createProjectTaskDto.assigneeId,
    );

    const task = this.tasksRepository.create({
      ...createProjectTaskDto,
      projectId,
    });

    return this.tasksRepository.save(task);
  }

  async updateProjectTask(
    projectId: string,
    taskId: string,
    updateProjectTaskDto: UpdateProjectTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    const task = await this.findProjectTask(projectId, taskId);
    await this.ensureCanUpdateTask(task, updateProjectTaskDto, actor);
    await this.validateAssigneeMembership(
      projectId,
      updateProjectTaskDto.assigneeId,
    );
    Object.assign(task, updateProjectTaskDto, { projectId });

    return this.tasksRepository.save(task);
  }

  async removeProjectTask(
    projectId: string,
    taskId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);

    const task = await this.findProjectTask(projectId, taskId);
    await this.tasksRepository.softRemove(task);
  }

  async findProjectRisks(projectId: string): Promise<Risk[]> {
    const project = await this.findOne(projectId);
    return project.risks ?? [];
  }

  async findProjectIssues(projectId: string): Promise<Issue[]> {
    const project = await this.findOne(projectId);
    return project.issues ?? [];
  }

  async findProjectAssumptions(projectId: string): Promise<Assumption[]> {
    const project = await this.findOne(projectId);
    return project.assumptions ?? [];
  }

  async findProjectDependencies(projectId: string): Promise<Dependency[]> {
    const project = await this.findOne(projectId);
    return project.dependencies ?? [];
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.projectsRepository.findOne({
      select: { id: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private async findProjectEntity(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        assumptions: { owner: true },
        dependencies: { owner: true },
        issues: { owner: true },
        members: { user: { role: true } },
        owner: true,
        risks: { owner: true },
        tasks: { assignee: true },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      select: { id: true },
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  private async findMember(
    projectId: string,
    memberIdOrUserId: string,
  ): Promise<ProjectMember> {
    const member = await this.projectMembersRepository.findOne({
      relations: { user: { role: true } },
      where: [
        { id: memberIdOrUserId, projectId },
        { projectId, userId: memberIdOrUserId },
      ],
    });
    if (!member) {
      throw new NotFoundException(
        `Project member ${memberIdOrUserId} not found for project ${projectId}`,
      );
    }

    return member;
  }

  private async findProjectTask(
    projectId: string,
    taskId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      relations: { assignee: true, project: true },
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }

    return task;
  }

  private async validateAssigneeMembership(
    projectId: string,
    assigneeId?: string | null,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }

    await this.ensureUserExists(assigneeId);

    const membership = await this.projectMembersRepository.findOne({
      select: { id: true },
      where: { projectId, userId: assigneeId },
    });
    if (!membership) {
      throw new ConflictException('Assignee must be a project member');
    }
  }

  private async ensureCanManageProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    if (!actor) {
      return;
    }

    if (await this.isProgramOrProjectManager(actor.roleId)) {
      return;
    }

    const membership = await this.projectMembersRepository.findOne({
      select: { id: true, role: true },
      where: { projectId, userId: actor.userId },
    });
    if (membership && projectManagerRoles.has(membership.role)) {
      return;
    }

    throw new ForbiddenException('Project manager access is required');
  }

  private async ensureCanUpdateTask(
    task: Task,
    updateProjectTaskDto: UpdateProjectTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    if (!actor) {
      return;
    }

    if (await this.canManageTask(task.projectId, actor)) {
      return;
    }

    if (task.assigneeId !== actor.userId) {
      throw new ForbiddenException(
        'Only assigned team members can update this task',
      );
    }

    const disallowedFields = Object.keys(updateProjectTaskDto).filter(
      (field) => !teamMemberEditableTaskFields.has(field),
    );
    if (disallowedFields.length > 0) {
      throw new ForbiddenException(
        'Team members can only update status, remarks, percent complete, or assignee',
      );
    }
  }

  private async canManageTask(
    projectId: string,
    actor: AuthenticatedActor,
  ): Promise<boolean> {
    try {
      await this.ensureCanManageProject(projectId, actor);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return false;
      }
      throw error;
    }
  }

  private async isProgramOrProjectManager(roleId: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      relations: { role: true },
      where: { roleId } as FindOptionsWhere<User>,
    });
    return user?.role?.name ? managerRoleNames.has(user.role.name) : false;
  }

  private toProjectMemberResponse(
    member: ProjectMember,
  ): ProjectMemberResponseDto {
    const displayName = member.user
      ? [member.user.firstName, member.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || member.user.email
      : undefined;

    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
      user: member.user
        ? {
            id: member.user.id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            displayName: displayName ?? member.user.email,
            role: member.user.role?.name ?? null,
          }
        : null,
    };
  }

  private withHealth(project: Project): ProjectWithHealth {
    return Object.assign(project, {
      health: this.projectHealthService.calculate({
        issues: project.issues,
        risks: project.risks,
        tasks: project.tasks,
      }),
    });
  }
}
