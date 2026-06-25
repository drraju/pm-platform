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
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { Project } from '../projects/entities/project.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { CreatePlanningDependencyDto } from './dto/create-planning-dependency.dto';
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { PlanningWorkspaceDto } from './dto/planning-workspace.dto';
import { UpdatePlanningTaskScheduleDto } from './dto/update-planning-task-schedule.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ScheduleSnapshot } from './entities/schedule-snapshot.entity';

type AuthenticatedActor = AuthorizationActor;

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(ScheduleSnapshot)
    private readonly snapshotsRepository: Repository<ScheduleSnapshot>,
    @InjectRepository(PlanningTaskSchedule)
    private readonly schedulesRepository: Repository<PlanningTaskSchedule>,
    @InjectRepository(ResourceAllocation)
    private readonly allocationsRepository: Repository<ResourceAllocation>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskDependency)
    private readonly taskDependenciesRepository: Repository<TaskDependency>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
  ) {}

  async getWorkspace(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<PlanningWorkspaceDto> {
    await this.ensureProjectVisible(projectId, actor);
    const snapshot = await this.ensureActiveSnapshot(projectId, actor?.userId);
    const [project, schedules, dependencies, resourceAllocations] =
      await Promise.all([
        this.projectsRepository.findOne({
          relations: { owner: true },
          where: { id: projectId },
        }),
        this.getSnapshotSchedules(snapshot.id),
        this.getProjectDependencies(projectId),
        this.allocationsRepository.find({
          order: { createdAt: 'ASC' },
          relations: { user: true },
          where: { projectId },
        }),
      ]);

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const criticalPathTaskIds = this.calculateCriticalPathTaskIds(
      schedules,
      dependencies,
    );
    await this.persistCriticalPath(snapshot, schedules, criticalPathTaskIds);

    return {
      criticalPathTaskIds,
      dependencies,
      project,
      resourceAllocations,
      schedules,
      snapshot,
    };
  }

  async updateTaskSchedule(
    projectId: string,
    taskId: string,
    input: UpdatePlanningTaskScheduleDto,
    actor?: AuthenticatedActor,
  ): Promise<PlanningTaskSchedule> {
    await this.ensureCanManageProject(projectId, actor);
    const snapshot = await this.ensureActiveSnapshot(projectId, actor?.userId);
    const schedule = await this.findScheduleByTask(
      snapshot.id,
      projectId,
      taskId,
    );

    if (schedule.taskKind === TaskKind.Summary) {
      throw new BadRequestException(
        'Summary tasks cannot be dragged or resized',
      );
    }

    const plannedStartDate =
      typeof input.plannedStartDate === 'undefined'
        ? schedule.plannedStartDate
        : input.plannedStartDate;
    const plannedFinishDate =
      typeof input.plannedFinishDate === 'undefined'
        ? schedule.plannedFinishDate
        : input.plannedFinishDate;

    const durationDays = this.calculateDurationDays(
      plannedStartDate,
      plannedFinishDate,
    );
    if (durationDays < 0) {
      throw new BadRequestException('Task duration cannot be negative');
    }
    if (schedule.taskKind === TaskKind.Milestone && durationDays > 0) {
      throw new BadRequestException('Milestone duration must be zero days');
    }

    Object.assign(schedule, {
      plannedFinishDate,
      plannedStartDate,
      durationDays,
      percentComplete: input.percentComplete ?? schedule.percentComplete,
      updatedById: actor?.userId,
    });

    return this.schedulesRepository.save(schedule);
  }

  async createDependency(
    projectId: string,
    input: CreatePlanningDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<TaskDependency> {
    await this.ensureCanManageProject(projectId, actor);
    if (input.predecessorTaskId === input.successorTaskId) {
      throw new BadRequestException(
        'A task dependency cannot reference the same task twice',
      );
    }

    const [predecessor, successor] = await Promise.all([
      this.findProjectTask(projectId, input.predecessorTaskId),
      this.findProjectTask(projectId, input.successorTaskId),
    ]);
    this.ensureDependencyEndpoint(predecessor);
    this.ensureDependencyEndpoint(successor);

    const dependencies = await this.getProjectDependencies(projectId);
    if (
      dependencies.some(
        (dependency) =>
          dependency.predecessorTaskId === input.predecessorTaskId &&
          dependency.successorTaskId === input.successorTaskId,
      )
    ) {
      throw new ConflictException(
        'An active dependency already exists between these tasks',
      );
    }
    this.ensureNoDependencyLoop(
      dependencies,
      input.predecessorTaskId,
      input.successorTaskId,
    );

    return this.taskDependenciesRepository.save(
      this.taskDependenciesRepository.create({
        ...input,
        createdById: actor?.userId,
        lagDays: input.lagDays ?? 0,
        updatedById: actor?.userId,
      }),
    );
  }

  async deleteDependency(
    projectId: string,
    dependencyId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureCanManageProject(projectId, actor);
    const dependency = await this.taskDependenciesRepository.findOne({
      relations: { predecessorTask: true, successorTask: true },
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

    dependency.deletedById = actor?.userId;
    dependency.updatedById = actor?.userId;
    await this.taskDependenciesRepository.softRemove(dependency);
  }

  async getCriticalPath(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<{ criticalPathTaskIds: string[] }> {
    const workspace = await this.getWorkspace(projectId, actor);
    return { criticalPathTaskIds: workspace.criticalPathTaskIds };
  }

  async createResourceAllocation(
    projectId: string,
    input: CreateResourceAllocationDto,
    actor?: AuthenticatedActor,
  ): Promise<ResourceAllocation> {
    await this.ensureCanManageProject(projectId, actor);
    await Promise.all([
      this.findProjectTask(projectId, input.taskId),
      this.ensureProjectMember(projectId, input.userId),
    ]);
    if (
      input.finishDate &&
      input.startDate &&
      input.finishDate < input.startDate
    ) {
      throw new BadRequestException(
        'Allocation finish date cannot be before start date',
      );
    }

    return this.allocationsRepository.save(
      this.allocationsRepository.create({
        ...input,
        createdById: actor?.userId,
        projectId,
        updatedById: actor?.userId,
      }),
    );
  }

  async updateResourceAllocation(
    projectId: string,
    allocationId: string,
    input: UpdateResourceAllocationDto,
    actor?: AuthenticatedActor,
  ): Promise<ResourceAllocation> {
    await this.ensureCanManageProject(projectId, actor);
    const allocation = await this.findAllocation(projectId, allocationId);
    const nextTaskId = input.taskId ?? allocation.taskId;
    const nextUserId = input.userId ?? allocation.userId;
    const nextStartDate =
      typeof input.startDate === 'undefined'
        ? allocation.startDate
        : input.startDate;
    const nextFinishDate =
      typeof input.finishDate === 'undefined'
        ? allocation.finishDate
        : input.finishDate;

    await Promise.all([
      this.findProjectTask(projectId, nextTaskId),
      this.ensureProjectMember(projectId, nextUserId),
    ]);
    if (nextFinishDate && nextStartDate && nextFinishDate < nextStartDate) {
      throw new BadRequestException(
        'Allocation finish date cannot be before start date',
      );
    }

    Object.assign(allocation, input, { updatedById: actor?.userId });
    return this.allocationsRepository.save(allocation);
  }

  async deleteResourceAllocation(
    projectId: string,
    allocationId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureCanManageProject(projectId, actor);
    const allocation = await this.findAllocation(projectId, allocationId);
    allocation.deletedById = actor?.userId;
    allocation.updatedById = actor?.userId;
    await this.allocationsRepository.softRemove(allocation);
  }

  private async ensureActiveSnapshot(
    projectId: string,
    actorId?: string,
  ): Promise<ScheduleSnapshot> {
    const latestSnapshot = await this.snapshotsRepository.findOne({
      order: { versionNumber: 'DESC' },
      where: { projectId },
    });
    if (latestSnapshot) {
      return latestSnapshot;
    }

    const tasks = await this.tasksRepository.find({
      order: { sequenceNumber: 'ASC', createdAt: 'ASC' },
      where: { projectId },
    });
    const snapshot = await this.snapshotsRepository.save(
      this.snapshotsRepository.create({
        calculatedAt: new Date(),
        createdById: actorId,
        criticalPathTaskIds: [],
        projectCompletionPercent: this.averageCompletion(tasks),
        projectFinishDate: this.maxDate(
          tasks.map((task) => task.plannedEndDate),
        ),
        projectId,
        projectStartDate: this.minDate(
          tasks.map((task) => task.plannedStartDate),
        ),
        updatedById: actorId,
        versionNumber: 1,
      }),
    );

    if (tasks.length > 0) {
      await this.schedulesRepository.save(
        tasks.map((task) =>
          this.schedulesRepository.create({
            createdById: actorId,
            durationDays: this.calculateDurationDays(
              task.plannedStartDate ?? task.startDate ?? null,
              task.plannedEndDate ?? task.dueDate ?? null,
            ),
            ownerId: task.assigneeId ?? null,
            parentTaskId: task.parentTaskId ?? null,
            percentComplete: task.percentComplete ?? 0,
            plannedFinishDate: task.plannedEndDate ?? task.dueDate ?? null,
            plannedStartDate: task.plannedStartDate ?? task.startDate ?? null,
            projectId,
            sequenceNumber: task.sequenceNumber ?? null,
            snapshotId: snapshot.id,
            taskId: task.id,
            taskKind: task.taskKind,
            taskTitle: task.title,
            updatedById: actorId,
          }),
        ),
      );
    }

    return snapshot;
  }

  private getSnapshotSchedules(snapshotId: string) {
    return this.schedulesRepository.find({
      order: { sequenceNumber: 'ASC', createdAt: 'ASC' },
      relations: { task: { assignee: true } },
      where: { snapshotId },
    });
  }

  private getProjectDependencies(projectId: string) {
    return this.taskDependenciesRepository.find({
      order: { createdAt: 'ASC' },
      relations: { predecessorTask: true, successorTask: true },
      where: [
        { predecessorTask: { projectId } },
        { successorTask: { projectId } },
      ],
    });
  }

  private calculateCriticalPathTaskIds(
    schedules: PlanningTaskSchedule[],
    dependencies: TaskDependency[],
  ): string[] {
    const leafSchedules = schedules.filter(
      (schedule) => schedule.taskKind !== TaskKind.Summary,
    );
    if (leafSchedules.length === 0) {
      return [];
    }

    const finishDates = leafSchedules
      .map((schedule) => schedule.plannedFinishDate)
      .filter((value): value is string => Boolean(value));
    const projectFinish = this.maxDate(finishDates);
    if (!projectFinish) {
      return leafSchedules
        .filter(
          (schedule) =>
            schedule.durationDays ===
            Math.max(...leafSchedules.map((item) => item.durationDays)),
        )
        .map((schedule) => schedule.taskId);
    }

    const reverseEdges = new Map<string, string[]>();
    dependencies.forEach((dependency) => {
      reverseEdges.set(dependency.successorTaskId, [
        ...(reverseEdges.get(dependency.successorTaskId) ?? []),
        dependency.predecessorTaskId,
      ]);
    });

    const critical = new Set<string>();
    const finishers = leafSchedules.filter(
      (schedule) => schedule.plannedFinishDate === projectFinish,
    );
    const visit = (taskId: string) => {
      if (critical.has(taskId)) {
        return;
      }
      critical.add(taskId);
      (reverseEdges.get(taskId) ?? []).forEach(visit);
    };
    finishers.forEach((schedule) => visit(schedule.taskId));
    return Array.from(critical);
  }

  private async persistCriticalPath(
    snapshot: ScheduleSnapshot,
    schedules: PlanningTaskSchedule[],
    criticalPathTaskIds: string[],
  ) {
    const criticalSet = new Set(criticalPathTaskIds);
    await Promise.all(
      schedules.map((schedule) => {
        const isCritical = criticalSet.has(schedule.taskId);
        if (schedule.isCritical === isCritical) {
          return Promise.resolve(schedule);
        }
        schedule.isCritical = isCritical;
        return this.schedulesRepository.save(schedule);
      }),
    );
    snapshot.criticalPathTaskIds = criticalPathTaskIds;
    snapshot.projectStartDate = this.minDate(
      schedules.map((schedule) => schedule.plannedStartDate),
    );
    snapshot.projectFinishDate = this.maxDate(
      schedules.map((schedule) => schedule.plannedFinishDate),
    );
    snapshot.projectCompletionPercent = this.averageCompletion(schedules);
    snapshot.calculatedAt = new Date();
    await this.snapshotsRepository.save(snapshot);
  }

  private ensureNoDependencyLoop(
    dependencies: TaskDependency[],
    predecessorTaskId: string,
    successorTaskId: string,
  ) {
    const edges = new Map<string, string[]>();
    dependencies.forEach((dependency) => {
      edges.set(dependency.predecessorTaskId, [
        ...(edges.get(dependency.predecessorTaskId) ?? []),
        dependency.successorTaskId,
      ]);
    });
    edges.set(predecessorTaskId, [
      ...(edges.get(predecessorTaskId) ?? []),
      successorTaskId,
    ]);

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (taskId: string): boolean => {
      if (visiting.has(taskId)) {
        return true;
      }
      if (visited.has(taskId)) {
        return false;
      }
      visiting.add(taskId);
      const hasLoop = (edges.get(taskId) ?? []).some(visit);
      visiting.delete(taskId);
      visited.add(taskId);
      return hasLoop;
    };

    if (Array.from(edges.keys()).some(visit)) {
      throw new BadRequestException('Dependency loops are not allowed');
    }
  }

  private calculateDurationDays(
    startDate?: string | null,
    finishDate?: string | null,
  ) {
    if (!startDate || !finishDate) {
      return 0;
    }
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const finish = new Date(`${finishDate}T00:00:00Z`).getTime();
    return Math.round((finish - start) / 86_400_000);
  }

  private averageCompletion(
    items: Array<{ percentComplete?: number | null; taskKind?: TaskKind }>,
  ) {
    const operationalItems = items.filter(
      (item) => item.taskKind !== TaskKind.Summary,
    );
    if (operationalItems.length === 0) {
      return 0;
    }
    return Number(
      (
        operationalItems.reduce(
          (total, item) => total + Number(item.percentComplete ?? 0),
          0,
        ) / operationalItems.length
      ).toFixed(2),
    );
  }

  private minDate(values: Array<string | null | undefined>) {
    const dates = values.filter((value): value is string => Boolean(value));
    return dates.length > 0 ? dates.toSorted()[0] : null;
  }

  private maxDate(values: Array<string | null | undefined>) {
    const dates = values.filter((value): value is string => Boolean(value));
    return dates.length > 0 ? (dates.toSorted().at(-1) ?? null) : null;
  }

  private async ensureProjectVisible(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ) {
    await this.ensureProjectExists(projectId);
    if (await this.projectVisibilityService.canViewProject(projectId, actor)) {
      return;
    }
    throw new ForbiddenException('Project access is restricted');
  }

  private async ensureCanManageProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ) {
    await this.ensureProjectExists(projectId);
    if (
      await this.authorizationPolicyService.canManageProject(projectId, actor)
    ) {
      return;
    }
    throw new ForbiddenException('Project manager access is required');
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.projectsRepository.findOne({
      select: { id: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private async findProjectTask(projectId: string, taskId: string) {
    const task = await this.tasksRepository.findOne({
      select: {
        assigneeId: true,
        id: true,
        parentTaskId: true,
        projectId: true,
        taskKind: true,
      },
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }
    return task;
  }

  private ensureDependencyEndpoint(task: Pick<Task, 'taskKind'>) {
    if (task.taskKind === TaskKind.Summary) {
      throw new BadRequestException(
        'Summary tasks cannot be dependency endpoints',
      );
    }
  }

  private async findScheduleByTask(
    snapshotId: string,
    projectId: string,
    taskId: string,
  ) {
    const schedule = await this.schedulesRepository.findOne({
      where: { projectId, snapshotId, taskId },
    });
    if (!schedule) {
      throw new NotFoundException(`Schedule row for task ${taskId} not found`);
    }
    return schedule;
  }

  private async ensureProjectMember(projectId: string, userId: string) {
    const [user, member] = await Promise.all([
      this.usersRepository.findOne({
        select: { id: true },
        where: { id: userId },
      }),
      this.projectMembersRepository.findOne({
        select: { id: true },
        where: { projectId, userId },
      }),
    ]);
    if (!user || !member) {
      throw new BadRequestException(
        'Resource allocation user must be a project member',
      );
    }
  }

  private async findAllocation(projectId: string, allocationId: string) {
    const allocation = await this.allocationsRepository.findOne({
      where: { id: allocationId, projectId },
    });
    if (!allocation) {
      throw new NotFoundException(
        `Resource allocation ${allocationId} not found for project ${projectId}`,
      );
    }
    return allocation;
  }
}
