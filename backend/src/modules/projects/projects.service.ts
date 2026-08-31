import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../common/authz/canonical-capability-resolver.service';
import {
  CanonicalCapability,
  TaskCapabilityResource,
} from '../../common/authz/canonical-capability.types';
import { PermissionKey } from '../../common/authz/permissions';
import { ProjectRole } from '../../common/enums/project-role.enum';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { applyTaskCompletionTransition } from '../../common/scheduling/task-completion-transition';
import { UserRole } from '../../common/enums/user-role.enum';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectHealthDto } from '../health/dto/project-health.dto';
import { ProjectHealthService } from '../health/project-health.service';
import { CreateProjectBaselineDto } from './dto/create-project-baseline.dto';
import { ProjectBaselineTask } from './entities/project-baseline-task.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { CreateTaskDependencyDto } from '../tasks/dto/create-task-dependency.dto';
import { CreateTaskExecutionUpdateDto } from '../tasks/dto/task-execution-update.dto';
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
import { Role } from '../users/entities/role.entity';
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
import { TasksService } from '../tasks/tasks.service';
import { TaskAssignmentService } from '../tasks/task-assignment.service';

type ProjectWithHealth = Project & { health: ProjectHealthDto };
type AuthenticatedActor = AuthorizationActor;
type ProjectListMode = 'active' | 'archived' | 'all';

const archivedProjectStatus = 'archived';
const approvedBaselineStatus = 'approved';
const draftBaselineStatus = 'draft';
const supersededBaselineStatus = 'superseded';
const mutableProjectStatuses = new Set([
  'active',
  'at_risk',
  'blocked',
  'complete',
]);
const taskExecutionFields = new Set(['percentComplete', 'remarks', 'status']);
const taskNonCapabilityFields = new Set(['assigneeId']);
const externalEditableTaskFields = new Set([
  'remarks',
  'percentComplete',
  'status',
]);

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

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
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly projectHealthService: ProjectHealthService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly canonicalCapabilityResolver: CanonicalCapabilityResolverService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly schedulingFoundationService: SchedulingFoundationService,
    private readonly taskAssignmentService: TaskAssignmentService,
    @Inject(forwardRef(() => TasksService))
    @Optional()
    private readonly canonicalTasksService?: TasksService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    actor?: AuthenticatedActor,
  ): Promise<Project> {
    await this.ensureCanCreateProject(actor);
    if (!actor?.userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const normalizedInput = {
      ...createProjectDto,
      ownerId: actor.userId,
    };
    this.validateMutableProjectStatus(normalizedInput.status);
    await this.validateGovernanceUsers(normalizedInput);

    return this.projectsRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const project = await transactionalEntityManager.save(
          Project,
          this.projectsRepository.create(normalizedInput),
        );

        await transactionalEntityManager.save(
          ProjectMember,
          this.projectMembersRepository.create({
            createdById: actor.userId,
            projectId: project.id,
            role: ProjectRole.Owner,
            updatedById: actor.userId,
            userId: actor.userId,
          }),
        );

        return project;
      },
    );
  }

  async findAll(
    actor?: ProjectVisibilityActor,
    options: { lifecycle?: ProjectListMode } = {},
  ): Promise<ProjectWithHealth[]> {
    const projects =
      await this.projectVisibilityService.getVisibleProjects(actor);
    const lifecycle = options.lifecycle ?? 'active';
    const filteredProjects = projects.filter((project) => {
      if (lifecycle === 'all') {
        return true;
      }
      const isArchived = project.status === archivedProjectStatus;
      return lifecycle === 'archived' ? isArchived : !isArchived;
    });
    return Promise.all(
      filteredProjects.map((project) =>
        this.projectForActor(
          this.decorateProject(this.withHealth(project)),
          actor,
        ),
      ),
    );
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

    if (this.canonicalTasksService && project.tasks) {
      project.tasks =
        await this.canonicalTasksService.attachLatestExecutionUpdates(
          project.tasks,
        );
    }

    return this.projectForActor(
      this.decorateProject(this.withHealth(project)),
      actor,
    );
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    actor?: AuthenticatedActor,
  ): Promise<Project> {
    await this.ensureCanManageProject(id, actor);
    this.validateMutableProjectStatus(updateProjectDto.status);
    await this.validateGovernanceUsers(updateProjectDto);
    const project = await this.findProjectEntity(id);
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: string, actor?: AuthenticatedActor): Promise<void> {
    await this.archive(id, actor);
  }

  async archive(id: string, actor?: AuthenticatedActor): Promise<Project> {
    await this.ensureCanDeleteProject(id, actor);
    const project = await this.findProjectEntity(id);
    project.status = archivedProjectStatus;
    project.deletedAt = null;
    project.deletedById = null;
    project.updatedById = actor?.userId;
    return this.projectsRepository.save(project);
  }

  async restore(id: string, actor?: AuthenticatedActor): Promise<Project> {
    await this.ensureCanManageProject(id, actor);
    const project = await this.findProjectEntityIncludingArchived(id);
    project.status =
      project.status === archivedProjectStatus ? 'active' : project.status;
    project.deletedAt = null;
    project.deletedById = null;
    project.updatedById = actor?.userId;
    return this.projectsRepository.save(project);
  }

  async purge(id: string, actor?: AuthenticatedActor): Promise<void> {
    await this.ensurePlatformAdmin(actor);
    const project = await this.findProjectEntityIncludingArchived(id);
    if (project.status !== archivedProjectStatus) {
      throw new BadRequestException(
        'Only archived projects can be permanently purged',
      );
    }

    await this.projectsRepository.manager.transaction(async (manager) => {
      await this.purgeProjectOwnedData(manager, id);
    });
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

      existingMember.role =
        createProjectMemberDto.role ?? ProjectRole.Contributor;
      existingMember.deletedAt = null;
      existingMember.deletedById = null;
      existingMember.updatedById = actor?.userId;

      const restoredMember =
        await this.projectMembersRepository.save(existingMember);
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

    const visibleMembers =
      (await this.authorizationPolicyService.isExternalActor(actor))
        ? members.filter((member) => member.userId === actor!.userId)
        : members;
    return visibleMembers.map((member) => this.toProjectMemberResponse(member));
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
    await this.ensureTaskCapabilityForProject(projectId, 'task.view', actor);

    const tasks = await this.tasksRepository.find({
      order: { createdAt: 'DESC' },
      relations: { assignee: true, project: true },
      where: {
        projectId,
        ...((await this.authorizationPolicyService.isExternalActor(actor))
          ? { assigneeId: actor!.userId }
          : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
    });
    const decoratedTasks = decoratePlanningTasks(tasks);
    const tasksWithUpdates = this.canonicalTasksService
      ? await this.canonicalTasksService.attachLatestExecutionUpdates(
          decoratedTasks,
        )
      : decoratedTasks;
    return this.projectTasksForActor(tasksWithUpdates, actor);
  }

  async createProjectTask(
    projectId: string,
    createProjectTaskDto: CreateProjectTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    await this.ensureTaskCapabilityForProject(projectId, 'task.create', actor);
    const requestedKind = this.schedulingFoundationService.normalizeTaskKind(
      createProjectTaskDto,
      TaskKind.Standard,
    );
    if (requestedKind === TaskKind.Milestone && this.canonicalTasksService) {
      return this.canonicalTasksService.create(
        { ...createProjectTaskDto, projectId },
        actor,
      );
    }
    const normalizedMutation =
      this.schedulingFoundationService.normalizeTaskMutation(
        applyTaskCompletionTransition(createProjectTaskDto),
      );
    const requestedAssigneeId = normalizedMutation.assigneeId;
    const normalizedInput = { ...normalizedMutation };
    delete normalizedInput.assigneeId;
    await this.validateTaskPlanningFields(projectId, normalizedInput);
    const savedTask = await this.projectsRepository.manager.transaction(
      async (entityManager) => {
        const tasksRepository = entityManager.getRepository(Task);
        const task = await tasksRepository.save(
          tasksRepository.create({
            ...normalizedInput,
            projectId,
            ...(actor?.userId
              ? { createdById: actor.userId, updatedById: actor.userId }
              : {}),
          }),
        );
        if (!requestedAssigneeId) {
          return task;
        }
        return this.taskAssignmentService.changeTaskAssignment(
          projectId,
          task.id,
          requestedAssigneeId,
          actor!,
          entityManager,
        );
      },
    );
    return this.projectTaskForActor(this.decorateTask(savedTask), actor);
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
    const requestedKind = this.schedulingFoundationService.normalizeTaskKind(
      updateProjectTaskDto,
      task.taskKind,
    );
    if (
      (task.taskKind === TaskKind.Milestone ||
        requestedKind === TaskKind.Milestone) &&
      this.canonicalTasksService
    ) {
      return this.canonicalTasksService.update(
        taskId,
        { ...updateProjectTaskDto, projectId },
        actor,
      );
    }
    const assignmentRequested = updateProjectTaskDto.assigneeId !== undefined;
    const requestedAssigneeId = updateProjectTaskDto.assigneeId ?? null;
    const normalizedMutation =
      this.schedulingFoundationService.normalizeTaskMutation(
        applyTaskCompletionTransition(updateProjectTaskDto, task),
        task,
      );
    const normalizedInput = { ...normalizedMutation };
    delete normalizedInput.assigneeId;
    await this.validateTaskPlanningFields(projectId, normalizedInput, task);
    const savedTask = await this.projectsRepository.manager.transaction(
      async (entityManager) => {
        const tasksRepository = entityManager.getRepository(Task);
        Object.assign(task, normalizedInput, {
          projectId,
          ...(actor?.userId ? { updatedById: actor.userId } : {}),
        });
        const updatedTask = await tasksRepository.save(task);
        if (!assignmentRequested) {
          return updatedTask;
        }
        return this.taskAssignmentService.changeTaskAssignment(
          projectId,
          task.id,
          requestedAssigneeId,
          actor!,
          entityManager,
        );
      },
    );
    return this.projectTaskForActor(this.decorateTask(savedTask), actor);
  }

  async recordProjectTaskExecutionUpdate(
    projectId: string,
    taskId: string,
    input: CreateTaskExecutionUpdateDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureProjectExists(projectId);
    await this.findProjectTask(projectId, taskId);
    if (!this.canonicalTasksService) {
      throw new Error('TasksService is not configured');
    }
    return this.canonicalTasksService.recordExecutionUpdate(
      taskId,
      input,
      actor,
    );
  }

  async removeProjectTask(
    projectId: string,
    taskId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);
    const task = await this.findProjectTask(projectId, taskId);
    await this.ensureTaskCapability('task.delete', task, actor);
    if (task.taskKind === TaskKind.Milestone && this.canonicalTasksService) {
      await this.canonicalTasksService.cancelMilestone(taskId, actor);
      return;
    }
    if (actor?.userId) {
      task.deletedById = actor.userId;
      task.updatedById = actor.userId;
    }
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
    await this.ensureCanGovernProjectBaselines(projectId, actor);

    const requestedStatus =
      createProjectBaselineDto.status ?? approvedBaselineStatus;
    if (requestedStatus === supersededBaselineStatus) {
      throw new BadRequestException(
        'A new baseline cannot be created as superseded',
      );
    }
    if (
      requestedStatus === draftBaselineStatus &&
      createProjectBaselineDto.setAsCurrent === true
    ) {
      throw new BadRequestException('A draft baseline cannot be active');
    }

    return this.projectsRepository.manager.transaction(
      async (transactionalEntityManager) => {
        await this.lockProjectForBaselineGovernance(
          projectId,
          transactionalEntityManager,
        );

        const currentBaseline = await transactionalEntityManager.findOne(
          ProjectBaseline,
          {
            select: { id: true, isCurrent: true, status: true },
            where: { isCurrent: true, projectId },
          },
        );
        const latestBaseline = await transactionalEntityManager.findOne(
          ProjectBaseline,
          {
            order: { versionNumber: 'DESC' },
            select: { id: true, versionNumber: true },
            where: { projectId },
            withDeleted: true,
          },
        );
        const projectTasks = await transactionalEntityManager.find(Task, {
          order: {
            createdAt: 'ASC',
          },
          where: { projectId },
        });
        const versionNumber = (latestBaseline?.versionNumber ?? 0) + 1;
        const setAsCurrent =
          requestedStatus === approvedBaselineStatus &&
          (!currentBaseline || createProjectBaselineDto.setAsCurrent === true);

        if (setAsCurrent && currentBaseline) {
          await transactionalEntityManager.update(
            ProjectBaseline,
            { id: currentBaseline.id, projectId },
            {
              isCurrent: false,
              status: supersededBaselineStatus,
              updatedById: actor.userId,
            },
          );
        }

        const savedBaseline = await transactionalEntityManager.save(
          ProjectBaseline,
          this.projectBaselinesRepository.create({
            capturedAt: new Date(),
            capturedById: actor.userId,
            createdById: actor.userId,
            isCurrent: setAsCurrent,
            name: createProjectBaselineDto.name,
            projectId,
            status: requestedStatus,
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
                milestoneCategory: task.milestoneCategory ?? null,
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

  async setActiveProjectBaseline(
    projectId: string,
    baselineId: string,
    actor?: AuthenticatedActor,
  ): Promise<ProjectBaseline> {
    if (!actor?.userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    await this.ensureProjectExists(projectId);
    await this.ensureCanGovernProjectBaselines(projectId, actor);

    return this.projectsRepository.manager.transaction(
      async (transactionalEntityManager) => {
        await this.lockProjectForBaselineGovernance(
          projectId,
          transactionalEntityManager,
        );

        const targetBaseline = await transactionalEntityManager.findOne(
          ProjectBaseline,
          {
            where: { id: baselineId, projectId },
          },
        );
        if (!targetBaseline) {
          throw new NotFoundException(
            `Project baseline ${baselineId} not found for project ${projectId}`,
          );
        }
        if (targetBaseline.status === draftBaselineStatus) {
          throw new BadRequestException('A draft baseline cannot be active');
        }
        if (
          targetBaseline.status !== approvedBaselineStatus &&
          targetBaseline.status !== supersededBaselineStatus
        ) {
          throw new BadRequestException(
            `Baseline status ${targetBaseline.status} cannot be active`,
          );
        }
        if (
          targetBaseline.isCurrent &&
          targetBaseline.status === approvedBaselineStatus
        ) {
          return targetBaseline;
        }

        const currentBaseline = await transactionalEntityManager.findOne(
          ProjectBaseline,
          {
            select: { id: true },
            where: { isCurrent: true, projectId },
          },
        );
        if (currentBaseline && currentBaseline.id !== targetBaseline.id) {
          await transactionalEntityManager.update(
            ProjectBaseline,
            { id: currentBaseline.id, projectId },
            {
              isCurrent: false,
              status: supersededBaselineStatus,
              updatedById: actor.userId,
            },
          );
        }

        await transactionalEntityManager.update(
          ProjectBaseline,
          { id: targetBaseline.id, projectId },
          {
            isCurrent: true,
            status: approvedBaselineStatus,
            updatedById: actor.userId,
          },
        );

        return Object.assign(targetBaseline, {
          isCurrent: true,
          status: approvedBaselineStatus,
          updatedById: actor.userId,
        });
      },
    );
  }

  async findProjectBaselines(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectBaseline[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      return [];
    }

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
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      throw new NotFoundException(
        `Project baseline ${baselineId} not found for project ${projectId}`,
      );
    }

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
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      return [];
    }

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
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      throw new NotFoundException(
        `Task dependency ${dependencyId} not found for project ${projectId}`,
      );
    }
    return this.findTaskDependency(projectId, dependencyId);
  }

  async findProjectTaskPredecessors(
    projectId: string,
    taskId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<TaskDependency[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      return [];
    }
    await this.ensurePlanningTaskExists(projectId, taskId);

    return this.taskDependenciesRepository.find({
      order: { createdAt: 'ASC' },
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: {
        successorTaskId: taskId,
        successorTask: { projectId },
      },
    });
  }

  async findProjectTaskSuccessors(
    projectId: string,
    taskId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<TaskDependency[]> {
    await this.ensureProjectExists(projectId);
    await this.ensureProjectVisible(projectId, actor);
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      return [];
    }
    await this.ensurePlanningTaskExists(projectId, taskId);

    return this.taskDependenciesRepository.find({
      order: { createdAt: 'ASC' },
      relations: {
        predecessorTask: true,
        successorTask: true,
      },
      where: {
        predecessorTaskId: taskId,
        predecessorTask: { projectId },
      },
    });
  }

  async createProjectTaskDependency(
    projectId: string,
    createTaskDependencyDto: CreateTaskDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<TaskDependency> {
    await this.ensureProjectExists(projectId);
    await this.ensureTaskCapabilityForProject(
      projectId,
      'task.edit_plan',
      actor,
    );
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
    await this.ensureTaskCapabilityForProject(
      projectId,
      'task.edit_plan',
      actor,
    );

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
    await this.ensureTaskCapabilityForProject(
      projectId,
      'task.edit_plan',
      actor,
    );

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

  private async findProjectEntityIncludingArchived(
    id: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  private async ensurePlatformAdmin(actor?: AuthenticatedActor): Promise<void> {
    if (!actor?.roleId) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    const role = await this.rolesRepository.findOne({
      select: { id: true, name: true },
      where: { id: actor.roleId },
    });
    if (role?.name !== UserRole.PlatformAdmin) {
      throw new ForbiddenException('Platform administrator access is required');
    }
  }

  private async purgeProjectOwnedData(
    manager: EntityManager,
    projectId: string,
  ): Promise<void> {
    await manager.query("SET LOCAL pm_platform.project_purge = 'on'");

    const query = (sql: string) => manager.query(sql, [projectId]);

    await query('DELETE FROM task_execution_updates WHERE project_id = $1');
    await query(`
      DELETE FROM task_dependencies
      WHERE predecessor_task_id IN (SELECT id FROM tasks WHERE project_id = $1)
         OR successor_task_id IN (SELECT id FROM tasks WHERE project_id = $1)
    `);
    await query(`
      DELETE FROM portfolio_dependencies
      WHERE predecessor_project_id = $1
         OR successor_project_id = $1
    `);
    await query('DELETE FROM planning_task_schedules WHERE project_id = $1');
    await query(
      'DELETE FROM planning_schedule_snapshots WHERE project_id = $1',
    );
    await query('DELETE FROM resource_allocations WHERE project_id = $1');
    await query('DELETE FROM resource_capacities WHERE project_id = $1');
    await query(
      'DELETE FROM resource_workload_snapshots WHERE project_id = $1',
    );
    await query(
      'DELETE FROM enterprise_resource_assignments WHERE project_id = $1',
    );
    await query('DELETE FROM project_documents WHERE project_id = $1');
    await query('DELETE FROM raid_comments WHERE project_id = $1');
    await query('DELETE FROM raid_history_entries WHERE project_id = $1');
    await query('DELETE FROM risks WHERE project_id = $1');
    await query('DELETE FROM issues WHERE project_id = $1');
    await query('DELETE FROM assumptions WHERE project_id = $1');
    await query('DELETE FROM dependencies WHERE project_id = $1');
    await query('DELETE FROM project_baseline_tasks WHERE project_id = $1');
    await query('DELETE FROM project_baselines WHERE project_id = $1');
    await query('DELETE FROM project_members WHERE project_id = $1');
    await query('DELETE FROM tasks WHERE project_id = $1');
    await query('DELETE FROM projects WHERE id = $1');

    await this.verifyProjectPurgeIntegrity(manager, projectId);
  }

  private async verifyProjectPurgeIntegrity(
    manager: EntityManager,
    projectId: string,
  ): Promise<void> {
    const checks = [
      {
        label: 'project',
        sql: 'SELECT COUNT(*)::int AS count FROM projects WHERE id = $1',
      },
      {
        label: 'tasks',
        sql: 'SELECT COUNT(*)::int AS count FROM tasks WHERE project_id = $1',
      },
      {
        label: 'task_execution_updates',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM task_execution_updates
          WHERE project_id = $1
        `,
      },
      {
        label: 'planning_task_schedules',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM planning_task_schedules
          WHERE project_id = $1
        `,
      },
      {
        label: 'planning_schedule_snapshots',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM planning_schedule_snapshots
          WHERE project_id = $1
        `,
      },
      {
        label: 'resource_allocations',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM resource_allocations
          WHERE project_id = $1
        `,
      },
      {
        label: 'resource_capacities',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM resource_capacities
          WHERE project_id = $1
        `,
      },
      {
        label: 'resource_workload_snapshots',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM resource_workload_snapshots
          WHERE project_id = $1
        `,
      },
      {
        label: 'enterprise_resource_assignments',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM enterprise_resource_assignments
          WHERE project_id = $1
        `,
      },
      {
        label: 'project_documents',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM project_documents
          WHERE project_id = $1
        `,
      },
      {
        label: 'raid_comments',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM raid_comments
          WHERE project_id = $1
        `,
      },
      {
        label: 'raid_history_entries',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM raid_history_entries
          WHERE project_id = $1
        `,
      },
      {
        label: 'risks',
        sql: 'SELECT COUNT(*)::int AS count FROM risks WHERE project_id = $1',
      },
      {
        label: 'issues',
        sql: 'SELECT COUNT(*)::int AS count FROM issues WHERE project_id = $1',
      },
      {
        label: 'assumptions',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM assumptions
          WHERE project_id = $1
        `,
      },
      {
        label: 'dependencies',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM dependencies
          WHERE project_id = $1
        `,
      },
      {
        label: 'project_baseline_tasks',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM project_baseline_tasks
          WHERE project_id = $1
        `,
      },
      {
        label: 'project_baselines',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM project_baselines
          WHERE project_id = $1
        `,
      },
      {
        label: 'project_members',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM project_members
          WHERE project_id = $1
        `,
      },
      {
        label: 'task_dependencies_without_tasks',
        sql: `
          SELECT COUNT(*)::int AS count
          FROM task_dependencies dependency
          LEFT JOIN tasks predecessor
            ON predecessor.id = dependency.predecessor_task_id
          LEFT JOIN tasks successor
            ON successor.id = dependency.successor_task_id
          WHERE predecessor.id IS NULL
             OR successor.id IS NULL
        `,
        parameters: [],
      },
    ];

    const diagnostics: Record<string, number> = {};
    for (const check of checks) {
      const rows: unknown = await manager.query(
        check.sql,
        check.parameters ?? [projectId],
      );
      const firstRow: unknown = Array.isArray(rows) ? rows[0] : undefined;
      const count =
        typeof firstRow === 'object' && firstRow !== null && 'count' in firstRow
          ? firstRow.count
          : 0;
      diagnostics[check.label] = Number(count ?? 0);
    }

    const failures = Object.entries(diagnostics).filter(
      ([, count]) => count > 0,
    );
    if (failures.length === 0) {
      return;
    }

    this.logger.error(
      `Project purge integrity verification failed for ${projectId}: ${JSON.stringify(
        diagnostics,
      )}`,
    );
    throw new ConflictException('Project purge integrity verification failed');
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

    await Promise.all(
      uniqueUserIds.map((userId) => this.ensureUserExists(userId)),
    );
  }

  private validateMutableProjectStatus(status?: string): void {
    if (!status) {
      return;
    }

    if (!mutableProjectStatuses.has(status)) {
      throw new BadRequestException(
        'Project status must be active, at_risk, blocked, or complete',
      );
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
      dependency.predecessorTask?.projectId !== projectId ||
      dependency.successorTask?.projectId !== projectId
    ) {
      throw new NotFoundException(
        `Task dependency ${dependencyId} not found for project ${projectId}`,
      );
    }

    return dependency;
  }

  private async validateTaskPlanningFields(
    projectId: string,
    input: Partial<CreateProjectTaskDto | UpdateProjectTaskDto>,
    existingTask?: Task,
  ) {
    const effectiveTaskKind =
      this.schedulingFoundationService.normalizeTaskKind(
        input,
        existingTask?.taskKind ?? TaskKind.Standard,
      );
    const effectiveParentTaskId =
      typeof input.parentTaskId !== 'undefined'
        ? input.parentTaskId
        : existingTask?.parentTaskId;

    if (
      existingTask &&
      (input.taskKind || input.taskType) &&
      effectiveTaskKind !== TaskKind.Summary &&
      effectiveTaskKind !== existingTask.taskKind
    ) {
      await this.ensureTaskHasNoChildren(projectId, existingTask.id);
    }

    if (!effectiveParentTaskId) {
      return;
    }

    if (existingTask && effectiveParentTaskId === existingTask.id) {
      throw new BadRequestException('A task cannot be its own parent');
    }

    const parentTask = await this.findPlanningTask(
      projectId,
      effectiveParentTaskId,
    );
    if (!parentTask) {
      throw new NotFoundException(
        `Parent task ${effectiveParentTaskId} not found for project ${projectId}`,
      );
    }

    await this.ensureParentCanContainPlanningChild(
      projectId,
      parentTask,
      effectiveTaskKind,
      existingTask,
    );

    if (existingTask) {
      await this.ensureNoHierarchyCycle(
        projectId,
        existingTask.id,
        parentTask.id,
      );
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
    const [predecessorTask, successorTask] = await Promise.all([
      this.findPlanningTask(projectId, input.predecessorTaskId),
      this.findPlanningTask(projectId, input.successorTaskId),
    ]);
    const dependencies = await this.taskDependenciesRepository.find({
      select: {
        id: true,
        predecessorTaskId: true,
        successorTaskId: true,
      },
      where: [
        { predecessorTask: { projectId } },
        { successorTask: { projectId } },
      ],
    });

    this.schedulingFoundationService.validateTaskDependency(input, {
      dependencies,
      existingDependencyId,
      predecessorTask,
      projectId,
      successorTask,
    });
  }

  private async ensureTaskHasNoChildren(projectId: string, taskId: string) {
    const childTask = await this.tasksRepository.findOne({
      select: { id: true },
      where: { parentTaskId: taskId, projectId },
    });

    if (childTask) {
      throw new BadRequestException(
        'Tasks with child tasks cannot become subtasks or milestones',
      );
    }
  }

  private async ensureParentCanContainPlanningChild(
    projectId: string,
    parentTask: Task,
    childTaskKind: TaskKind,
    existingTask?: Task,
  ) {
    if (parentTask.taskKind === TaskKind.Summary) {
      return;
    }

    if (parentTask.taskKind !== TaskKind.Standard) {
      throw new BadRequestException('Milestones cannot contain child tasks');
    }

    if (childTaskKind !== TaskKind.Standard) {
      throw new BadRequestException(
        'Tasks can only contain executable subtasks',
      );
    }

    if (parentTask.parentTaskId) {
      const grandparentTask = await this.findPlanningTask(
        projectId,
        parentTask.parentTaskId,
      );
      if (grandparentTask?.taskKind === TaskKind.Standard) {
        throw new BadRequestException('Subtasks cannot contain child tasks');
      }
    }

    if (existingTask) {
      await this.ensureTaskHasNoChildren(projectId, existingTask.id);
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

      const currentParent = await this.findPlanningTask(
        projectId,
        currentParentId,
      );
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

  private async ensurePlanningTaskExists(projectId: string, taskId: string) {
    const task = await this.findPlanningTask(projectId, taskId);
    if (!task) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }

    return task;
  }

  private async ensureCanManageProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    if (
      await this.authorizationPolicyService.canManageProject(projectId, actor)
    ) {
      return;
    }

    throw new ForbiddenException('Project manager access is required');
  }

  private async ensureCanGovernProjectBaselines(
    projectId: string,
    actor: AuthenticatedActor,
  ): Promise<void> {
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      throw new ForbiddenException(
        'External actors cannot manage project baselines',
      );
    }

    await this.ensureCanManageProject(projectId, actor);
  }

  private async lockProjectForBaselineGovernance(
    projectId: string,
    transactionalEntityManager: EntityManager,
  ): Promise<void> {
    const project = await transactionalEntityManager.findOne(Project, {
      lock: { mode: 'pessimistic_write' },
      select: { id: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
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
    if (
      await this.authorizationPolicyService.canDeleteProject(projectId, actor)
    ) {
      return;
    }

    throw new ForbiddenException('Project delete access is required');
  }

  private async ensureCanUpdateTask(
    task: Task,
    updateProjectTaskDto: UpdateProjectTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    const changedFields = Object.keys(updateProjectTaskDto);
    const executionFields = changedFields.filter((field) =>
      taskExecutionFields.has(field),
    );
    const planFields = changedFields.filter(
      (field) =>
        !taskExecutionFields.has(field) && !taskNonCapabilityFields.has(field),
    );
    if (planFields.length > 0) {
      await this.ensureTaskCapability(
        'task.edit_plan',
        task,
        actor,
        planFields,
      );
    }
    if (executionFields.length > 0) {
      await this.ensureTaskCapability(
        'task.edit_execution',
        task,
        actor,
        executionFields,
      );
    }
    if (
      planFields.length === 0 &&
      executionFields.length === 0 &&
      !changedFields.includes('assigneeId')
    ) {
      await this.ensureTaskCapability('task.view', task, actor);
    }
    if (
      updateProjectTaskDto.status === TaskStatus.Done ||
      updateProjectTaskDto.percentComplete === 100
    ) {
      await this.ensureTaskCapability('task.complete', task, actor);
    }
    if (
      actor &&
      (await this.authorizationPolicyService.isExternalActor(actor))
    ) {
      const disallowedFields = changedFields.filter(
        (field) => !externalEditableTaskFields.has(field),
      );
      if (disallowedFields.length > 0) {
        throw new ForbiddenException(
          'Team members can only update status, remarks, percent complete, or assignee',
        );
      }
    }
  }

  private async ensureTaskCapabilityForProject(
    projectId: string,
    capability: CanonicalCapability,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    const project = await this.projectsRepository.findOne({
      select: { id: true, status: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    await this.ensureTaskCapability(
      capability,
      {
        assigneeId: null,
        projectId,
        projectStatus: project.status,
        taskKind: TaskKind.Standard,
        type: 'task',
      },
      actor,
    );
  }

  private async ensureTaskCapability(
    capability: CanonicalCapability,
    task: Task | TaskCapabilityResource,
    actor?: AuthenticatedActor,
    changedFields?: readonly string[],
  ): Promise<void> {
    if (!actor) {
      throw new ForbiddenException('Authenticated user is required');
    }
    let resource: TaskCapabilityResource;
    if ('type' in task) {
      resource = task;
    } else {
      const projectStatus =
        task.project?.status ??
        (
          await this.projectsRepository.findOne({
            select: { id: true, status: true },
            where: { id: task.projectId },
          })
        )?.status;
      resource = {
        assigneeId: task.assigneeId ?? null,
        deletedAt: task.deletedAt ?? null,
        projectId: task.projectId,
        projectStatus: projectStatus ?? null,
        status: task.status,
        taskKind: task.taskKind,
        type: 'task',
      };
    }
    const decision = await this.canonicalCapabilityResolver.resolve({
      actor,
      capability,
      changedFields,
      resource,
    });
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Task capability ${capability} denied: ${decision.reasonCode}`,
      );
    }
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
    return decoratePlanningTasks([task])[0];
  }

  private async projectForActor(
    project: ProjectWithHealth,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectWithHealth> {
    if (!(await this.authorizationPolicyService.isExternalActor(actor))) {
      return project;
    }
    return {
      createdAt: project.createdAt,
      description: project.description ?? null,
      health: {
        reasons: [],
        status: project.health.status,
      },
      id: project.id,
      name: project.name,
      startDate: project.startDate ?? null,
      status: project.status,
      targetEndDate: project.targetEndDate ?? null,
      updatedAt: project.updatedAt,
    } as unknown as ProjectWithHealth;
  }

  private async projectTaskForActor(
    task: Task,
    actor?: ProjectVisibilityActor,
  ): Promise<Task> {
    if (this.canonicalTasksService) {
      return this.canonicalTasksService.projectTaskForActor(task, actor);
    }
    if (!(await this.authorizationPolicyService.isExternalActor(actor))) {
      return task;
    }
    return {
      actualEndDate: task.actualEndDate ?? null,
      actualStartDate: task.actualStartDate ?? null,
      assigneeId: task.assigneeId ?? null,
      description: task.description ?? null,
      dueDate: task.dueDate ?? null,
      id: task.id,
      milestoneCategory: task.milestoneCategory ?? null,
      percentComplete: task.percentComplete,
      priority: task.priority,
      projectId: task.projectId,
      startDate: task.startDate ?? null,
      status: task.status,
      taskKind: task.taskKind,
      title: task.title,
    } as Task;
  }

  private async projectTasksForActor(
    tasks: Task[],
    actor?: ProjectVisibilityActor,
  ): Promise<Task[]> {
    if (this.canonicalTasksService) {
      return this.canonicalTasksService.projectTasksForActor(tasks, actor);
    }
    return Promise.all(
      tasks.map((task) => this.projectTaskForActor(task, actor)),
    );
  }
}
