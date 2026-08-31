import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../common/authz/canonical-capability-resolver.service';
import {
  CanonicalCapability,
  TaskCapabilityResource,
} from '../../common/authz/canonical-capability.types';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { applyTaskCompletionTransition } from '../../common/scheduling/task-completion-transition';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { MyTasksSummaryDto } from './dto/my-tasks-summary.dto';
import {
  CreateTaskExecutionUpdateDto,
  TaskExecutionUpdateDto,
} from './dto/task-execution-update.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskExecutionUpdate } from './entities/task-execution-update.entity';
import { Task } from './entities/task.entity';
import { TaskAssignmentService } from './task-assignment.service';
import { decoratePlanningTasks, getOperationalTasks } from './planning-rollup';
import {
  MilestoneQuery,
  MilestoneQueryService,
} from './milestone-query.service';
import { MilestoneProjectionPage } from './milestone-projection';

type AuthenticatedActor = AuthorizationActor;
const taskPriorities = new Set(['low', 'medium', 'high', 'critical']);
const taskExecutionFields = new Set(['percentComplete', 'remarks', 'status']);
const taskNonCapabilityFields = new Set(['assigneeId']);
const externalEditableTaskFields = new Set([
  'remarks',
  'percentComplete',
  'status',
]);
const externalExecutionUpdateFields = new Set([
  'nextStep',
  'percentComplete',
  'status',
  'targetCompletionDate',
  'updateNotes',
]);

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskExecutionUpdate)
    private readonly taskExecutionUpdatesRepository: Repository<TaskExecutionUpdate>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly canonicalCapabilityResolver: CanonicalCapabilityResolverService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly schedulingFoundationService: SchedulingFoundationService,
    private readonly taskAssignmentService: TaskAssignmentService,
    @Optional()
    private readonly milestoneQueryService?: MilestoneQueryService,
  ) {}

  findProjectMilestones(
    projectId: string,
    query: Omit<MilestoneQuery, 'projectIds'> = {},
    actor?: ProjectVisibilityActor,
  ): Promise<MilestoneProjectionPage> {
    return this.requireMilestoneQueryService().findProjectMilestones(
      projectId,
      query,
      actor,
    );
  }

  findPortfolioMilestones(
    query: MilestoneQuery = {},
    actor?: ProjectVisibilityActor,
  ): Promise<MilestoneProjectionPage> {
    return this.requireMilestoneQueryService().findPortfolioMilestones(
      query,
      actor,
    );
  }

  async completeMilestone(
    id: string,
    actualDate: string | undefined,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureMilestone(id, actor);
    return this.update(
      id,
      {
        ...(actualDate
          ? { actualEndDate: actualDate, actualStartDate: actualDate }
          : {}),
        status: TaskStatus.Done,
      },
      actor,
    );
  }

  async reopenMilestone(
    id: string,
    status: Exclude<TaskStatus, TaskStatus.Done> = TaskStatus.InProgress,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureMilestone(id, actor);
    return this.update(id, { status }, actor);
  }

  async cancelMilestone(id: string, actor?: AuthenticatedActor): Promise<void> {
    await this.ensureMilestone(id, actor);
    return this.remove(id, actor);
  }

  async create(
    createTaskDto: CreateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureTaskCapabilityForProject(
      createTaskDto.projectId,
      'task.create',
      actor,
    );
    const normalizedMutation =
      this.schedulingFoundationService.normalizeTaskMutation(
        applyTaskCompletionTransition(createTaskDto),
      );
    const requestedAssigneeId = normalizedMutation.assigneeId;
    const normalizedInput = { ...normalizedMutation };
    delete normalizedInput.assigneeId;
    await this.validatePlanningFields(createTaskDto.projectId, normalizedInput);
    const task = await this.tasksRepository.manager.transaction(
      async (entityManager) => {
        const tasksRepository = entityManager.getRepository(Task);
        const createdTask = await tasksRepository.save(
          tasksRepository.create({
            ...normalizedInput,
            ...(actor?.userId
              ? { createdById: actor.userId, updatedById: actor.userId }
              : {}),
          }),
        );
        if (!requestedAssigneeId) {
          return createdTask;
        }
        return this.taskAssignmentService.changeTaskAssignment(
          createTaskDto.projectId,
          createdTask.id,
          requestedAssigneeId,
          actor!,
          entityManager,
        );
      },
    );
    return this.decorateTask(task);
  }

  async findAll(actor?: ProjectVisibilityActor): Promise<Task[]> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    if (visibleProjectIds !== 'all' && visibleProjectIds.length === 0) {
      return [];
    }

    const taskQuery = this.createVisibleTasksQuery();
    if (visibleProjectIds !== 'all') {
      taskQuery.where('task.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      });
    }
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      taskQuery.andWhere('task.assignee_id = :externalActorId', {
        externalActorId: actor!.userId,
      });
    }

    const tasks = await taskQuery.getMany();
    const decorated = await this.attachLatestExecutionUpdates(
      decoratePlanningTasks(tasks),
    );
    return this.projectTasksForActor(decorated, actor);
  }

  async findMyTasks(
    userId: string,
    query: MyTasksQueryDto = {},
    actor?: ProjectVisibilityActor,
  ): Promise<Task[]> {
    const taskQuery = this.createVisibleTasksQuery()
      .where('task.assignee_id = :userId', { userId })
      .andWhere('task.task_kind IN (:...taskKinds)', {
        taskKinds: [TaskKind.Standard, TaskKind.Milestone],
      })
      .orderBy('task.due_date', 'ASC')
      .addOrderBy('task.created_at', 'DESC');

    if (query.status) {
      taskQuery.andWhere('task.status = :status', { status: query.status });
    }
    if (query.projectId) {
      taskQuery.andWhere('task.project_id = :projectId', {
        projectId: query.projectId,
      });
    }
    if (query.priority) {
      taskQuery.andWhere('task.priority = :priority', {
        priority: query.priority,
      });
    }

    const tasks = await taskQuery.getMany();
    const tasksWithContext = await this.includePersonalTaskContext(tasks);
    const decorated = await this.attachLatestExecutionUpdates(tasksWithContext);
    const visibleTasks = (await this.authorizationPolicyService.isExternalActor(
      actor,
    ))
      ? decorated.filter((task) => task.assigneeId === actor!.userId)
      : decorated;
    return this.projectTasksForActor(visibleTasks, actor);
  }

  async getMyTasksSummary(userId: string): Promise<MyTasksSummaryDto> {
    const tasks = await this.tasksRepository.find({
      where: {
        assigneeId: userId,
        taskKind: In([TaskKind.Standard, TaskKind.Milestone]),
      },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const operationalTasks = getOperationalTasks(tasks);

    return {
      totalTasks: operationalTasks.length,
      todoTasks: operationalTasks.filter(
        (task) => task.status === TaskStatus.Todo,
      ).length,
      inProgressTasks: operationalTasks.filter(
        (task) => task.status === TaskStatus.InProgress,
      ).length,
      blockedTasks: operationalTasks.filter(
        (task) => task.status === TaskStatus.Blocked,
      ).length,
      completedTasks: operationalTasks.filter(
        (task) => task.status === TaskStatus.Done,
      ).length,
      overdueTasks: operationalTasks.filter((task) => {
        if (!task.dueDate || task.status === TaskStatus.Done) {
          return false;
        }

        return this.toDateOnly(task.dueDate) < today;
      }).length,
    };
  }

  async findOne(id: string, actor?: ProjectVisibilityActor): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { project: true, assignee: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    await this.ensureTaskCapability('task.view', task, actor);

    if (
      (await this.authorizationPolicyService.isExternalActor(actor)) &&
      task.assigneeId !== actor!.userId
    ) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return this.projectTaskForActor(
      await this.decorateTaskWithLatest(task),
      actor,
    );
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    const task = await this.findTaskForMutation(id);
    await this.ensureCanUpdateTask(task, updateTaskDto, actor);
    const assignmentRequested = updateTaskDto.assigneeId !== undefined;
    const requestedAssigneeId = updateTaskDto.assigneeId ?? null;
    if (updateTaskDto.projectId && updateTaskDto.projectId !== task.projectId) {
      const destinationProject = await this.findProjectForTaskCapability(
        updateTaskDto.projectId,
      );
      await this.ensureTaskCapability(
        'task.move',
        task,
        actor,
        undefined,
        updateTaskDto.projectId,
        destinationProject.status,
      );
    }
    const normalizedMutation =
      this.schedulingFoundationService.normalizeTaskMutation(
        applyTaskCompletionTransition(updateTaskDto, task),
        task,
      );
    const normalizedInput = { ...normalizedMutation };
    delete normalizedInput.assigneeId;
    await this.validatePlanningFields(
      normalizedInput.projectId ?? task.projectId,
      normalizedInput,
      task,
    );
    const sourceProjectId = task.projectId;
    const originalAssigneeId = task.assigneeId ?? null;
    const targetProjectId = normalizedInput.projectId ?? task.projectId;
    const projectChanged = targetProjectId !== sourceProjectId;
    await this.tasksRepository.manager.transaction(async (entityManager) => {
      const tasksRepository = entityManager.getRepository(Task);
      const taskToSave =
        projectChanged && originalAssigneeId
          ? await this.taskAssignmentService.changeTaskAssignment(
              sourceProjectId,
              task.id,
              null,
              actor!,
              entityManager,
            )
          : task;
      Object.assign(taskToSave, normalizedInput);
      if (actor?.userId) {
        taskToSave.updatedById = actor.userId;
      }
      await tasksRepository.save(taskToSave);
      const destinationAssigneeId = assignmentRequested
        ? requestedAssigneeId
        : projectChanged
          ? originalAssigneeId
          : undefined;
      if (destinationAssigneeId !== undefined) {
        await this.taskAssignmentService.changeTaskAssignment(
          targetProjectId,
          taskToSave.id,
          destinationAssigneeId,
          actor!,
          entityManager,
        );
      }
    });
    const savedTask = await this.tasksRepository.findOne({
      relations: { assignee: true, project: true },
      where: { id },
    });
    if (!savedTask) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return this.decorateTaskWithLatest(savedTask);
  }

  async recordExecutionUpdate(
    id: string,
    input: CreateTaskExecutionUpdateDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    const task = await this.findTaskForMutation(id);
    if (task.taskKind === TaskKind.Summary) {
      throw new BadRequestException(
        'Summary tasks cannot receive execution updates',
      );
    }
    await this.ensureCanRecordExecutionUpdate(task, input, actor);
    this.validateTaskPriority(input.priority);
    await this.validateAssigneeMembership(
      task.projectId,
      input.nextActionOwnerId,
    );

    const updatedTask = await this.tasksRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const normalizedInput = applyTaskCompletionTransition(
          {
            dueDate: input.targetCompletionDate ?? null,
            percentComplete: input.percentComplete,
            priority: input.priority,
            remarks: this.normalizeNullableText(input.updateNotes),
            status: input.status,
          },
          task,
        );
        const changes = this.getExecutionChanges(task, {
          ...input,
          percentComplete:
            normalizedInput.percentComplete ?? input.percentComplete,
          status: normalizedInput.status ?? input.status,
        });

        const taskToSave =
          input.assigneeId === undefined
            ? task
            : await this.taskAssignmentService.changeTaskAssignment(
                task.projectId,
                task.id,
                input.assigneeId ?? null,
                actor!,
                transactionalEntityManager,
              );

        Object.assign(taskToSave, normalizedInput, {
          updatedById: actor?.userId,
        });

        const savedTask = await transactionalEntityManager.save(
          Task,
          taskToSave,
        );
        const executionUpdate = transactionalEntityManager.create(
          TaskExecutionUpdate,
          {
            assigneeId: savedTask.assigneeId ?? null,
            changes,
            createdById: actor?.userId,
            nextActionOwnerId: input.nextActionOwnerId ?? null,
            nextStep: this.normalizeNullableText(input.nextStep),
            percentComplete: savedTask.percentComplete,
            priority: savedTask.priority,
            projectId: savedTask.projectId,
            status: savedTask.status,
            targetCompletionDate: input.targetCompletionDate ?? null,
            taskId: savedTask.id,
            updateNotes: this.normalizeNullableText(input.updateNotes),
            updatedById: actor?.userId,
          },
        );
        const savedUpdate = await transactionalEntityManager.save(
          TaskExecutionUpdate,
          executionUpdate,
        );

        return this.decorateTask({
          ...savedTask,
          latestExecutionUpdate: this.toExecutionUpdateDto(savedUpdate),
        });
      },
    );
    return this.projectTaskForActor(updatedTask, actor);
  }

  async attachLatestExecutionUpdates<T extends Task>(tasks: T[]): Promise<T[]> {
    if (tasks.length === 0) {
      return tasks;
    }

    const updates = await this.taskExecutionUpdatesRepository
      .createQueryBuilder('executionUpdate')
      .distinctOn(['executionUpdate.taskId'])
      .where('executionUpdate.taskId IN (:...taskIds)', {
        taskIds: tasks.map((task) => task.id),
      })
      .orderBy('executionUpdate.taskId', 'ASC')
      .addOrderBy('executionUpdate.createdAt', 'DESC')
      .getMany();
    const latestByTaskId = new Map<string, TaskExecutionUpdate>();
    for (const update of updates) {
      if (!latestByTaskId.has(update.taskId)) {
        latestByTaskId.set(update.taskId, update);
      }
    }

    return tasks.map((task) => ({
      ...task,
      latestExecutionUpdate: latestByTaskId.has(task.id)
        ? this.toExecutionUpdateDto(latestByTaskId.get(task.id)!)
        : null,
    }));
  }

  async findExecutionUpdates(
    id: string,
    actor?: ProjectVisibilityActor,
  ): Promise<TaskExecutionUpdateDto[]> {
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    const task = await this.findOne(id, actor);
    const updates = await this.taskExecutionUpdatesRepository.find({
      order: { createdAt: 'DESC' },
      where: { taskId: task.id },
      take: 10,
    });

    return updates.map((update) => this.toExecutionUpdateDto(update));
  }

  async remove(id: string, actor?: AuthenticatedActor): Promise<void> {
    const task = await this.findTaskForMutation(id);
    await this.ensureTaskCapability('task.delete', task, actor);
    if (actor?.userId) {
      task.deletedById = actor.userId;
      task.updatedById = actor.userId;
    }
    await this.tasksRepository.softRemove(task);
  }

  private toDateOnly(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private createVisibleTasksQuery(): SelectQueryBuilder<Task> {
    return this.tasksRepository
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee');
  }

  private async includePersonalTaskContext(tasks: Task[]): Promise<Task[]> {
    if (tasks.length === 0) {
      return tasks;
    }

    const directTaskIds = tasks.map((task) => task.id);
    const parentTaskIds = [
      ...new Set(
        tasks
          .map((task) => task.parentTaskId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const directProjectIds = [
      ...new Set(tasks.map((task) => task.projectId).filter(Boolean)),
    ];
    const childTaskWhere =
      directProjectIds.length > 0
        ? {
            parentTaskId: In(directTaskIds),
            projectId: In(directProjectIds),
          }
        : { parentTaskId: In(directTaskIds) };

    const [childTasks, parentTasks] = await Promise.all([
      this.tasksRepository.find({
        order: { dueDate: 'ASC', createdAt: 'DESC' },
        relations: { assignee: true, project: true },
        where: childTaskWhere,
      }),
      parentTaskIds.length > 0
        ? this.tasksRepository.find({
            relations: { assignee: true, project: true },
            where: { id: In(parentTaskIds) },
          })
        : Promise.resolve([]),
    ]);

    const childrenByParentId = new Map<string, Task[]>();
    for (const task of childTasks) {
      if (!task.parentTaskId) {
        continue;
      }
      const siblings = childrenByParentId.get(task.parentTaskId) ?? [];
      siblings.push(task);
      childrenByParentId.set(task.parentTaskId, siblings);
    }

    const parentById = new Map(parentTasks.map((task) => [task.id, task]));
    const orderedTasks: Task[] = [];
    const includedTaskIds = new Set<string>();
    const include = (task?: Task | null) => {
      if (!task || includedTaskIds.has(task.id)) {
        return;
      }
      includedTaskIds.add(task.id);
      orderedTasks.push(task);
    };

    for (const task of tasks) {
      if (task.parentTaskId) {
        include(parentById.get(task.parentTaskId));
      }
      include(task);
      for (const childTask of childrenByParentId.get(task.id) ?? []) {
        include(childTask);
      }
    }

    return orderedTasks;
  }

  private async findTaskForMutation(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      relations: { project: true },
      where: { id },
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  private async ensureCanUpdateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    const changedFields = Object.keys(updateTaskDto);
    const executionFields = changedFields.filter((field) =>
      taskExecutionFields.has(field),
    );
    const planFields = changedFields.filter(
      (field) =>
        field !== 'projectId' &&
        !taskExecutionFields.has(field) &&
        !taskNonCapabilityFields.has(field),
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
      !changedFields.includes('assigneeId') &&
      (!updateTaskDto.projectId || updateTaskDto.projectId === task.projectId)
    ) {
      await this.ensureTaskCapability('task.view', task, actor);
    }
    if (
      updateTaskDto.status === TaskStatus.Done ||
      updateTaskDto.percentComplete === 100
    ) {
      await this.ensureTaskCapability('task.complete', task, actor);
    }
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
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

  private async ensureCanRecordExecutionUpdate(
    task: Task,
    input: CreateTaskExecutionUpdateDto,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    const changedFields = Object.keys(input).filter(
      (field) => field !== 'assigneeId',
    );
    await this.ensureTaskCapability(
      'task.record_update',
      task,
      actor,
      changedFields,
    );
    if (input.status === TaskStatus.Done || input.percentComplete === 100) {
      await this.ensureTaskCapability('task.complete', task, actor);
    }
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      const disallowedFields = Object.keys(input).filter(
        (field) => !externalExecutionUpdateFields.has(field),
      );
      if (disallowedFields.length > 0) {
        throw new ForbiddenException(
          'Assigned team members can only record execution fields on their tasks',
        );
      }
    }
  }

  private async ensureTaskCapabilityForProject(
    projectId: string,
    capability: CanonicalCapability,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    const project = await this.findProjectForTaskCapability(projectId);
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
    destinationProjectId?: string,
    destinationProjectStatus?: string | null,
  ): Promise<void> {
    if (!actor) {
      throw new ForbiddenException('Authenticated user is required');
    }
    const resource: TaskCapabilityResource =
      'type' in task
        ? task
        : {
            assigneeId: task.assigneeId ?? null,
            deletedAt: task.deletedAt ?? null,
            projectId: task.projectId,
            projectStatus: task.project?.status ?? null,
            status: task.status,
            taskKind: task.taskKind,
            type: 'task',
          };
    const decision = await this.canonicalCapabilityResolver.resolve({
      actor,
      capability,
      changedFields,
      destinationProjectId,
      destinationProjectStatus,
      resource,
    });
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Task capability ${capability} denied: ${decision.reasonCode}`,
      );
    }
  }

  private async findProjectForTaskCapability(
    projectId: string,
  ): Promise<Pick<Project, 'id' | 'status'>> {
    const project = await this.tasksRepository.manager
      .getRepository(Project)
      .findOne({
        select: { id: true, status: true },
        where: { id: projectId },
      });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  async projectTaskForActor(
    task: Task,
    actor?: ProjectVisibilityActor,
  ): Promise<Task> {
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

  async projectTasksForActor(
    tasks: Task[],
    actor?: ProjectVisibilityActor,
  ): Promise<Task[]> {
    if (!(await this.authorizationPolicyService.isExternalActor(actor))) {
      return tasks;
    }
    return Promise.all(
      tasks.map((task) => this.projectTaskForActor(task, actor)),
    );
  }

  private async validateAssigneeMembership(
    projectId: string,
    assigneeId?: string | null,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }

    const membership = await this.projectMembersRepository.findOne({
      select: { id: true },
      where: { projectId, userId: assigneeId },
    });
    if (!membership) {
      throw new ConflictException('Assignee must be a project member');
    }
  }

  private async validatePlanningFields(
    projectId: string,
    input: Partial<CreateTaskDto | UpdateTaskDto>,
    existingTask?: Task,
  ): Promise<void> {
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
      await this.ensureTaskHasNoChildren(existingTask.id);
    }

    if (!effectiveParentTaskId) {
      return;
    }

    if (existingTask && effectiveParentTaskId === existingTask.id) {
      throw new BadRequestException('A task cannot be its own parent');
    }

    const parentTask = await this.findPlanningTask(effectiveParentTaskId);
    if (!parentTask) {
      throw new NotFoundException(
        `Parent task ${effectiveParentTaskId} not found`,
      );
    }

    if (parentTask.projectId !== projectId) {
      throw new BadRequestException(
        'Parent task must belong to the same project',
      );
    }

    await this.ensureParentCanContainPlanningChild(
      projectId,
      parentTask,
      effectiveTaskKind,
      existingTask,
    );

    if (existingTask) {
      await this.ensureNoHierarchyCycle(existingTask.id, parentTask.id);
    }
  }

  private async ensureTaskHasNoChildren(taskId: string) {
    const childTask = await this.tasksRepository.findOne({
      select: { id: true },
      where: { parentTaskId: taskId },
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
        parentTask.parentTaskId,
      );
      if (grandparentTask?.taskKind === TaskKind.Standard) {
        throw new BadRequestException('Subtasks cannot contain child tasks');
      }
    }

    if (existingTask) {
      await this.ensureTaskHasNoChildren(existingTask.id);
    }
  }

  private async ensureNoHierarchyCycle(taskId: string, parentTaskId: string) {
    let currentParentId: string | null = parentTaskId;

    while (currentParentId) {
      if (currentParentId === taskId) {
        throw new BadRequestException('Task hierarchy cannot contain cycles');
      }

      const currentParent = await this.findPlanningTask(currentParentId);
      currentParentId = currentParent?.parentTaskId ?? null;
    }
  }

  private findPlanningTask(taskId: string) {
    return this.tasksRepository.findOne({
      select: {
        id: true,
        parentTaskId: true,
        projectId: true,
        taskKind: true,
      },
      where: { id: taskId },
    });
  }

  private decorateTask(task: Task): Task {
    return decoratePlanningTasks([task])[0];
  }

  private async decorateTaskWithLatest(task: Task): Promise<Task> {
    return (
      await this.attachLatestExecutionUpdates([this.decorateTask(task)])
    )[0];
  }

  private validateTaskPriority(priority: string) {
    if (!taskPriorities.has(priority)) {
      throw new BadRequestException(
        'Priority must be low, medium, high, or critical',
      );
    }
  }

  private normalizeNullableText(value?: string | null): string | null {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
  }

  private getExecutionChanges(
    task: Task,
    input: CreateTaskExecutionUpdateDto,
  ): TaskExecutionUpdate['changes'] {
    return {
      assigneeId: this.toChangeValue(
        task.assigneeId,
        input.assigneeId === undefined ? task.assigneeId : input.assigneeId,
      ),
      dueDate: this.toChangeValue(
        task.dueDate,
        input.targetCompletionDate ?? null,
      ),
      percentComplete: this.toChangeValue(
        task.percentComplete,
        input.percentComplete,
      ),
      priority: this.toChangeValue(task.priority, input.priority),
      remarks: this.toChangeValue(
        task.remarks,
        this.normalizeNullableText(input.updateNotes),
      ),
      status: this.toChangeValue(task.status, input.status),
    };
  }

  private toChangeValue(
    previousValue: string | number | null | undefined,
    nextValue: string | number | null | undefined,
  ) {
    return {
      previousValue: previousValue ?? null,
      nextValue: nextValue ?? null,
    };
  }

  private toExecutionUpdateDto(
    update: TaskExecutionUpdate,
  ): TaskExecutionUpdateDto {
    return {
      assigneeId: update.assigneeId ?? null,
      id: update.id,
      nextActionOwnerId: update.nextActionOwnerId ?? null,
      nextStep: update.nextStep ?? null,
      percentComplete: update.percentComplete,
      priority: update.priority,
      projectId: update.projectId,
      status: update.status,
      targetCompletionDate: update.targetCompletionDate ?? null,
      taskId: update.taskId,
      updateNotes: update.updateNotes ?? null,
      changes: update.changes ?? null,
      updatedById: update.updatedById ?? null,
      updatedOn: update.createdAt,
    };
  }

  private requireMilestoneQueryService(): MilestoneQueryService {
    if (!this.milestoneQueryService) {
      throw new Error('MilestoneQueryService is not configured');
    }
    return this.milestoneQueryService;
  }

  private async ensureMilestone(
    id: string,
    actor?: ProjectVisibilityActor,
  ): Promise<void> {
    const task = await this.findOne(id, actor);
    if (task.taskKind !== TaskKind.Milestone) {
      throw new BadRequestException(`Task ${id} is not a milestone`);
    }
  }
}
