import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { SchedulingFoundationService } from '../../common/scheduling/scheduling-foundation.service';
import { applyTaskCompletionTransition } from '../../common/scheduling/task-completion-transition';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { DuplicateWorkPackageDto } from './dto/duplicate-work-package.dto';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { PlanningSnapshotService } from './planning-snapshot.service';

type DuplicationActor = { userId?: string | null };

export type DuplicateWorkPackagePersistenceResult = {
  copiedTaskIds: string[];
  newSummaryTaskId: string;
};

@Injectable()
export class PlanningWorkPackageDuplicationService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly planningSnapshotService: PlanningSnapshotService,
    private readonly schedulingFoundationService: SchedulingFoundationService,
  ) {}

  duplicate(
    projectId: string,
    sourceSummaryTaskId: string,
    input: DuplicateWorkPackageDto,
    actor?: DuplicationActor,
  ): Promise<DuplicateWorkPackagePersistenceResult> {
    const newSummaryName = input.newSummaryName.trim();
    if (!newSummaryName) {
      throw new BadRequestException('New Summary Name is required');
    }
    if (input.copyComments === true || input.copyAttachments === true) {
      throw new BadRequestException(
        'Planning tasks do not currently store comments or attachments',
      );
    }

    return this.tasksRepository.manager.transaction(async (manager) => {
      const tasksRepository = manager.getRepository(Task);
      const sourceTasks = await tasksRepository.find({
        order: { createdAt: 'ASC', sequenceNumber: 'ASC' },
        where: { projectId },
      });
      const sourceSummary = sourceTasks.find(
        (task) => task.id === sourceSummaryTaskId,
      );
      if (!sourceSummary) {
        throw new NotFoundException(
          `Task ${sourceSummaryTaskId} not found for project ${projectId}`,
        );
      }
      if (sourceSummary.taskKind !== TaskKind.Summary) {
        throw new BadRequestException(
          'Only a Summary Task can be duplicated as a work package',
        );
      }

      const sourcePackage =
        input.copyChildTasks === false
          ? [sourceSummary]
          : collectWorkPackageTasks(sourceTasks, sourceSummaryTaskId);
      const sourceIds = new Set(sourcePackage.map((task) => task.id));
      const sourceRootSequence = sourceSummary.sequenceNumber ?? 0;
      const followingSiblings = sourceTasks.filter(
        (task) =>
          (task.parentTaskId ?? null) ===
            (sourceSummary.parentTaskId ?? null) &&
          (task.sequenceNumber ?? 0) > sourceRootSequence,
      );
      followingSiblings.forEach((sibling) => {
        sibling.sequenceNumber = (sibling.sequenceNumber ?? 0) + 1;
        sibling.updatedById = actor?.userId;
      });
      if (followingSiblings.length > 0) {
        await tasksRepository.save(followingSiblings);
      }

      const idMap = new Map<string, string>();
      const copiedTasks: Task[] = [];
      let flattenedSequence = 0;
      const lifecycleInput = applyTaskCompletionTransition({
        percentComplete: 0,
        status: TaskStatus.Todo,
      });
      for (const sourceTask of sourcePackage) {
        const isRoot = sourceTask.id === sourceSummaryTaskId;
        const taskKind =
          !isRoot &&
          sourceTask.taskKind === TaskKind.Milestone &&
          input.preserveMilestones === false
            ? TaskKind.Standard
            : sourceTask.taskKind;
        const parentTaskId = isRoot
          ? (sourceSummary.parentTaskId ?? null)
          : input.preserveWbsHierarchy === false
            ? idMap.get(sourceSummaryTaskId)
            : idMap.get(sourceTask.parentTaskId ?? '');
        if (!isRoot && !parentTaskId) {
          throw new BadRequestException(
            'The source work package contains an invalid hierarchy',
          );
        }
        const plannedStartDate =
          input.copyPlannedDates === true
            ? (sourceTask.plannedStartDate ?? sourceTask.startDate ?? null)
            : null;
        const plannedEndDate =
          input.copyPlannedDates === true
            ? (sourceTask.plannedEndDate ?? sourceTask.dueDate ?? null)
            : null;
        const copy = await tasksRepository.save(
          tasksRepository.create({
            actualEndDate: null,
            actualStartDate: null,
            assigneeId:
              input.copyResourceAssignments === true
                ? (sourceTask.assigneeId ?? null)
                : null,
            createdById: actor?.userId,
            description:
              input.preserveNotes !== false
                ? (sourceTask.description ?? null)
                : null,
            dueDate: plannedEndDate,
            durationDays:
              input.preserveTaskDurations !== false
                ? (sourceTask.durationDays ??
                  this.schedulingFoundationService.calculateDurationDays(
                    sourceTask.plannedStartDate ?? sourceTask.startDate,
                    sourceTask.plannedEndDate ?? sourceTask.dueDate,
                  ))
                : null,
            estimatedHours:
              input.preserveEstimatedEffort !== false
                ? (sourceTask.estimatedHours ?? null)
                : null,
            milestoneCategory:
              taskKind === TaskKind.Milestone
                ? (sourceTask.milestoneCategory ?? null)
                : null,
            parentTaskId,
            ...lifecycleInput,
            plannedEndDate,
            plannedStartDate,
            priority: sourceTask.priority,
            projectId,
            remarks:
              input.preserveNotes !== false
                ? (sourceTask.remarks ?? null)
                : null,
            remainingHours:
              input.preserveEstimatedEffort !== false
                ? (sourceTask.estimatedHours ?? null)
                : null,
            sequenceNumber: isRoot
              ? sourceRootSequence + 1
              : input.preserveWbsHierarchy === false
                ? ++flattenedSequence
                : sourceTask.sequenceNumber,
            startDate: plannedStartDate,
            taskKind,
            title: isRoot ? newSummaryName : sourceTask.title,
            updatedById: actor?.userId,
          }),
        );
        idMap.set(sourceTask.id, copy.id);
        copiedTasks.push(copy);
      }

      await this.copyInternalDependencies(
        manager,
        sourceIds,
        idMap,
        input,
        actor,
      );
      await this.copyResourceAllocations(
        manager,
        projectId,
        sourceIds,
        idMap,
        input,
        actor,
      );
      await this.planningSnapshotService.rebuildWorkspaceSnapshot(
        projectId,
        actor,
        manager,
      );

      return {
        copiedTaskIds: copiedTasks.map((task) => task.id),
        newSummaryTaskId: idMap.get(sourceSummaryTaskId)!,
      };
    });
  }

  removeDuplicatedWorkPackage(
    projectId: string,
    summaryTaskId: string,
    actor?: DuplicationActor,
  ): Promise<void> {
    return this.tasksRepository.manager.transaction(async (manager) => {
      const tasksRepository = manager.getRepository(Task);
      const projectTasks = await tasksRepository.find({
        order: { createdAt: 'ASC', sequenceNumber: 'ASC' },
        where: { projectId },
      });
      const summary = projectTasks.find((task) => task.id === summaryTaskId);
      if (!summary || summary.taskKind !== TaskKind.Summary) {
        throw new NotFoundException(
          `Summary Task ${summaryTaskId} not found for project ${projectId}`,
        );
      }
      const packageTasks = collectWorkPackageTasks(projectTasks, summaryTaskId);
      const packageIds = packageTasks.map((task) => task.id);

      const dependencyRepository = manager.getRepository(TaskDependency);
      const dependencies = await dependencyRepository.find({
        where: [
          { predecessorTaskId: In(packageIds) },
          { successorTaskId: In(packageIds) },
        ],
      });
      if (dependencies.length > 0) {
        await dependencyRepository.softRemove(dependencies);
      }
      const allocationRepository = manager.getRepository(ResourceAllocation);
      const allocations = await allocationRepository.find({
        where: { projectId, taskId: In(packageIds) },
      });
      if (allocations.length > 0) {
        await allocationRepository.softRemove(allocations);
      }
      for (const task of [...packageTasks].reverse()) {
        task.deletedById = actor?.userId;
        await tasksRepository.softRemove(task);
      }

      const packageIdSet = new Set(packageIds);
      const followingSiblings = projectTasks.filter(
        (task) =>
          !packageIdSet.has(task.id) &&
          (task.parentTaskId ?? null) === (summary.parentTaskId ?? null) &&
          (task.sequenceNumber ?? 0) > (summary.sequenceNumber ?? 0),
      );
      followingSiblings.forEach((sibling) => {
        sibling.sequenceNumber = Math.max(1, (sibling.sequenceNumber ?? 1) - 1);
        sibling.updatedById = actor?.userId;
      });
      if (followingSiblings.length > 0) {
        await tasksRepository.save(followingSiblings);
      }
      await this.planningSnapshotService.rebuildWorkspaceSnapshot(
        projectId,
        actor,
        manager,
      );
    });
  }

  private async copyInternalDependencies(
    manager: Repository<Task>['manager'],
    sourceIds: Set<string>,
    idMap: Map<string, string>,
    input: DuplicateWorkPackageDto,
    actor?: DuplicationActor,
  ) {
    if (input.preserveInternalPredecessors === false || sourceIds.size < 2) {
      return;
    }
    const repository = manager.getRepository(TaskDependency);
    const dependencies = await repository.find({
      where: [
        { predecessorTaskId: In([...sourceIds]) },
        { successorTaskId: In([...sourceIds]) },
      ],
    });
    const copies = dependencies
      .filter(
        (dependency) =>
          sourceIds.has(dependency.predecessorTaskId) &&
          sourceIds.has(dependency.successorTaskId),
      )
      .map((dependency) =>
        repository.create({
          createdById: actor?.userId,
          dependencyType: dependency.dependencyType,
          lagDays: dependency.lagDays,
          predecessorTaskId: idMap.get(dependency.predecessorTaskId),
          successorTaskId: idMap.get(dependency.successorTaskId),
          updatedById: actor?.userId,
        }),
      );
    if (copies.length > 0) {
      await repository.save(copies);
    }
  }

  private async copyResourceAllocations(
    manager: Repository<Task>['manager'],
    projectId: string,
    sourceIds: Set<string>,
    idMap: Map<string, string>,
    input: DuplicateWorkPackageDto,
    actor?: DuplicationActor,
  ) {
    if (input.copyResourceAssignments !== true || sourceIds.size === 0) {
      return;
    }
    const repository = manager.getRepository(ResourceAllocation);
    const allocations = await repository.find({
      where: { projectId, taskId: In([...sourceIds]) },
    });
    const copies = allocations.map((allocation) =>
      repository.create({
        allocationPercent: allocation.allocationPercent,
        createdById: actor?.userId,
        endDate: allocation.endDate,
        plannedMinutesPerDay: allocation.plannedMinutesPerDay,
        projectId,
        resourceUnit: allocation.resourceUnit,
        startDate: allocation.startDate,
        taskId: idMap.get(allocation.taskId ?? ''),
        teamName: allocation.teamName,
        updatedById: actor?.userId,
        userId: allocation.userId,
      }),
    );
    if (copies.length > 0) {
      await repository.save(copies);
    }
  }
}

export function collectWorkPackageTasks(
  projectTasks: Task[],
  summaryTaskId: string,
): Task[] {
  const byParent = new Map<string, Task[]>();
  for (const task of projectTasks) {
    if (task.parentTaskId) {
      byParent.set(task.parentTaskId, [
        ...(byParent.get(task.parentTaskId) ?? []),
        task,
      ]);
    }
  }
  for (const children of byParent.values()) {
    children.sort(
      (left, right) => (left.sequenceNumber ?? 0) - (right.sequenceNumber ?? 0),
    );
  }
  const root = projectTasks.find((task) => task.id === summaryTaskId);
  if (!root) {
    return [];
  }
  const result: Task[] = [];
  const visit = (task: Task) => {
    result.push(task);
    for (const child of byParent.get(task.id) ?? []) {
      visit(child);
    }
  };
  visit(root);
  return result;
}
