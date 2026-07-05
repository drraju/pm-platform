import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { ResourceAllocationUnit } from '../../common/enums/resource-allocation-unit.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { ProjectBaseline } from '../projects/entities/project-baseline.entity';
import { Project } from '../projects/entities/project.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { CreateProjectBaselineDto } from '../projects/dto/create-project-baseline.dto';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDependencyDto } from '../tasks/dto/create-task-dependency.dto';
import { UpdateTaskDependencyDto } from '../tasks/dto/update-task-dependency.dto';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { CriticalPathDto } from './dto/critical-path.dto';
import { CreatePortfolioDependencyDto } from './dto/create-portfolio-dependency.dto';
import { CreatePlanningTaskDto } from './dto/create-planning-task.dto';
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { CreateResourceCapacityDto } from './dto/create-resource-capacity.dto';
import {
  PlanningWorkspaceDto,
  PlanningWorkspaceScheduleDto,
  PlanningWorkspaceSnapshotDto,
} from './dto/planning-workspace.dto';
import { UpdatePortfolioDependencyDto } from './dto/update-portfolio-dependency.dto';
import { UpdatePlanningTaskScheduleDto } from './dto/update-planning-task-schedule.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { UpdateResourceCapacityDto } from './dto/update-resource-capacity.dto';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PortfolioDependency } from './entities/portfolio-dependency.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacity } from './entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from './entities/resource-workload-snapshot.entity';
import { PlanningSnapshotService } from './planning-snapshot.service';
import {
  PlanningScheduleEngineError,
  PlanningScheduleEngineService,
  ScheduleAnalysis,
  ScheduleAnalysisNode,
} from './planning-schedule-engine.service';

type AuthenticatedActor = AuthorizationActor;

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningScheduleSnapshot)
    private readonly scheduleSnapshotsRepository: Repository<PlanningScheduleSnapshot>,
    @InjectRepository(PlanningTaskSchedule)
    private readonly planningTaskSchedulesRepository: Repository<PlanningTaskSchedule>,
    @InjectRepository(ResourceAllocation)
    private readonly resourceAllocationsRepository: Repository<ResourceAllocation>,
    @InjectRepository(ResourceCapacity)
    private readonly resourceCapacitiesRepository: Repository<ResourceCapacity>,
    @InjectRepository(ResourceWorkloadSnapshot)
    private readonly workloadSnapshotsRepository: Repository<ResourceWorkloadSnapshot>,
    @InjectRepository(PortfolioDependency)
    private readonly portfolioDependenciesRepository: Repository<PortfolioDependency>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly projectsService: ProjectsService,
    private readonly schedulingFoundationService: SchedulingFoundationService,
    private readonly planningScheduleEngineService: PlanningScheduleEngineService,
    private readonly planningSnapshotService: PlanningSnapshotService,
  ) {}

  async getWorkspace(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<PlanningWorkspaceDto> {
    await this.ensureProjectVisible(projectId, actor);

    const latestSchedule = await this.ensureWorkspaceSnapshot(projectId, actor);
    await this.persistSummaryRollups(latestSchedule, actor);

    const [project, dependencies, resourceAllocations] = await Promise.all([
      this.projectsRepository.findOne({
        where: { id: projectId },
      }),
      this.projectsService.findProjectTaskDependencies(projectId, actor),
      this.resourceAllocationsRepository.find({
        order: { startDate: 'ASC', createdAt: 'ASC' },
        relations: { task: true, user: true },
        where: { projectId },
      }),
    ]);

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const snapshot = this.toWorkspaceSnapshot(projectId, latestSchedule);
    const scheduleAnalysis = this.analyzeWorkspaceSchedule(
      latestSchedule,
      dependencies,
    );
    const schedules = this.toWorkspaceSchedules(latestSchedule, scheduleAnalysis);

    return {
      criticalPathTaskIds: schedules
        .filter((schedule) => schedule.isCritical)
        .map((schedule) => schedule.taskId),
      dependencies,
      project,
      resourceAllocations,
      schedules,
      snapshot,
    };
  }

  async getLatestSchedule(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<PlanningScheduleSnapshot | null> {
    await this.ensureProjectVisible(projectId, actor);
    return this.scheduleSnapshotsRepository.findOne({
      order: { scheduleVersion: 'DESC' },
      relations: { taskSchedules: { task: { assignee: true } } },
      where: { projectId },
    });
  }

  async requestScheduleRecalculation(
    projectId: string,
    actor?: AuthenticatedActor,
  ): Promise<PlanningScheduleSnapshot> {
    await this.ensureCanManageProject(projectId, actor);

    const latest = await this.scheduleSnapshotsRepository.findOne({
      order: { scheduleVersion: 'DESC' },
      select: { id: true, scheduleVersion: true },
      where: { projectId },
    });

    const snapshot = this.scheduleSnapshotsRepository.create({
      calculationStatus: PlanningCalculationStatus.Pending,
      createdById: actor?.userId,
      criticalPathTaskIds: [],
      metadata: {
        phase: 'v0.2.0-phase-1',
        reason: 'Scheduling calculation is implemented in Phase 2.',
      },
      projectCompletionPercent: 0,
      projectId,
      scheduleVersion: (latest?.scheduleVersion ?? 0) + 1,
      updatedById: actor?.userId,
    });

    return this.scheduleSnapshotsRepository.save(snapshot);
  }

  private async ensureWorkspaceSnapshot(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<PlanningScheduleSnapshot> {
    const latestSchedule = await this.scheduleSnapshotsRepository.findOne({
      order: { scheduleVersion: 'DESC' },
      relations: { taskSchedules: { task: { assignee: true } } },
      where: { projectId },
    });

    if (latestSchedule) {
      const hasOrphanedTaskSchedules = (latestSchedule.taskSchedules ?? []).some(
        (taskSchedule) => !taskSchedule.task,
      );
      if (hasOrphanedTaskSchedules) {
        return this.planningSnapshotService.rebuildWorkspaceSnapshot(
          projectId,
          actor,
        );
      }
      return latestSchedule;
    }

    return this.planningSnapshotService.rebuildWorkspaceSnapshot(projectId, actor);
  }

  async getCriticalPath(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<CriticalPathDto> {
    const latestSchedule = await this.getLatestSchedule(projectId, actor);

    return {
      calculationStatus:
        latestSchedule?.calculationStatus ?? PlanningCalculationStatus.Pending,
      projectId,
      taskIds: latestSchedule?.criticalPathTaskIds ?? [],
    };
  }

  async updatePlanningTaskSchedule(
    projectId: string,
    scheduleId: string,
    input: UpdatePlanningTaskScheduleDto,
    actor?: AuthenticatedActor,
  ): Promise<PlanningWorkspaceScheduleDto> {
    await this.ensureCanManageProject(projectId, actor);

    const schedule = await this.findPlanningTaskSchedule(projectId, scheduleId);

    if (input.parentTaskId !== undefined && input.parentTaskId !== null) {
      await this.ensureTaskCanContainChildren(projectId, input.parentTaskId);
      await this.ensureNoPlanningHierarchyCycle(
        projectId,
        schedule.taskId,
        input.parentTaskId,
      );
    }

    if (input.ownerId !== undefined && input.ownerId !== null) {
      await this.ensureUserExists(input.ownerId);
    }

    const taskKind = this.schedulingFoundationService.normalizeTaskKind(
      { taskKind: schedule.taskKind ?? schedule.task?.taskKind },
      TaskKind.Standard,
    );
    const normalizedSchedule =
      this.schedulingFoundationService.normalizeScheduleMutation(
        taskKind,
        input,
        schedule,
      );

    if (
      schedule.task &&
      (input.ownerId !== undefined ||
        input.parentTaskId !== undefined ||
        input.sequenceNumber !== undefined ||
        input.status !== undefined ||
        input.taskTitle !== undefined ||
        input.milestoneCategory !== undefined ||
        input.plannedStartDate !== undefined ||
        input.plannedFinishDate !== undefined ||
        input.durationDays !== undefined ||
        input.percentComplete !== undefined)
    ) {
      if (input.ownerId !== undefined) {
        schedule.task.assigneeId = input.ownerId;
      }
      if (input.parentTaskId !== undefined) {
        schedule.task.parentTaskId = input.parentTaskId;
      }
      if (input.sequenceNumber !== undefined) {
        schedule.task.sequenceNumber = input.sequenceNumber;
      }
      if (input.status !== undefined) {
        schedule.task.status = input.status;
      }
      if (input.taskTitle !== undefined) {
        const nextTitle = input.taskTitle.trim();
        if (!nextTitle) {
          throw new BadRequestException('Task name is required');
        }
        schedule.task.title = nextTitle;
      }
      schedule.task.dueDate = normalizedSchedule.plannedEndDate;
      schedule.task.milestoneCategory = normalizedSchedule.milestoneCategory;
      schedule.task.plannedEndDate = normalizedSchedule.plannedEndDate;
      schedule.task.plannedStartDate = normalizedSchedule.plannedStartDate;
      schedule.task.percentComplete =
        input.percentComplete ?? Number(schedule.percentComplete ?? 0);
      schedule.task.updatedById = actor?.userId;
      const rebuiltSnapshot =
        await this.scheduleSnapshotsRepository.manager.transaction(
          async (manager) => {
            await manager.getRepository(Task).save(schedule.task as Task);
            return this.planningSnapshotService.rebuildWorkspaceSnapshot(
              projectId,
              actor,
              manager,
            );
          },
        );
      return this.requireWorkspaceSchedule(rebuiltSnapshot, schedule.taskId, projectId);
    }

    const rebuiltSnapshot = await this.planningSnapshotService.rebuildWorkspaceSnapshot(
      projectId,
      actor,
    );
    return this.requireWorkspaceSchedule(rebuiltSnapshot, schedule.taskId, projectId);
  }

  async createPlanningTask(
    projectId: string,
    input: CreatePlanningTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<PlanningWorkspaceScheduleDto> {
    await this.ensureCanManageProject(projectId, actor);

    if (input.parentTaskId) {
      await this.ensureTaskCanContainChildren(projectId, input.parentTaskId);
    }

    const latestSchedule = await this.ensureWorkspaceSnapshot(projectId, actor);

    return this.scheduleSnapshotsRepository.manager.transaction(
      async (manager) => {
        const tasksRepository = manager.getRepository(Task);

        const parentTaskId = input.parentTaskId ?? null;
        const siblingSchedules = await tasksRepository.find({
          select: { sequenceNumber: true },
          where: {
            parentTaskId: parentTaskId ?? IsNull(),
            projectId,
          },
        });
        const sequenceNumber =
          siblingSchedules.reduce(
            (maxSequence, schedule) =>
              Math.max(maxSequence, schedule.sequenceNumber ?? 0),
            0,
          ) + 1;
        const taskKind = this.schedulingFoundationService.normalizeTaskKind(
          input,
          TaskKind.Standard,
        );
        const normalizedTaskInput =
          this.schedulingFoundationService.normalizeTaskMutation({
            milestoneCategory: input.milestoneCategory,
            taskKind,
          });
        const plannedStartDate =
          taskKind === TaskKind.Summary
            ? null
            : latestSchedule.projectStartDate ?? this.todayDateString();
        const plannedEndDate =
          taskKind === TaskKind.Milestone
            ? plannedStartDate
            : taskKind === TaskKind.Summary || !plannedStartDate
              ? null
              : this.schedulingFoundationService.shiftDateString(
                  plannedStartDate,
                  1,
                );
        const durationDays =
          taskKind === TaskKind.Milestone
            ? 0
            : this.schedulingFoundationService.calculateDurationDays(
                plannedStartDate,
                plannedEndDate,
              );
        const title = input.title?.trim() || 'New Task';

        const task = await tasksRepository.save(
          tasksRepository.create({
            createdById: actor?.userId,
            dueDate: plannedEndDate,
            milestoneCategory: normalizedTaskInput.milestoneCategory,
            parentTaskId,
            percentComplete: 0,
            plannedEndDate,
            plannedStartDate,
            priority: 'medium',
            projectId,
            sequenceNumber,
            startDate: plannedStartDate,
            status: TaskStatus.Todo,
            taskKind,
            title,
            updatedById: actor?.userId,
          }),
        );

        const rebuiltSnapshot =
          await this.planningSnapshotService.rebuildWorkspaceSnapshot(
            projectId,
            actor,
            manager,
          );

        return this.requireWorkspaceSchedule(
          rebuiltSnapshot,
          task.id,
          projectId,
        );
      },
    );
  }

  captureBaseline(
    projectId: string,
    input: CreateProjectBaselineDto,
    actor: AuthenticatedActor,
  ): Promise<ProjectBaseline> {
    return this.projectsService.captureProjectBaseline(projectId, input, actor);
  }

  listBaselines(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ProjectBaseline[]> {
    return this.projectsService.findProjectBaselines(projectId, actor);
  }

  createTaskDependency(
    projectId: string,
    input: CreateTaskDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<TaskDependency> {
    return this.projectsService.createProjectTaskDependency(
      projectId,
      input,
      actor,
    );
  }

  listTaskDependencies(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<TaskDependency[]> {
    return this.projectsService.findProjectTaskDependencies(projectId, actor);
  }

  updateTaskDependency(
    projectId: string,
    dependencyId: string,
    input: UpdateTaskDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<TaskDependency> {
    return this.projectsService.updateProjectTaskDependency(
      projectId,
      dependencyId,
      input,
      actor,
    );
  }

  removeTaskDependency(
    projectId: string,
    dependencyId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    return this.projectsService.removeProjectTaskDependency(
      projectId,
      dependencyId,
      actor,
    );
  }

  async createResourceCapacity(
    projectId: string,
    input: CreateResourceCapacityDto,
    actor?: AuthenticatedActor,
  ): Promise<ResourceCapacity> {
    await this.ensureCanManageProject(projectId, actor);
    await this.validateResourceTarget(
      input.resourceUnit,
      input.userId,
      input.teamName,
    );

    const capacity = this.resourceCapacitiesRepository.create({
      ...input,
      createdById: actor?.userId,
      projectId,
      timezone: input.timezone ?? 'UTC',
      updatedById: actor?.userId,
    });

    return this.resourceCapacitiesRepository.save(capacity);
  }

  async listResourceCapacities(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ResourceCapacity[]> {
    await this.ensureProjectVisible(projectId, actor);
    return this.resourceCapacitiesRepository.find({
      order: { capacityDate: 'ASC', createdAt: 'ASC' },
      relations: { user: true },
      where: { projectId },
    });
  }

  async updateResourceCapacity(
    projectId: string,
    capacityId: string,
    input: UpdateResourceCapacityDto,
    actor?: AuthenticatedActor,
  ): Promise<ResourceCapacity> {
    await this.ensureCanManageProject(projectId, actor);
    const capacity = await this.findResourceCapacity(projectId, capacityId);
    const nextUnit = input.resourceUnit ?? capacity.resourceUnit;
    const nextUserId =
      typeof input.userId === 'undefined' ? capacity.userId : input.userId;
    const nextTeamName =
      typeof input.teamName === 'undefined'
        ? capacity.teamName
        : input.teamName;
    await this.validateResourceTarget(nextUnit, nextUserId, nextTeamName);

    Object.assign(capacity, input, { updatedById: actor?.userId });
    return this.resourceCapacitiesRepository.save(capacity);
  }

  async removeResourceCapacity(
    projectId: string,
    capacityId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureCanManageProject(projectId, actor);
    const capacity = await this.findResourceCapacity(projectId, capacityId);
    capacity.deletedById = actor?.userId;
    capacity.updatedById = actor?.userId;
    await this.resourceCapacitiesRepository.softRemove(capacity);
  }

  async createResourceAllocation(
    projectId: string,
    input: CreateResourceAllocationDto,
    actor?: AuthenticatedActor,
  ): Promise<ResourceAllocation> {
    await this.ensureCanManageProject(projectId, actor);
    await this.validateAllocationInput(projectId, input);

    const allocation = this.resourceAllocationsRepository.create({
      ...input,
      createdById: actor?.userId,
      projectId,
      updatedById: actor?.userId,
    });

    return this.resourceAllocationsRepository.save(allocation);
  }

  async listResourceAllocations(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ResourceAllocation[]> {
    await this.ensureProjectVisible(projectId, actor);
    return this.resourceAllocationsRepository.find({
      order: { startDate: 'ASC', createdAt: 'ASC' },
      relations: { task: true, user: true },
      where: { projectId },
    });
  }

  async updateResourceAllocation(
    projectId: string,
    allocationId: string,
    input: UpdateResourceAllocationDto,
    actor?: AuthenticatedActor,
  ): Promise<ResourceAllocation> {
    await this.ensureCanManageProject(projectId, actor);
    const allocation = await this.findResourceAllocation(
      projectId,
      allocationId,
    );
    const nextInput = { ...allocation, ...input };
    await this.validateAllocationInput(projectId, nextInput);

    Object.assign(allocation, input, { updatedById: actor?.userId });
    return this.resourceAllocationsRepository.save(allocation);
  }

  async removeResourceAllocation(
    projectId: string,
    allocationId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureCanManageProject(projectId, actor);
    const allocation = await this.findResourceAllocation(
      projectId,
      allocationId,
    );
    allocation.deletedById = actor?.userId;
    allocation.updatedById = actor?.userId;
    await this.resourceAllocationsRepository.softRemove(allocation);
  }

  async listResourceHeatMap(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<ResourceWorkloadSnapshot[]> {
    await this.ensureProjectVisible(projectId, actor);
    return this.workloadSnapshotsRepository.find({
      order: { workloadDate: 'ASC', createdAt: 'ASC' },
      relations: { user: true },
      where: { projectId },
    });
  }

  async getPortfolioTimeline(actor?: ProjectVisibilityActor): Promise<{
    schedules: PlanningScheduleSnapshot[];
    dependencies: PortfolioDependency[];
  }> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    if (visibleProjectIds !== 'all' && visibleProjectIds.length === 0) {
      return { dependencies: [], schedules: [] };
    }

    const projectWhere =
      visibleProjectIds === 'all'
        ? undefined
        : { projectId: In(visibleProjectIds) };
    const dependencyWhere =
      visibleProjectIds === 'all'
        ? undefined
        : [
            { predecessorProjectId: In(visibleProjectIds) },
            { successorProjectId: In(visibleProjectIds) },
          ];

    const [schedules, dependencies] = await Promise.all([
      this.scheduleSnapshotsRepository.find({
        order: { projectFinishDate: 'ASC', scheduleVersion: 'DESC' },
        relations: { project: true },
        where: projectWhere,
      }),
      this.portfolioDependenciesRepository.find({
        order: { createdAt: 'ASC' },
        relations: {
          predecessorProject: true,
          predecessorTask: true,
          successorProject: true,
          successorTask: true,
        },
        where: dependencyWhere,
      }),
    ]);

    return { dependencies, schedules };
  }

  async createPortfolioDependency(
    input: CreatePortfolioDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<PortfolioDependency> {
    await this.ensureCanManageProject(input.predecessorProjectId, actor);
    await this.ensureCanManageProject(input.successorProjectId, actor);
    await this.validatePortfolioDependency(input);

    const dependency = this.portfolioDependenciesRepository.create({
      ...input,
      createdById: actor?.userId,
      lagDays: input.lagDays ?? 0,
      status: input.status ?? 'active',
      updatedById: actor?.userId,
    });

    return this.portfolioDependenciesRepository.save(dependency);
  }

  async updatePortfolioDependency(
    dependencyId: string,
    input: UpdatePortfolioDependencyDto,
    actor?: AuthenticatedActor,
  ): Promise<PortfolioDependency> {
    const dependency = await this.findPortfolioDependency(dependencyId);
    await this.ensureCanManageProject(dependency.predecessorProjectId, actor);
    await this.ensureCanManageProject(dependency.successorProjectId, actor);
    const nextInput = { ...dependency, ...input };
    await this.validatePortfolioDependency(nextInput, dependency.id);

    Object.assign(dependency, input, {
      lagDays: input.lagDays ?? dependency.lagDays,
      updatedById: actor?.userId,
    });
    return this.portfolioDependenciesRepository.save(dependency);
  }

  async removePortfolioDependency(
    dependencyId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    const dependency = await this.findPortfolioDependency(dependencyId);
    await this.ensureCanManageProject(dependency.predecessorProjectId, actor);
    await this.ensureCanManageProject(dependency.successorProjectId, actor);
    dependency.deletedById = actor?.userId;
    dependency.updatedById = actor?.userId;
    await this.portfolioDependenciesRepository.softRemove(dependency);
  }

  private toWorkspaceSnapshot(
    projectId: string,
    latestSchedule: PlanningScheduleSnapshot | null,
  ): PlanningWorkspaceSnapshotDto {
    return {
      calculatedAt: latestSchedule?.calculatedAt ?? null,
      criticalPathTaskIds: latestSchedule?.criticalPathTaskIds ?? [],
      id: latestSchedule?.id ?? '',
      projectCompletionPercent: Number(
        latestSchedule?.projectCompletionPercent ?? 0,
      ),
      projectFinishDate: latestSchedule?.projectFinishDate ?? null,
      projectId,
      projectStartDate: latestSchedule?.projectStartDate ?? null,
      versionNumber: latestSchedule?.scheduleVersion ?? 0,
    };
  }

  private analyzeWorkspaceSchedule(
    latestSchedule: PlanningScheduleSnapshot | null,
    dependencies: TaskDependency[],
  ): ScheduleAnalysis | null {
    const taskSchedules = latestSchedule?.taskSchedules ?? [];
    if (taskSchedules.length === 0) {
      return null;
    }

    try {
      return this.planningScheduleEngineService.analyze({
        dependencies: dependencies.map((dependency) => ({
          dependencyType: dependency.dependencyType,
          id: dependency.id,
          predecessorTaskId: dependency.predecessorTaskId,
          successorTaskId: dependency.successorTaskId,
        })),
        tasks: taskSchedules.map((taskSchedule) => ({
          durationDays: taskSchedule.durationDays ?? 0,
          parentTaskId:
            taskSchedule.parentTaskId ??
            taskSchedule.task?.parentTaskId ??
            null,
          taskId: taskSchedule.taskId,
          taskKind: taskSchedule.taskKind,
        })),
      });
    } catch (error) {
      if (error instanceof PlanningScheduleEngineError) {
        throw new BadRequestException({
          errors: error.issues,
          message: error.message,
        });
      }

      throw error;
    }
  }

  private toWorkspaceSchedules(
    latestSchedule: PlanningScheduleSnapshot | null,
    scheduleAnalysis: ScheduleAnalysis | null = null,
  ): PlanningWorkspaceScheduleDto[] {
    const analysisByTaskId = new Map(
      scheduleAnalysis?.nodes.map((node) => [node.taskId, node]) ?? [],
    );

    return (latestSchedule?.taskSchedules ?? []).map((taskSchedule) =>
      this.toWorkspaceSchedule(
        taskSchedule,
        analysisByTaskId.get(taskSchedule.taskId) ?? null,
      ),
    );
  }

  private async rollupSnapshotById(
    projectId: string,
    snapshotId: string,
    actor?: AuthenticatedActor,
  ) {
    const snapshot = await this.scheduleSnapshotsRepository.findOne({
      relations: { taskSchedules: { task: { assignee: true } } },
      where: { id: snapshotId, projectId },
    });

    if (!snapshot) {
      return;
    }

    await this.persistSummaryRollups(snapshot, actor);
  }

  private async persistSummaryRollups(
    snapshot: PlanningScheduleSnapshot,
    actor?: AuthenticatedActor,
  ) {
    const taskSchedules = snapshot.taskSchedules ?? [];
    if (taskSchedules.length === 0) {
      return;
    }

    const { changedSummaries } =
      this.schedulingFoundationService.rollupSummarySchedules(taskSchedules);
    if (changedSummaries.length === 0) {
      return;
    }

    changedSummaries.forEach((summary) => {
      summary.updatedById = actor?.userId;
      if (summary.task) {
        summary.task.updatedById = actor?.userId;
      }
    });

    await this.planningTaskSchedulesRepository.save(changedSummaries);
    const summaryTasks = changedSummaries
      .map((summary) => summary.task)
      .filter((task): task is Task => Boolean(task));
    if (summaryTasks.length > 0) {
      await this.tasksRepository.save(summaryTasks);
    }
  }

  private toWorkspaceSchedule(
    taskSchedule: PlanningTaskSchedule,
    analysisNode: ScheduleAnalysisNode | null = null,
  ): PlanningWorkspaceScheduleDto {
    return {
      durationDays: taskSchedule.durationDays ?? 0,
      earlyFinish: analysisNode?.earlyFinish ?? null,
      earlyStart: analysisNode?.earlyStart ?? null,
      freeFloatDays: analysisNode?.freeFloat ?? null,
      id: taskSchedule.id,
      isCritical: analysisNode?.isCritical ?? false,
      lateFinish: analysisNode?.lateFinish ?? null,
      lateStart: analysisNode?.lateStart ?? null,
      ownerId: taskSchedule.task?.assigneeId ?? null,
      parentTaskId:
        taskSchedule.parentTaskId ?? taskSchedule.task?.parentTaskId ?? null,
      percentComplete: Number(taskSchedule.percentComplete ?? 0),
      plannedFinishDate: taskSchedule.plannedEndDate ?? null,
      plannedStartDate: taskSchedule.plannedStartDate ?? null,
      projectId: taskSchedule.projectId,
      sequenceNumber:
        taskSchedule.sequenceNumber ??
        taskSchedule.task?.sequenceNumber ??
        null,
      snapshotId: taskSchedule.snapshotId,
      status: taskSchedule.task?.status ?? null,
      task: taskSchedule.task ?? null,
      taskId: taskSchedule.taskId,
      taskKind: taskSchedule.taskKind,
      taskType: this.schedulingFoundationService.toTaskType(
        taskSchedule.taskKind,
      ),
      milestoneCategory:
        taskSchedule.milestoneCategory ??
        taskSchedule.task?.milestoneCategory ??
        null,
      taskTitle: taskSchedule.task?.title ?? taskSchedule.taskId,
      totalFloatDays: analysisNode?.totalFloat ?? null,
    };
  }

  private findEarliestTaskDate(tasks: Task[]): string | null {
    const dates = tasks
      .map((task) => task.plannedStartDate ?? task.startDate)
      .filter((date): date is string => Boolean(date))
      .sort();

    return dates[0] ?? null;
  }

  private findLatestTaskDate(tasks: Task[]): string | null {
    const dates = tasks
      .map((task) => task.plannedEndDate ?? task.dueDate)
      .filter((date): date is string => Boolean(date))
      .sort();

    return dates[dates.length - 1] ?? null;
  }

  private todayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private requireWorkspaceSchedule(
    snapshot: PlanningScheduleSnapshot,
    taskId: string,
    projectId: string,
  ): PlanningWorkspaceScheduleDto {
    const schedule = (snapshot.taskSchedules ?? []).find(
      (taskSchedule) => taskSchedule.taskId === taskId,
    );
    if (!schedule) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }

    return this.toWorkspaceSchedule(schedule);
  }

  private minDateString(
    left?: string | null,
    right?: string | null,
  ): string | null {
    if (!left) {
      return right ?? null;
    }
    if (!right) {
      return left;
    }
    return left < right ? left : right;
  }

  private maxDateString(
    left?: string | null,
    right?: string | null,
  ): string | null {
    if (!left) {
      return right ?? null;
    }
    if (!right) {
      return left;
    }
    return left > right ? left : right;
  }

  private async ensureProjectVisible(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);
    if (await this.projectVisibilityService.canViewProject(projectId, actor)) {
      return;
    }

    throw new ForbiddenException('Project access is restricted');
  }

  private async ensureCanManageProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    await this.ensureProjectExists(projectId);
    if (
      await this.authorizationPolicyService.canManageProject(projectId, actor)
    ) {
      return;
    }

    throw new ForbiddenException('Project manager access is required');
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

  private async validateResourceTarget(
    resourceUnit: ResourceAllocationUnit,
    userId?: string | null,
    teamName?: string | null,
  ): Promise<void> {
    if (resourceUnit === ResourceAllocationUnit.User) {
      if (!userId || teamName) {
        throw new BadRequestException('User resources require userId only');
      }
      await this.ensureUserExists(userId);
      return;
    }

    if (!teamName || userId) {
      throw new BadRequestException('Team resources require teamName only');
    }
  }

  private async validateAllocationInput(
    projectId: string,
    input: Pick<
      CreateResourceAllocationDto,
      | 'endDate'
      | 'resourceUnit'
      | 'startDate'
      | 'taskId'
      | 'teamName'
      | 'userId'
    >,
  ): Promise<void> {
    await this.validateResourceTarget(
      input.resourceUnit,
      input.userId,
      input.teamName,
    );

    if (input.endDate < input.startDate) {
      throw new BadRequestException(
        'Allocation end date cannot be before start date',
      );
    }

    if (input.taskId) {
      await this.findProjectTask(projectId, input.taskId);
    }
  }

  private async validatePortfolioDependency(
    input: {
      dependencyType: TaskDependencyType;
      predecessorProjectId: string;
      predecessorTaskId?: string | null;
      successorProjectId: string;
      successorTaskId?: string | null;
    },
    existingDependencyId?: string,
  ): Promise<void> {
    if (input.predecessorProjectId === input.successorProjectId) {
      throw new BadRequestException(
        'Portfolio dependency projects must be different',
      );
    }

    await Promise.all([
      this.ensureProjectExists(input.predecessorProjectId),
      this.ensureProjectExists(input.successorProjectId),
    ]);

    if (input.predecessorTaskId) {
      await this.findProjectTask(
        input.predecessorProjectId,
        input.predecessorTaskId,
      );
    }

    if (input.successorTaskId) {
      await this.findProjectTask(
        input.successorProjectId,
        input.successorTaskId,
      );
    }

    const duplicateDependency =
      await this.portfolioDependenciesRepository.findOne({
        select: { id: true },
        where: {
          predecessorProjectId: input.predecessorProjectId,
          predecessorTaskId: input.predecessorTaskId ?? IsNull(),
          successorProjectId: input.successorProjectId,
          successorTaskId: input.successorTaskId ?? IsNull(),
        },
      });
    if (
      duplicateDependency &&
      duplicateDependency.id !== existingDependencyId
    ) {
      throw new BadRequestException(
        'An active portfolio dependency already exists for this relationship',
      );
    }
  }

  private async findProjectTask(
    projectId: string,
    taskId: string,
  ): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      select: { id: true, parentTaskId: true, projectId: true, taskKind: true },
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }

    return task;
  }

  private async ensureTaskCanContainChildren(
    projectId: string,
    taskId: string,
  ): Promise<Task> {
    const task = await this.findProjectTask(projectId, taskId);
    if (task.taskKind !== TaskKind.Summary) {
      throw new BadRequestException('Only summary tasks can contain child tasks');
    }

    return task;
  }

  private async ensureNoPlanningHierarchyCycle(
    projectId: string,
    taskId: string,
    parentTaskId: string,
  ) {
    let currentParentId: string | null = parentTaskId;

    while (currentParentId) {
      if (currentParentId === taskId) {
        throw new BadRequestException('Task hierarchy cannot contain cycles');
      }

      const currentParent = await this.findProjectTask(projectId, currentParentId);
      currentParentId = currentParent.parentTaskId ?? null;
    }
  }
  private async findPlanningTaskSchedule(
    projectId: string,
    scheduleId: string,
  ): Promise<PlanningTaskSchedule> {
    const byScheduleId = await this.planningTaskSchedulesRepository.findOne({
      relations: { task: { assignee: true } },
      where: { id: scheduleId, projectId },
    });

    if (byScheduleId) {
      return byScheduleId;
    }

    const latestSchedule = await this.scheduleSnapshotsRepository.findOne({
      order: { scheduleVersion: 'DESC' },
      select: { id: true },
      where: { projectId },
    });

    if (!latestSchedule) {
      throw new NotFoundException(
        `Planning schedule ${scheduleId} not found for project ${projectId}`,
      );
    }

    const byTaskId = await this.planningTaskSchedulesRepository.findOne({
      relations: { task: { assignee: true } },
      where: {
        projectId,
        snapshotId: latestSchedule.id,
        taskId: scheduleId,
      },
    });

    if (!byTaskId) {
      throw new NotFoundException(
        `Planning schedule ${scheduleId} not found for project ${projectId}`,
      );
    }

    return byTaskId;
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

  private async findResourceCapacity(
    projectId: string,
    capacityId: string,
  ): Promise<ResourceCapacity> {
    const capacity = await this.resourceCapacitiesRepository.findOne({
      where: { id: capacityId, projectId },
    });
    if (!capacity) {
      throw new NotFoundException(
        `Resource capacity ${capacityId} not found for project ${projectId}`,
      );
    }

    return capacity;
  }

  private async findResourceAllocation(
    projectId: string,
    allocationId: string,
  ): Promise<ResourceAllocation> {
    const allocation = await this.resourceAllocationsRepository.findOne({
      where: { id: allocationId, projectId },
    });
    if (!allocation) {
      throw new NotFoundException(
        `Resource allocation ${allocationId} not found for project ${projectId}`,
      );
    }

    return allocation;
  }

  private async findPortfolioDependency(
    dependencyId: string,
  ): Promise<PortfolioDependency> {
    const dependency = await this.portfolioDependenciesRepository.findOne({
      where: { id: dependencyId },
    });
    if (!dependency) {
      throw new NotFoundException(
        `Portfolio dependency ${dependencyId} not found`,
      );
    }

    return dependency;
  }
}
