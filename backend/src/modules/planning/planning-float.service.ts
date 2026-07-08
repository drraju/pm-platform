import { Injectable } from '@nestjs/common';
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

    const successorEarlyStarts = node.outgoingDependencies
      .map(
        (dependency) =>
          forwardPass.tasks.get(dependency.successorTaskId)?.earlyStart,
      )
      .filter(
        (earlyStart): earlyStart is number => typeof earlyStart === 'number',
      );

    if (successorEarlyStarts.length === 0) {
      return totalFloat;
    }

    return Math.min(...successorEarlyStarts) - forwardTask.earlyFinish;
  }
}
