import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRole } from '../../common/enums/project-role.enum';
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
  ) {}

  create(createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsRepository.save(
      this.projectsRepository.create(createProjectDto),
    );
  }

  findAll(): Promise<Project[]> {
    return this.projectsRepository.find({
      order: { createdAt: 'DESC' },
      relations: { owner: true },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        assumptions: { owner: true },
        dependencies: { owner: true },
        issues: { owner: true },
        members: { user: true },
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

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.projectsRepository.softRemove(project);
  }

  async addMember(
    projectId: string,
    createProjectMemberDto: CreateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    await this.ensureProjectExists(projectId);
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
    return this.toProjectMemberResponse(savedMember);
  }

  async findMembers(projectId: string): Promise<ProjectMemberResponseDto[]> {
    await this.ensureProjectExists(projectId);

    const members = await this.projectMembersRepository.find({
      order: { createdAt: 'ASC' },
      relations: { user: true },
      where: { projectId },
    });

    return members.map((member) => this.toProjectMemberResponse(member));
  }

  async updateMember(
    projectId: string,
    userId: string,
    updateProjectMemberDto: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    await this.ensureProjectExists(projectId);
    await this.ensureUserExists(userId);

    const member = await this.findMember(projectId, userId);
    member.role = updateProjectMemberDto.role;

    const savedMember = await this.projectMembersRepository.save(member);
    return this.toProjectMemberResponse(savedMember);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.ensureProjectExists(projectId);
    await this.ensureUserExists(userId);

    const member = await this.findMember(projectId, userId);
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
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    await this.validateAssigneeMembership(projectId, createProjectTaskDto.assigneeId);

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
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    await this.validateAssigneeMembership(projectId, updateProjectTaskDto.assigneeId);

    const task = await this.findProjectTask(projectId, taskId);
    Object.assign(task, updateProjectTaskDto, { projectId });

    return this.tasksRepository.save(task);
  }

  async removeProjectTask(projectId: string, taskId: string): Promise<void> {
    await this.ensureProjectExists(projectId);

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
    userId: string,
  ): Promise<ProjectMember> {
    const member = await this.projectMembersRepository.findOne({
      relations: { user: true },
      where: { projectId, userId },
    });
    if (!member) {
      throw new NotFoundException(
        `Project member ${userId} not found for project ${projectId}`,
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

  private toProjectMemberResponse(
    member: ProjectMember,
  ): ProjectMemberResponseDto {
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
          }
        : null,
    };
  }
}
