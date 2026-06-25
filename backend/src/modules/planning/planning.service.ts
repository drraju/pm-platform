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
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
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
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { CreateResourceCapacityDto } from './dto/create-resource-capacity.dto';
import { PlanningWorkspaceDto } from './dto/planning-workspace.dto';
import { UpdatePortfolioDependencyDto } from './dto/update-portfolio-dependency.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { UpdateResourceCapacityDto } from './dto/update-resource-capacity.dto';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PortfolioDependency } from './entities/portfolio-dependency.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacity } from './entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from './entities/resource-workload-snapshot.entity';

type AuthenticatedActor = AuthorizationActor;

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(PlanningScheduleSnapshot)
    private readonly scheduleSnapshotsRepository: Repository<PlanningScheduleSnapshot>,
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
  ) {}

  async getWorkspace(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<PlanningWorkspaceDto> {
    await this.ensureProjectVisible(projectId, actor);

    const [
      tasks,
      dependencies,
      latestSchedule,
      baselines,
      resourceAllocations,
    ] = await Promise.all([
      this.tasksRepository.find({
        order: { sequenceNumber: 'ASC', createdAt: 'ASC' },
        relations: { assignee: true },
        where: { projectId },
      }),
      this.projectsService.findProjectTaskDependencies(projectId, actor),
      this.getLatestSchedule(projectId, actor),
      this.projectsService.findProjectBaselines(projectId, actor),
      this.resourceAllocationsRepository.find({
        order: { startDate: 'ASC', createdAt: 'ASC' },
        relations: { task: true, user: true },
        where: { projectId },
      }),
    ]);

    return {
      baselines,
      dependencies,
      latestSchedule,
      resourceAllocations,
      tasks,
    };
  }

  async getLatestSchedule(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ): Promise<PlanningScheduleSnapshot | null> {
    await this.ensureProjectVisible(projectId, actor);
    return this.scheduleSnapshotsRepository.findOne({
      order: { scheduleVersion: 'DESC' },
      relations: { taskSchedules: true },
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
      select: { id: true, projectId: true },
      where: { id: taskId, projectId },
    });
    if (!task) {
      throw new NotFoundException(
        `Task ${taskId} not found for project ${projectId}`,
      );
    }

    return task;
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
