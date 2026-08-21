import { Injectable } from '@nestjs/common';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { PlanningForwardPassResult } from './planning-forward-pass.service';
import {
  PlanningGraph,
  PlanningGraphNode,
} from './planning-graph-builder.service';

export type PlanningBackwardPassTaskResult = {
  durationDays: number;
  lateFinish: number;
  lateStart: number;
  taskId: string;
  taskType: TaskKind.Standard | TaskKind.Milestone;
};

export type PlanningBackwardPassResult = {
  projectFinish: number;
  tasks: Map<string, PlanningBackwardPassTaskResult>;
};

@Injectable()
export class PlanningBackwardPassService {
  calculate(
    graph: PlanningGraph,
    forwardPass: PlanningForwardPassResult,
  ): PlanningBackwardPassResult {
    const projectFinish = this.getProjectFinish(forwardPass);
    const tasks = new Map<string, PlanningBackwardPassTaskResult>();

    for (const taskId of [...graph.topologicalTaskIds].reverse()) {
      const node = graph.nodes.get(taskId);
      if (!node || node.taskType === TaskKind.Summary) {
        continue;
      }

      const durationDays =
        node.taskType === TaskKind.Milestone ? 0 : node.durationDays;
      const { lateFinish, lateStart } = this.calculateLateWindow(
        node,
        durationDays,
        projectFinish,
        tasks,
      );

      tasks.set(taskId, {
        durationDays,
        lateFinish,
        lateStart,
        taskId,
        taskType: node.taskType,
      });
    }

    return { projectFinish, tasks };
  }

  private calculateLateWindow(
    node: PlanningGraphNode,
    durationDays: number,
    projectFinish: number,
    tasks: Map<string, PlanningBackwardPassTaskResult>,
  ) {
    let lateStart = projectFinish - durationDays;

    for (const dependency of node.outgoingDependencies) {
      const successor = tasks.get(dependency.successorTaskId);
      if (!successor) {
        continue;
      }

      if (dependency.dependencyType === TaskDependencyType.FinishToStart) {
        lateStart = Math.min(
          lateStart,
          successor.lateStart - dependency.lagDays - durationDays,
        );
      }

      if (dependency.dependencyType === TaskDependencyType.FinishToFinish) {
        lateStart = Math.min(
          lateStart,
          successor.lateFinish - dependency.lagDays - durationDays,
        );
      }

      if (dependency.dependencyType === TaskDependencyType.StartToStart) {
        lateStart = Math.min(
          lateStart,
          successor.lateStart - dependency.lagDays,
        );
      }
    }

    return {
      lateFinish: lateStart + durationDays,
      lateStart,
    };
  }

  private getProjectFinish(forwardPass: PlanningForwardPassResult) {
    return Math.max(
      0,
      ...[...forwardPass.tasks.values()].map((task) => task.earlyFinish),
    );
  }
}
