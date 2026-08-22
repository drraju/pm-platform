import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { SchedulingContextFactory } from '../../common/scheduling/scheduling-context.factory';
import { Project } from '../projects/entities/project.entity';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { PlanningScheduleEngineService } from './planning-schedule-engine.service';

type SnapshotActor = {
  userId?: string | null;
};

@Injectable()
export class PlanningSnapshotService {
  constructor(
    @InjectRepository(PlanningScheduleSnapshot)
    private readonly scheduleSnapshotsRepository: Repository<PlanningScheduleSnapshot>,
    private readonly schedulingContextFactory: SchedulingContextFactory,
    private readonly planningScheduleEngineService: PlanningScheduleEngineService,
  ) {}

  async regenerateOfficialSnapshot(
    projectId: string,
    actor?: SnapshotActor,
  ): Promise<PlanningScheduleSnapshot> {
    return this.scheduleSnapshotsRepository.manager.transaction((transaction) =>
      this.regenerateOfficialSnapshotWithManager(projectId, actor, transaction),
    );
  }

  async calculateOperationalForecast(
    projectId: string,
    manager: EntityManager = this.scheduleSnapshotsRepository.manager,
  ): Promise<PlanningScheduleSnapshot> {
    const projectsRepository = manager.getRepository(Project);
    const tasksRepository = manager.getRepository(Task);
    const dependenciesRepository = manager.getRepository(TaskDependency);
    const taskSchedulesRepository = manager.getRepository(PlanningTaskSchedule);
    const snapshotsRepository = manager.getRepository(PlanningScheduleSnapshot);
    const project = await projectsRepository.findOne({
      select: { id: true, startDate: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const tasks = await tasksRepository.find({
      order: { sequenceNumber: 'ASC', createdAt: 'ASC' },
      relations: { assignee: true },
      where: { projectId },
    });
    const taskIds = tasks.map((task) => task.id);
    const dependencies =
      taskIds.length === 0
        ? []
        : await dependenciesRepository.find({
            order: { createdAt: 'ASC' },
            where: {
              predecessorTaskId: In(taskIds),
              successorTaskId: In(taskIds),
            },
          });
    const context = this.createSchedulingContext(project, tasks, dependencies);
    const forecast =
      this.planningScheduleEngineService.calculateDatedForecast(context);
    const snapshotId = randomUUID();
    const snapshot = snapshotsRepository.create({
      calculatedAt: new Date(),
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: [...forecast.criticalPathTaskIds],
      id: snapshotId,
      metadata: {
        lifecycle: 'operational',
        phase: 'p0-b1-authoritative-forecast',
        reason: 'Transient working forecast generated from live inputs.',
      },
      projectCompletionPercent: this.calculateCompletion(tasks),
      projectFinishDate: forecast.projectFinishDate,
      projectId,
      projectStartDate: forecast.projectStartDate,
      scheduleAnchorDate: forecast.scheduleAnchorDate,
      scheduleVersion: 0,
    });
    snapshot.taskSchedules = this.createTaskSchedules(
      taskSchedulesRepository,
      projectId,
      snapshotId,
      tasks,
      forecast,
      undefined,
      true,
    );
    return snapshot;
  }

  private async regenerateOfficialSnapshotWithManager(
    projectId: string,
    actor: SnapshotActor | undefined,
    manager: EntityManager,
  ): Promise<PlanningScheduleSnapshot> {
    const snapshotsRepository = manager.getRepository(PlanningScheduleSnapshot);
    const taskSchedulesRepository = manager.getRepository(PlanningTaskSchedule);
    const projectsRepository = manager.getRepository(Project);
    const tasksRepository = manager.getRepository(Task);
    const dependenciesRepository = manager.getRepository(TaskDependency);

    const project = await projectsRepository.findOne({
      lock: { mode: 'pessimistic_write' },
      select: { id: true, startDate: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const latestVersion = await snapshotsRepository.findOne({
      order: { scheduleVersion: 'DESC' },
      select: { id: true, scheduleVersion: true },
      withDeleted: true,
      where: { projectId },
    });
    const tasks = await tasksRepository.find({
      order: { sequenceNumber: 'ASC', createdAt: 'ASC' },
      relations: { assignee: true },
      where: { projectId },
    });

    const taskIds = tasks.map((task) => task.id);
    const dependencies =
      taskIds.length === 0
        ? []
        : await dependenciesRepository.find({
            order: { createdAt: 'ASC' },
            where: {
              predecessorTaskId: In(taskIds),
              successorTaskId: In(taskIds),
            },
          });
    const context = this.createSchedulingContext(project, tasks, dependencies);
    const forecast =
      this.planningScheduleEngineService.calculateDatedForecast(context);
    const snapshot = snapshotsRepository.create({
      calculatedAt: new Date(),
      calculationStatus: PlanningCalculationStatus.Calculated,
      createdById: actor?.userId,
      criticalPathTaskIds: [...forecast.criticalPathTaskIds],
      metadata: {
        lifecycle: 'official',
        phase: 'p0-b1-authoritative-forecast',
        reason: 'Authoritative dated forecast generated from live inputs.',
      },
      projectCompletionPercent: this.calculateCompletion(tasks),
      projectFinishDate: forecast.projectFinishDate,
      projectId,
      projectStartDate: forecast.projectStartDate,
      scheduleAnchorDate: forecast.scheduleAnchorDate,
      scheduleVersion: (latestVersion?.scheduleVersion ?? 0) + 1,
      updatedById: actor?.userId,
    });
    const savedSnapshot = await snapshotsRepository.save(snapshot);
    const taskSchedules = this.createTaskSchedules(
      taskSchedulesRepository,
      projectId,
      savedSnapshot.id,
      tasks,
      forecast,
      actor,
      false,
    );
    const savedTaskSchedules =
      taskSchedules.length > 0
        ? await taskSchedulesRepository.save(taskSchedules)
        : [];
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    savedSnapshot.taskSchedules = savedTaskSchedules.map((taskSchedule) =>
      Object.assign(taskSchedule, {
        task: taskSchedule.taskId
          ? (taskById.get(taskSchedule.taskId) ?? null)
          : null,
      }),
    );

    return savedSnapshot;
  }

  private createSchedulingContext(
    project: Pick<Project, 'startDate'>,
    tasks: Task[],
    dependencies: TaskDependency[],
  ) {
    return this.schedulingContextFactory.create({
      dependencies: dependencies.map((dependency) => ({
        dependencyType: dependency.dependencyType,
        id: dependency.id,
        lagDays: dependency.lagDays,
        predecessorTaskId: dependency.predecessorTaskId,
        successorTaskId: dependency.successorTaskId,
      })),
      scheduleAnchorDate: project.startDate ?? null,
      tasks: tasks.map((task) => ({
        durationDays: task.durationDays ?? null,
        milestoneCategory: task.milestoneCategory ?? null,
        parentTaskId: task.parentTaskId ?? null,
        plannedEndDate: task.plannedEndDate ?? task.dueDate ?? null,
        plannedStartDate: task.plannedStartDate ?? task.startDate ?? null,
        taskId: task.id,
        taskKind: task.taskKind,
      })),
    });
  }

  private calculateCompletion(tasks: Task[]): number {
    return tasks.length === 0
      ? 0
      : tasks.reduce(
          (total, task) => total + Number(task.percentComplete ?? 0),
          0,
        ) / tasks.length;
  }

  private createTaskSchedules(
    repository: Repository<PlanningTaskSchedule>,
    projectId: string,
    snapshotId: string,
    tasks: Task[],
    forecast: ReturnType<
      PlanningScheduleEngineService['calculateDatedForecast']
    >,
    actor: SnapshotActor | undefined,
    operational: boolean,
  ): PlanningTaskSchedule[] {
    const forecastByTaskId = new Map(
      forecast.nodes.map((node) => [node.taskId, node]),
    );
    return repository.create(
      tasks.map((task) => {
        const node = forecastByTaskId.get(task.id);
        if (!node) {
          throw new Error(`Forecast result is missing task ${task.id}`);
        }
        return {
          createdById: actor?.userId,
          durationDays: node.durationDays,
          earlyFinish: node.earlyFinish,
          earlyStart: node.earlyStart,
          freeFloatDays: node.freeFloat,
          ...(operational ? { id: task.id } : {}),
          isCritical: node.isCritical,
          lateFinish: node.lateFinish,
          lateStart: node.lateStart,
          milestoneCategory: task.milestoneCategory ?? null,
          parentTaskId: task.parentTaskId ?? null,
          percentComplete: task.percentComplete ?? 0,
          plannedEndDate: task.plannedEndDate ?? task.dueDate ?? null,
          plannedStartDate: task.plannedStartDate ?? task.startDate ?? null,
          projectId,
          scheduledEndDate: node.scheduledEndDate,
          scheduledStartDate: node.scheduledStartDate,
          sequenceNumber: task.sequenceNumber,
          snapshotId,
          task,
          taskId: task.id,
          taskKind: task.taskKind,
          taskTitle: task.title,
          totalFloatDays: node.totalFloat,
          updatedById: actor?.userId,
        };
      }),
    );
  }
}
