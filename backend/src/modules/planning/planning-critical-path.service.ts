import { Injectable } from '@nestjs/common';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { PlanningFloatResult } from './planning-float.service';
import { PlanningGraph } from './planning-graph-builder.service';

export type PlanningCriticalPathTaskResult = {
  isCritical: boolean;
  taskId: string;
  taskType: TaskKind.Standard | TaskKind.Milestone;
};

export type PlanningCriticalPathResult = {
  tasks: Map<string, PlanningCriticalPathTaskResult>;
};

@Injectable()
export class PlanningCriticalPathService {
  identify(
    graph: PlanningGraph,
    floatResult: PlanningFloatResult,
  ): PlanningCriticalPathResult {
    const tasks = new Map<string, PlanningCriticalPathTaskResult>();

    for (const taskId of graph.topologicalTaskIds) {
      const node = graph.nodes.get(taskId);
      if (!node || node.taskType === TaskKind.Summary) {
        continue;
      }

      const floatTask = floatResult.tasks.get(taskId);
      if (!floatTask) {
        continue;
      }

      tasks.set(taskId, {
        isCritical: floatTask.totalFloat === 0,
        taskId,
        taskType: node.taskType,
      });
    }

    return { tasks };
  }
}
