import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { MyTasksSummaryDto } from './dto/my-tasks-summary.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { decoratePlanningTasks, getOperationalTasks } from './planning-rollup';
import {
  MilestoneQuery,
  MilestoneQueryService,
} from './milestone-query.service';
import { MilestoneProjectionPage } from './milestone-projection';

type AuthenticatedActor = AuthorizationActor;
const teamMemberEditableTaskFields = new Set([
  'assigneeId',
  'remarks',
  'percentComplete',
  'status',
]);

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly schedulingFoundationService: SchedulingFoundationService,
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
    await this.ensureCanManageProject(createTaskDto.projectId, actor);
    const normalizedInput =
      this.schedulingFoundationService.normalizeTaskMutation(createTaskDto);
    await this.validatePlanningFields(createTaskDto.projectId, normalizedInput);
    await this.validateAssigneeMembership(
      createTaskDto.projectId,
      normalizedInput.assigneeId,
    );
    const task = await this.tasksRepository.save(
      this.tasksRepository.create({
        ...this.withNormalizedProgress(normalizedInput),
        ...(actor?.userId
          ? { createdById: actor.userId, updatedById: actor.userId }
          : {}),
      }),
    );
    return this.decorateTask(task);
  }

  async findAll(actor?: ProjectVisibilityActor): Promise<Task[]> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    if (visibleProjectIds !== 'all' && visibleProjectIds.length === 0) {
      return [];
    }

    const tasks = await this.tasksRepository.find({
      relations: { project: true, assignee: true },
      where:
        visibleProjectIds === 'all'
          ? undefined
          : { projectId: In(visibleProjectIds) },
    });
    return decoratePlanningTasks(tasks);
  }

  findMyTasks(userId: string, query: MyTasksQueryDto = {}): Promise<Task[]> {
    return this.tasksRepository.find({
      order: {
        dueDate: 'ASC',
        createdAt: 'DESC',
      },
      relations: { project: true, assignee: true },
      where: {
        assigneeId: userId,
        taskKind: In([TaskKind.Standard, TaskKind.Milestone]),
        ...(query.status ? { status: query.status } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
    });
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

    if (
      !(await this.projectVisibilityService.canViewProject(
        task.projectId,
        actor,
      ))
    ) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return this.decorateTask(task);
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    const task = await this.findOne(id, actor);
    await this.ensureCanUpdateTask(task, updateTaskDto, actor);
    const normalizedInput =
      this.schedulingFoundationService.normalizeTaskMutation(
        updateTaskDto,
        task,
      );
    await this.validatePlanningFields(
      normalizedInput.projectId ?? task.projectId,
      normalizedInput,
      task,
    );
    await this.validateAssigneeMembership(
      normalizedInput.projectId ?? task.projectId,
      normalizedInput.assigneeId,
    );
    Object.assign(task, this.withNormalizedProgress(normalizedInput));
    if (actor?.userId) {
      task.updatedById = actor.userId;
    }
    const savedTask = await this.tasksRepository.save(task);
    return this.decorateTask(savedTask);
  }

  async remove(id: string, actor?: AuthenticatedActor): Promise<void> {
    const task = await this.findOne(id, actor);
    await this.ensureCanManageProject(task.projectId, actor);
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

  private async ensureCanUpdateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
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

    const disallowedFields = Object.keys(updateTaskDto).filter(
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

    if (parentTask.taskKind !== TaskKind.Summary) {
      throw new BadRequestException(
        'Only summary tasks can contain child tasks',
      );
    }

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
        'Only summary tasks can contain child tasks',
      );
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

  private withNormalizedProgress<
    T extends Partial<CreateTaskDto | UpdateTaskDto>,
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
