import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../common/authz/permissions';
import { ProjectRole } from '../../common/enums/project-role.enum';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { ProjectHealthDto } from '../health/dto/project-health.dto';
import { ProjectHealthService } from '../health/project-health.service';
import { CreateProjectBaselineDto } from './dto/create-project-baseline.dto';
import { ProjectBaselineTask } from './entities/project-baseline-task.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { CreateTaskDependencyDto } from '../tasks/dto/create-task-dependency.dto';
import { UpdateTaskDependencyDto } from '../tasks/dto/update-task-dependency.dto';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import {
  countPlanningItems,
  decoratePlanningTasks,
} from '../tasks/planning-rollup';
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
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from './project-visibility.service';

type ProjectWithHealth = Project & { health: ProjectHealthDto };
type AuthenticatedActor = AuthorizationActor;
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
    @InjectRepository(ProjectBaseline)
    private readonly projectBaselinesRepository: Repository<ProjectBaseline>,
    @InjectRepository(ProjectBaselineTask)
    private readonly projectBaselineTasksRepository: Repository<ProjectBaselineTask>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskDependency)
    private readonly taskDependenciesRepository: Repository<TaskDependency>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly projectHealthService: ProjectHealthService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    actor?: AuthenticatedActor,
  ): Promise<Project> {
    await this.ensureCanCreateProject(actor);
    await this.validateGovernanceUsers(createProjectDto);

    return this.projectsRepository.save(
      this.projectsRepository.create(createProjectDto),
    );
  }

  async findAll(actor?: ProjectVisibilityActor): Promise<ProjectWithHealth[]> {
    const projects =
      await this.projectVisibilityService.getVisibleProjects(actor);
    return projects.map((project) => this.decorateProject(this.withHealth(project)));
  }

  async findOne(
    id: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectWithHealth> {
    await this.ensureProjectVisible(id, actor);
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        assumptions: { owner: true },
        businessOwner: true,
        dependencies: { owner: true },
        deliveryLead: true,
        executiveSponsor: true,
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

    return this.decorateProject(this.withHealth(project));
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    actor?: AuthenticatedActor,
  ): Promise<Project> {
    await this.ensureCanManageProject(id, actor);
    await this.validateGovernanceUsers(updateProjectDto);
    const project = await this.findProjectEntity(id);
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: string, actor?: AuthenticatedActor): Promise<void> {
    await this.ensureCanDeleteProject(id, actor);
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
      withDeleted: true,
      where: {
        projectId,
        userId: createProjectMemberDto.userId,
      },
    });
    if (existingMember) {
      if (!existingMember.deletedAt) {
        throw new ConflictException('User is already a project member');
      }

      existingMember.role = createProjectMemberDto.role ?? ProjectRole.Contributor;
      existingMember.deletedAt = null;
      existingMember.deletedById = null;
      existingMember.updatedById = actor?.userId;

      const restoredMember = await this.projectMembersRepository.save(existingMember);
      return this.toProjectMemberResponse(
        await this.findMember(projectId, restoredMember.id),
      );
    }

    const member = this.projectMembersRepository.create({
      createdById: actor?.userId,
      projectId,
      userId: createProjectMemberDto.userId,
      role: createProjectMemberDto.role ?? ProjectRole.Contributor,
      updatedById: actor?.userId,
    });

    const savedMember = await this.projectMembersRepository.save(member);
    return this.toProjectMemberResponse(
      await this.findMember(projectId, savedMember.id),
    );
  }

  async findMembers(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectMemberResponseDto[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);

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
    member.deletedById = actor?.userId;
    member.updatedById = actor?.userId;
    await this.projectMembersRepository.softRemove(member);
  }

  async findProjectTasks(
    projectId: string,
    query: ProjectTaskQueryDto = {},
    actor?: ProjectVisibilityActor,
  ): Promise<Task[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);

    const tasks = await this.tasksRepository.find({
      order: { createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        projectId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
    });
    return decoratePlanningTasks(tasks);
  }

  async createProjectTask(
    projectId: string,
    createProjectTaskDto: CreateProjectTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);
    await this.validateTaskPlanningFields(projectId, createProjectTaskDto);
    await this.validateAssigneeMembership(
      projectId,
      createProjectTaskDto.assigneeId,
    );

    const task = this.tasksRepository.create({
      ...this.withNormalizedProgress(createProjectTaskDto),
      projectId,
    });

    const savedTask = await this.tasksRepository.save(task);
    return this.decorateTask(savedTask);
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
    await this.validateTaskPlanningFields(projectId, updateProjectTaskDto, task);
    await this.validateAssigneeMembership(
      projectId,
      updateProjectTaskDto.assigneeId,
    );
    Object.assign(task, this.withNormalizedProgress(updateProjectTaskDto), { projectId });

    const savedTask = await this.tasksRepository.save(task);
    return this.decorateTask(savedTask);
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

  async captureProjectBaseline(
    projectId: string,
    createProjectBaselineDto: CreateProjectBaselineDto,
    actor?: AuthenticatedActor,
  ): Promise<ProjectBaseline> {
    if (!actor?.userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);

    const projectTasks = await this.tasksRepository.find({
      order: {
        createdAt: 'ASC',
      },
      where: { projectId },
    });
    const latestBaseline = await this.projectBaselinesRepository.findOne({
      order: { versionNumber: 'DESC' },
      select: { id: true, versionNumber: true },
      where: { projectId },
    });
    const versionNumber = (latestBaseline?.versionNumber ?? 0) + 1;
    const capturedAt = new Date();
    const setAsCurrent = createProjectBaselineDto.setAsCurrent ?? true;

    return this.projectsRepository.manager.transaction(
      async (transactionalEntityManager) => {
        if (setAsCurrent) {
          await transactionalEntityManager.update(
            ProjectBaseline,
            { isCurrent: true, projectId },
            {
              isCurrent: false,
              status: 'superseded',
              updatedById: actor.userId,
            },
          );
        }

        const savedBaseline = await transactionalEntityManager.save(
          ProjectBaseline,
          this.projectBaselinesRepository.create({
            capturedAt,
            capturedById: actor.userId,
            createdById: actor.userId,
            isCurrent: setAsCurrent,
            name: createProjectBaselineDto.name,
            projectId,
            status: createProjectBaselineDto.status ?? 'approved',
            updatedById: actor.userId,
            versionNumber,
          }),
        );

        if (projectTasks.length > 0) {
          await transactionalEntityManager.save(
            ProjectBaselineTask,
            projectTasks.map((task) =>
              this.projectBaselineTasksRepository.create({
                createdById: actor.userId,
                estimatedHours: task.estimatedHours ?? null,
                parentTaskId: task.parentTaskId ?? null,
                percentComplete: task.percentComplete,
                plannedEndDate: task.plannedEndDate ?? null,
                plannedStartDate: task.plannedStartDate ?? null,
                projectBaselineId: savedBaseline.id,
                projectId,
                sequenceNumber: task.sequenceNumber ?? null,
                taskId: task.id,
                taskKind: task.taskKind,
                taskTitle: task.title,
                updatedById: actor.userId,
              }),
            ),
          );
        }

        return savedBaseline;
      },
    );
  }

  async findProjectBaselines(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectBaseline[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);

    return this.projectBaselinesRepository.find({
      order: { versionNumber: 'DESC' },
      relations: {
        capturedBy: true,
      },
      where: { projectId },
    });
  }

  async findProjectBaseline(
    projectId: string,
    baselineId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectBaseline> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);

    const baseline = await this.projectBaselinesRepository.findOne({
      relations: {
        capturedBy: true,
        tasks: true,
      },
      where: {
        id: baselineId,
        projectId,
      },
    });

    if (!baseline) {
      throw new NotFoundException(
        `Project baseline ${baselineId} not found for project ${projectId}`,
      );
    }

    baseline.tasks = [...(baseline.tasks ?? [])].sort((leftTask, rightTask) => {
      const leftSequenceNumber =
        typeof leftTask.sequenceNumber === 'number'
          ? leftTask.sequenceNumber
          : Number.MAX_SAFE_INTEGER;
      const rightSequenceNumber =
        typeof rightTask.sequenceNumber === 'number'
          ? rightTask.sequenceNumber
          : Number.MAX_SAFE_INTEGER;

      if (leftSequenceNumber !== rightSequenceNumber) {
        return leftSequenceNumber - rightSequenceNumber;
      }

      return leftTask.taskTitle.localeCompare(rightTask.taskTitle);
    });

    return baseline;
  }

  async findProjectTaskDependencies(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<TaskDependency[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);

    return this.taskDependenciesRepository.find({
      order: { createdAt: 'ASC' },
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: [
        { predecessorTask: { projectId } },
        { successorTask: { projectId } },
      ],
    });
  }

  async findProjectTaskDependency(
    projectId: string,
    dependencyId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<TaskDependency> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);
    return this.findTaskDependency(projectId, dependencyId);
  }

  async createProjectTaskDependency(
    projectId: string,
    createTaskDependencyDto: CreateTaskDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<TaskDependency> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);
    await this.validateTaskDependency(projectId, createTaskDependencyDto);

    const dependency = this.taskDependenciesRepository.create({
      ...createTaskDependencyDto,
      createdById: actor?.userId,
      lagDays: createTaskDependencyDto.lagDays ?? 0,
      updatedById: actor?.userId,
    });

    return this.taskDependenciesRepository.save(dependency);
  }

  async updateProjectTaskDependency(
    projectId: string,
    dependencyId: string,
    updateTaskDependencyDto: UpdateTaskDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<TaskDependency> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);

    const dependency = await this.findTaskDependency(projectId, dependencyId);
    const nextInput = {
      dependencyType:
        updateTaskDependencyDto.dependencyType ?? dependency.dependencyType,
      lagDays: updateTaskDependencyDto.lagDays ?? dependency.lagDays,
      predecessorTaskId:
        updateTaskDependencyDto.predecessorTaskId ??
        dependency.predecessorTaskId,
      successorTaskId:
        updateTaskDependencyDto.successorTaskId ?? dependency.successorTaskId,
    };

    await this.validateTaskDependency(projectId, nextInput, dependency.id);

    Object.assign(dependency, updateTaskDependencyDto, {
      lagDays: updateTaskDependencyDto.lagDays ?? dependency.lagDays,
      updatedById: actor?.userId,
    });

    return this.taskDependenciesRepository.save(dependency);
  }

  async removeProjectTaskDependency(
    projectId: string,
    dependencyId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);
    await this.ensureCanManageProject(projectId, actor);

    const dependency = await this.findTaskDependency(projectId, dependencyId);
    dependency.deletedById = actor?.userId;
    dependency.updatedById = actor?.userId;
    await this.taskDependenciesRepository.softRemove(dependency);
  }

  async findProjectRisks(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<Risk[]> {
    const project = await this.findOne(projectId, actor);
    return project.risks ?? [];
  }

  async findProjectIssues(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<Issue[]> {
    const project = await this.findOne(projectId, actor);
    return project.issues ?? [];
  }

  async findProjectAssumptions(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<Assumption[]> {
    const project = await this.findOne(projectId, actor);
    return project.assumptions ?? [];
  }

  async findProjectDependencies(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<Dependency[]> {
    const project = await this.findOne(projectId, actor);
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

  private async ensureProjectVisible(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<void> {
    if (await this.projectVisibilityService.canViewProject(projectId, actor)) {
      return;
    }

    throw new ForbiddenException('Project access is restricted');
  }

  private async findProjectEntity(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: {
        assumptions: { owner: true },
        businessOwner: true,
        dependencies: { owner: true },
        deliveryLead: true,
        executiveSponsor: true,
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

  private async validateGovernanceUsers(
    input: Pick<
      CreateProjectDto,
      'ownerId' | 'businessOwnerId' | 'executiveSponsorId' | 'deliveryLeadId'
    >,
  ): Promise<void> {
    const uniqueUserIds = Array.from(
      new Set(
        [
          input.ownerId,
          input.businessOwnerId,
          input.executiveSponsorId,
          input.deliveryLeadId,
        ].filter((value): value is string => Boolean(value)),
      ),
    );

    await Promise.all(uniqueUserIds.map((userId) => this.ensureUserExists(userId)));
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

  private async findTaskDependency(
    projectId: string,
    dependencyId: string,
  ): Promise<TaskDependency> {
    const dependency = await this.taskDependenciesRepository.findOne({
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: { id: dependencyId },
    });
    if (
      !dependency ||
      dependency.predecessorTask.projectId !== projectId ||
      dependency.successorTask.projectId !== projectId
    ) {
      throw new NotFoundException(
        `Task dependency ${dependencyId} not found for project ${projectId}`,
      );
    }

    return dependency;
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

  private async validateTaskPlanningFields(
    projectId: string,
    input: Partial<CreateProjectTaskDto | UpdateProjectTaskDto>,
    existingTask?: Task,
  ) {
    const effectiveTaskKind = input.taskKind ?? existingTask?.taskKind ?? TaskKind.Standard;
    const effectiveParentTaskId =
      typeof input.parentTaskId !== 'undefined'
        ? input.parentTaskId
        : existingTask?.parentTaskId;

    this.validateMilestoneDates(
      effectiveTaskKind,
      input.plannedStartDate ?? existingTask?.plannedStartDate,
      input.plannedEndDate ?? existingTask?.plannedEndDate,
    );
    this.validatePhaseMutations(effectiveTaskKind, input);

    if (
      existingTask &&
      input.taskKind &&
      input.taskKind !== TaskKind.Summary &&
      input.taskKind !== existingTask.taskKind
    ) {
      await this.ensureTaskHasNoChildren(projectId, existingTask.id);
    }

    if (!effectiveParentTaskId) {
      return;
    }

    if (existingTask && effectiveParentTaskId === existingTask.id) {
      throw new BadRequestException('A task cannot be its own parent');
    }

    const parentTask = await this.findPlanningTask(projectId, effectiveParentTaskId);
    if (!parentTask) {
      throw new NotFoundException(
        `Parent task ${effectiveParentTaskId} not found for project ${projectId}`,
      );
    }

    if (parentTask.taskKind !== TaskKind.Summary) {
      throw new BadRequestException('Only summary tasks can contain child tasks');
    }

    if (existingTask) {
      await this.ensureNoHierarchyCycle(projectId, existingTask.id, parentTask.id);
    }
  }

  private async validateTaskDependency(
    projectId: string,
    input: {
      predecessorTaskId: string;
      successorTaskId: string;
      dependencyType: TaskDependencyType;
      lagDays?: number;
    },
    existingDependencyId?: string,
  ) {
    if (input.predecessorTaskId === input.successorTaskId) {
      throw new BadRequestException(
        'A task dependency cannot reference the same task twice',
      );
    }

    const [predecessorTask, successorTask] = await Promise.all([
      this.findPlanningTask(projectId, input.predecessorTaskId),
      this.findPlanningTask(projectId, input.successorTaskId),
    ]);

    if (!predecessorTask) {
      throw new NotFoundException(
        `Task ${input.predecessorTaskId} not found for project ${projectId}`,
      );
    }

    if (!successorTask) {
      throw new NotFoundException(
        `Task ${input.successorTaskId} not found for project ${projectId}`,
      );
    }

    await this.ensureDependencyEndpointEligible(projectId, predecessorTask);
    await this.ensureDependencyEndpointEligible(projectId, successorTask);

    const duplicateDependency = await this.taskDependenciesRepository.findOne({
      select: { id: true },
      where: {
        predecessorTaskId: input.predecessorTaskId,
        successorTaskId: input.successorTaskId,
      },
    });
    if (duplicateDependency && duplicateDependency.id !== existingDependencyId) {
      throw new ConflictException(
        'An active dependency already exists between these tasks',
      );
    }
  }

  private async ensureDependencyEndpointEligible(
    projectId: string,
    task: Pick<Task, 'id' | 'taskKind'>,
  ) {
    if (task.taskKind === TaskKind.Summary) {
      throw new BadRequestException(
        'Summary tasks cannot be dependency endpoints',
      );
    }

    if (task.taskKind === TaskKind.Milestone) {
      return;
    }

    const childTask = await this.tasksRepository.findOne({
      select: { id: true },
      where: { parentTaskId: task.id, projectId },
    });
    if (childTask) {
      throw new BadRequestException(
        'Only leaf tasks and milestones can be dependency endpoints',
      );
    }
  }

  private validateMilestoneDates(
    taskKind: TaskKind,
    plannedStartDate?: string | null,
    plannedEndDate?: string | null,
  ) {
    if (
      taskKind === TaskKind.Milestone &&
      plannedStartDate &&
      plannedEndDate &&
      plannedStartDate !== plannedEndDate
    ) {
      throw new BadRequestException(
        'Milestones must have matching planned start and end dates',
      );
    }
  }

  private validatePhaseMutations(
    taskKind: TaskKind,
    input: Partial<CreateProjectTaskDto | UpdateProjectTaskDto>,
  ) {
    if (taskKind !== TaskKind.Summary) {
      return;
    }

    if (input.assigneeId) {
      throw new BadRequestException('Phases cannot be assigned to a user');
    }

    if (typeof input.status !== 'undefined') {
      throw new BadRequestException('Phase status is calculated from child work');
    }

    if (typeof input.percentComplete !== 'undefined') {
      throw new BadRequestException('Phase progress is calculated from child work');
    }

    if (
      typeof input.estimatedHours !== 'undefined' ||
      typeof input.remainingHours !== 'undefined'
    ) {
      throw new BadRequestException('Phases cannot store effort values');
    }
  }

  private async ensureTaskHasNoChildren(projectId: string, taskId: string) {
    const childTask = await this.tasksRepository.findOne({
      select: { id: true },
      where: { parentTaskId: taskId, projectId },
    });

    if (childTask) {
      throw new BadRequestException('Only summary tasks can contain child tasks');
    }
  }

  private async ensureNoHierarchyCycle(
    projectId: string,
    taskId: string,
    parentTaskId: string,
  ) {
    let currentParentId: string | null = parentTaskId;

    while (currentParentId) {
      if (currentParentId === taskId) {
        throw new BadRequestException('Task hierarchy cannot contain cycles');
      }

      const currentParent = await this.findPlanningTask(projectId, currentParentId);
      currentParentId = currentParent?.parentTaskId ?? null;
    }
  }

  private findPlanningTask(projectId: string, taskId: string) {
    return this.tasksRepository.findOne({
      select: {
        id: true,
        parentTaskId: true,
        projectId: true,
        taskKind: true,
      },
      where: { id: taskId, projectId },
    });
  }

  private async ensureCanManageProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    if (await this.authorizationPolicyService.canManageProject(projectId, actor)) {
      return;
    }

    throw new ForbiddenException('Project manager access is required');
  }

  private async ensureCanCreateProject(actor?: AuthenticatedActor) {
    if (
      await this.authorizationPolicyService.hasPermission(
        actor,
        PermissionKey.ProjectCreate,
      )
    ) {
      return;
    }

    throw new ForbiddenException('Project create access is required');
  }

  private async ensureCanDeleteProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ) {
    if (await this.authorizationPolicyService.canDeleteProject(projectId, actor)) {
      return;
    }

    throw new ForbiddenException('Project delete access is required');
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
    return this.authorizationPolicyService.canManageTask(projectId, actor);
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

  private decorateProject(project: ProjectWithHealth): ProjectWithHealth {
    const tasks = decoratePlanningTasks(project.tasks ?? []);

    return Object.assign(project, {
      taskCounts: countPlanningItems(tasks),
      tasks,
    });
  }

  private decorateTask(task: Task): Task {
    return decoratePlanningTasks([task])[0] as Task;
  }

  private withNormalizedProgress<
    T extends Partial<CreateProjectTaskDto | UpdateProjectTaskDto>,
  >(input: T): T {
    const normalizedInput = { ...input };

    if (normalizedInput.percentComplete === 100) {
      normalizedInput.status = TaskStatus.Done;
    }

    if (normalizedInput.status === TaskStatus.Done) {
      normalizedInput.percentComplete = 100;
    }

    return normalizedInput;
  }
}
