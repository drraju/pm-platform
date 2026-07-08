import { Injectable } from '@nestjs/common';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import {
  PlanningGraph,
  PlanningGraphNode,
} from './planning-graph-builder.service';

export type PlanningForwardPassTaskResult = {
  durationDays: number;
  earlyFinish: number;
  earlyStart: number;
  taskId: string;
  taskType: TaskKind.Standard | TaskKind.Milestone;
};

export type PlanningForwardPassResult = {
  tasks: Map<string, PlanningForwardPassTaskResult>;
};

@Injectable()
export class PlanningForwardPassService {
  calculate(graph: PlanningGraph): PlanningForwardPassResult {
    const tasks = new Map<string, PlanningForwardPassTaskResult>();

    for (const taskId of graph.topologicalTaskIds) {
      const node = graph.nodes.get(taskId);
      if (!node || node.taskType === TaskKind.Summary) {
        continue;
      }

      const durationDays =
        node.taskType === TaskKind.Milestone ? 0 : node.durationDays;
      const earlyStart = this.calculateEarlyStart(node, durationDays, tasks);
      const earlyFinish =
        node.taskType === TaskKind.Milestone
          ? earlyStart
          : earlyStart + durationDays;

      tasks.set(taskId, {
        durationDays,
        earlyFinish,
        earlyStart,
        taskId,
        taskType: node.taskType,
      });
    }

    return { tasks };
  }

  private calculateEarlyStart(
    node: PlanningGraphNode,
    durationDays: number,
    tasks: Map<string, PlanningForwardPassTaskResult>,
  ) {
    let earlyStart = 0;

    for (const dependency of node.incomingDependencies) {
      const predecessor = tasks.get(dependency.predecessorTaskId);
      if (!predecessor) {
        continue;
      }

      if (dependency.dependencyType === TaskDependencyType.FinishToStart) {
        earlyStart = Math.max(earlyStart, predecessor.earlyFinish);
      }

      if (dependency.dependencyType === TaskDependencyType.StartToStart) {
        earlyStart = Math.max(earlyStart, predecessor.earlyStart);
      }

      if (dependency.dependencyType === TaskDependencyType.FinishToFinish) {
        earlyStart = Math.max(
          earlyStart,
          predecessor.earlyFinish - durationDays,
        );
      }
    }

    return earlyStart;
  }
}
