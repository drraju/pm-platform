import { Injectable } from '@nestjs/common';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { PlanningBackwardPassResult } from './planning-backward-pass.service';
import { PlanningForwardPassResult } from './planning-forward-pass.service';
import {
  PlanningGraph,
  PlanningGraphNode,
} from './planning-graph-builder.service';

export type PlanningFloatTaskResult = {
  freeFloat: number;
  taskId: string;
  taskType: TaskKind.Standard | TaskKind.Milestone;
  totalFloat: number;
};

export type PlanningFloatResult = {
  tasks: Map<string, PlanningFloatTaskResult>;
};

@Injectable()
export class PlanningFloatService {
  calculate(
    graph: PlanningGraph,
    forwardPass: PlanningForwardPassResult,
    backwardPass: PlanningBackwardPassResult,
  ): PlanningFloatResult {
    const tasks = new Map<string, PlanningFloatTaskResult>();

    for (const taskId of graph.topologicalTaskIds) {
      const node = graph.nodes.get(taskId);
      if (!node || node.taskType === TaskKind.Summary) {
        continue;
      }

      const forwardTask = forwardPass.tasks.get(taskId);
      const backwardTask = backwardPass.tasks.get(taskId);
      if (!forwardTask || !backwardTask) {
        continue;
      }

      const totalFloat = backwardTask.lateStart - forwardTask.earlyStart;
      const freeFloat = this.calculateFreeFloat(node, forwardPass, totalFloat);

      tasks.set(taskId, {
        freeFloat,
        taskId,
        taskType: node.taskType,
        totalFloat,
      });
    }

    return { tasks };
  }

  private calculateFreeFloat(
    node: PlanningGraphNode,
    forwardPass: PlanningForwardPassResult,
    totalFloat: number,
  ) {
    const forwardTask = forwardPass.tasks.get(node.taskId);
    if (!forwardTask) {
      return totalFloat;
    }

    const dependencyFloat = node.outgoingDependencies
      .map((dependency) => {
        const successor = forwardPass.tasks.get(dependency.successorTaskId);
        if (!successor) {
          return null;
        }

        if (dependency.dependencyType === TaskDependencyType.FinishToStart) {
          return (
            successor.earlyStart - forwardTask.earlyFinish - dependency.lagDays
          );
        }
        if (dependency.dependencyType === TaskDependencyType.StartToStart) {
          return (
            successor.earlyStart - forwardTask.earlyStart - dependency.lagDays
          );
        }
        return (
          successor.earlyFinish - forwardTask.earlyFinish - dependency.lagDays
        );
      })
      .filter((value): value is number => typeof value === 'number');

    if (dependencyFloat.length === 0) {
      return totalFloat;
    }

    return Math.min(...dependencyFloat);
  }
}
