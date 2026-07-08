import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PlanningCalculationStatus } from '../../common/enums/planning-calculation-status.enum';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';

type SnapshotActor = {
  userId?: string | null;
};

@Injectable()
export class PlanningSnapshotService {
  constructor(
    @InjectRepository(PlanningScheduleSnapshot)
    private readonly scheduleSnapshotsRepository: Repository<PlanningScheduleSnapshot>,
    @InjectRepository(PlanningTaskSchedule)
    private readonly planningTaskSchedulesRepository: Repository<PlanningTaskSchedule>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly schedulingFoundationService: SchedulingFoundationService,
  ) {}

  async rebuildWorkspaceSnapshot(
    projectId: string,
    actor?: SnapshotActor,
    manager?: EntityManager,
  ): Promise<PlanningScheduleSnapshot> {
    if (manager) {
      return this.rebuildWorkspaceSnapshotWithManager(
        projectId,
        actor,
        manager,
      );
    }

    return this.scheduleSnapshotsRepository.manager.transaction((transaction) =>
      this.rebuildWorkspaceSnapshotWithManager(projectId, actor, transaction),
    );
  }

  private async rebuildWorkspaceSnapshotWithManager(
    projectId: string,
    actor: SnapshotActor | undefined,
    manager: EntityManager,
  ): Promise<PlanningScheduleSnapshot> {
    const snapshotsRepository = manager.getRepository(PlanningScheduleSnapshot);
    const taskSchedulesRepository = manager.getRepository(PlanningTaskSchedule);
    const projectsRepository = manager.getRepository(Project);
    const tasksRepository = manager.getRepository(Task);

    const project = await projectsRepository.findOne({
      lock: { mode: 'pessimistic_write' },
      select: { id: true },
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const existingSnapshot = await snapshotsRepository.findOne({
      lock: { mode: 'pessimistic_write' },
      order: { scheduleVersion: 'DESC' },
      where: { projectId },
    });
    const tasks = await tasksRepository.find({
      order: { sequenceNumber: 'ASC', createdAt: 'ASC' },
      relations: { assignee: true },
      where: { projectId },
    });

    const snapshot =
      existingSnapshot ??
      snapshotsRepository.create({
        createdById: actor?.userId,
        projectId,
        scheduleVersion: 1,
      });

    Object.assign(snapshot, {
      calculatedAt: new Date(),
      calculationStatus: PlanningCalculationStatus.Calculated,
      criticalPathTaskIds: [],
      metadata: {
        phase: 'v0.2.0-phase-1',
        reason: 'Planning workspace snapshot rebuilt from live tasks.',
      },
      projectCompletionPercent:
        tasks.length === 0
          ? 0
          : tasks.reduce(
              (total, task) => total + Number(task.percentComplete ?? 0),
              0,
            ) / tasks.length,
      projectFinishDate: this.findLatestTaskDate(tasks),
      projectStartDate: this.findEarliestTaskDate(tasks),
      updatedById: actor?.userId,
    });

    const savedSnapshot = await snapshotsRepository.save(snapshot);

    if (existingSnapshot) {
      await taskSchedulesRepository.delete({
        projectId,
        snapshotId: existingSnapshot.id,
      });
    }

    const taskSchedules = taskSchedulesRepository.create(
      tasks.map((task) => {
        const plannedStartDate = task.plannedStartDate ?? task.startDate;
        const plannedEndDate = task.plannedEndDate ?? task.dueDate;

        return {
          createdById: actor?.userId,
          durationDays: this.schedulingFoundationService.calculateDurationDays(
            plannedStartDate,
            plannedEndDate,
          ),
          isCritical: false,
          milestoneCategory: task.milestoneCategory ?? null,
          parentTaskId: task.parentTaskId,
          percentComplete: task.percentComplete ?? 0,
          plannedEndDate,
          plannedStartDate,
          projectId,
          scheduledEndDate: plannedEndDate,
          scheduledStartDate: plannedStartDate,
          sequenceNumber: task.sequenceNumber,
          snapshotId: savedSnapshot.id,
          task,
          taskId: task.id,
          taskKind: task.taskKind,
          totalFloatDays: null,
          updatedById: actor?.userId,
        };
      }),
    );
    const { changedSummaries } =
      this.schedulingFoundationService.rollupSummarySchedules(taskSchedules);
    if (changedSummaries.length > 0) {
      const summaryTasks = changedSummaries
        .map((schedule) => schedule.task)
        .filter((task): task is Task => Boolean(task));
      if (summaryTasks.length > 0) {
        summaryTasks.forEach((task) => {
          task.updatedById = actor?.userId;
        });
        await tasksRepository.save(summaryTasks);
      }
    }

    const savedTaskSchedules =
      taskSchedules.length > 0
        ? await taskSchedulesRepository.save(taskSchedules)
        : [];
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    savedSnapshot.taskSchedules = savedTaskSchedules.map((taskSchedule) =>
      Object.assign(taskSchedule, {
        task: taskById.get(taskSchedule.taskId) ?? null,
      }),
    );

    return savedSnapshot;
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
}
