import { Injectable } from '@nestjs/common';
import { TaskDependencyType } from '../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../common/enums/task-kind.enum';

const SUPPORTED_GRAPH_DEPENDENCY_TYPES = new Set<TaskDependencyType>([
  TaskDependencyType.FinishToStart,
  TaskDependencyType.StartToStart,
  TaskDependencyType.FinishToFinish,
]);

export type PlanningGraphTaskInput = {
  durationDays?: number | null;
  id?: string;
  parentTaskId?: string | null;
  taskId?: string;
  taskKind?: TaskKind | string | null;
};

export type PlanningGraphDependencyInput = {
  dependencyType: TaskDependencyType | string;
  id?: string;
  predecessorTaskId?: string | null;
  successorTaskId?: string | null;
};

export type PlanningGraphEdge = {
  dependencyId?: string;
  dependencyType: TaskDependencyType;
  predecessorTaskId: string;
  successorTaskId: string;
};

export type PlanningGraphNode = {
  children: string[];
  durationDays: number;
  incomingDependencies: PlanningGraphEdge[];
  outgoingDependencies: PlanningGraphEdge[];
  parentTaskId: string | null;
  taskId: string;
  taskType: TaskKind;
};

export type PlanningGraph = {
  edges: PlanningGraphEdge[];
  nodes: Map<string, PlanningGraphNode>;
  topologicalTaskIds: string[];
};

export type PlanningGraphValidationIssueCode =
  | 'CIRCULAR_DEPENDENCY'
  | 'DUPLICATE_TASK'
  | 'INVALID_DEPENDENCY_TARGET'
  | 'INVALID_TASK_TYPE'
  | 'MISSING_PARENT'
  | 'MISSING_PREDECESSOR'
  | 'MISSING_SUCCESSOR'
  | 'SUMMARY_DEPENDENCY_ENDPOINT';

export type PlanningGraphValidationIssue = {
  code: PlanningGraphValidationIssueCode;
  dependencyId?: string;
  message: string;
  taskId?: string;
};

export class PlanningGraphValidationError extends Error {
  constructor(readonly issues: PlanningGraphValidationIssue[]) {
    super('Planning graph validation failed');
    this.name = 'PlanningGraphValidationError';
  }
}

@Injectable()
export class PlanningGraphBuilderService {
  buildGraph(input: {
    dependencies?: PlanningGraphDependencyInput[];
    tasks: PlanningGraphTaskInput[];
  }): PlanningGraph {
    const issues: PlanningGraphValidationIssue[] = [];
    const nodes = this.buildNodes(input.tasks, issues);
    this.attachChildren(nodes, issues);
    const edges = this.buildEdges(input.dependencies ?? [], nodes, issues);

    if (issues.length > 0) {
      throw new PlanningGraphValidationError(issues);
    }

    const topologicalTaskIds = this.topologicalSort(nodes, edges, issues);
    if (issues.length > 0) {
      throw new PlanningGraphValidationError(issues);
    }

    return { edges, nodes, topologicalTaskIds };
  }

  private buildNodes(
    tasks: PlanningGraphTaskInput[],
    issues: PlanningGraphValidationIssue[],
  ) {
    const nodes = new Map<string, PlanningGraphNode>();

    for (const task of tasks) {
      const taskId = task.taskId ?? task.id;
      if (!taskId) {
        issues.push({
          code: 'INVALID_DEPENDENCY_TARGET',
          message: 'Planning task is missing a task id.',
        });
        continue;
      }

      if (nodes.has(taskId)) {
        issues.push({
          code: 'DUPLICATE_TASK',
          message: `Planning task ${taskId} appears more than once.`,
          taskId,
        });
        continue;
      }

      if (!this.isSupportedTaskKind(task.taskKind)) {
        issues.push({
          code: 'INVALID_TASK_TYPE',
          message: `Planning task ${taskId} has an unsupported task type.`,
          taskId,
        });
        continue;
      }

      nodes.set(taskId, {
        children: [],
        durationDays: this.getDurationDays(task.taskKind, task.durationDays),
        incomingDependencies: [],
        outgoingDependencies: [],
        parentTaskId: task.parentTaskId ?? null,
        taskId,
        taskType: task.taskKind,
      });
    }

    return nodes;
  }

  private attachChildren(
    nodes: Map<string, PlanningGraphNode>,
    issues: PlanningGraphValidationIssue[],
  ) {
    for (const node of nodes.values()) {
      if (!node.parentTaskId) {
        continue;
      }

      const parent = nodes.get(node.parentTaskId);
      if (!parent) {
        issues.push({
          code: 'MISSING_PARENT',
          message: `Planning task ${node.taskId} references missing parent ${node.parentTaskId}.`,
          taskId: node.taskId,
        });
        continue;
      }

      parent.children.push(node.taskId);
    }
  }

  private buildEdges(
    dependencies: PlanningGraphDependencyInput[],
    nodes: Map<string, PlanningGraphNode>,
    issues: PlanningGraphValidationIssue[],
  ) {
    const edges: PlanningGraphEdge[] = [];

    for (const dependency of dependencies) {
      if (dependency.dependencyType === TaskDependencyType.StartToFinish) {
        continue;
      }

      if (!this.isSupportedDependencyType(dependency.dependencyType)) {
        issues.push({
          code: 'INVALID_DEPENDENCY_TARGET',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} has an unsupported dependency type.`,
        });
        continue;
      }

      if (!dependency.predecessorTaskId) {
        issues.push({
          code: 'MISSING_PREDECESSOR',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} is missing a predecessor task.`,
        });
        continue;
      }

      if (!dependency.successorTaskId) {
        issues.push({
          code: 'MISSING_SUCCESSOR',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} is missing a successor task.`,
        });
        continue;
      }

      const predecessor = nodes.get(dependency.predecessorTaskId);
      if (!predecessor) {
        issues.push({
          code: 'MISSING_PREDECESSOR',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} references missing predecessor ${dependency.predecessorTaskId}.`,
          taskId: dependency.predecessorTaskId,
        });
      }

      const successor = nodes.get(dependency.successorTaskId);
      if (!successor) {
        issues.push({
          code: 'MISSING_SUCCESSOR',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} references missing successor ${dependency.successorTaskId}.`,
          taskId: dependency.successorTaskId,
        });
      }

      if (!predecessor || !successor) {
        continue;
      }

      if (predecessor.taskId === successor.taskId) {
        issues.push({
          code: 'INVALID_DEPENDENCY_TARGET',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} cannot target the same task as predecessor and successor.`,
          taskId: predecessor.taskId,
        });
        continue;
      }

      if (
        predecessor.taskType === TaskKind.Summary ||
        successor.taskType === TaskKind.Summary
      ) {
        issues.push({
          code: 'SUMMARY_DEPENDENCY_ENDPOINT',
          dependencyId: dependency.id,
          message: `Dependency ${dependency.id ?? '<unknown>'} cannot use a Summary as a dependency endpoint.`,
        });
        continue;
      }

      const edge: PlanningGraphEdge = {
        dependencyId: dependency.id,
        dependencyType: dependency.dependencyType,
        predecessorTaskId: predecessor.taskId,
        successorTaskId: successor.taskId,
      };
      edges.push(edge);
      predecessor.outgoingDependencies.push(edge);
      successor.incomingDependencies.push(edge);
    }

    return edges;
  }

  private topologicalSort(
    nodes: Map<string, PlanningGraphNode>,
    edges: PlanningGraphEdge[],
    issues: PlanningGraphValidationIssue[],
  ) {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const taskId of nodes.keys()) {
      inDegree.set(taskId, 0);
      adjacency.set(taskId, []);
    }

    for (const edge of edges) {
      adjacency.get(edge.predecessorTaskId)?.push(edge.successorTaskId);
      inDegree.set(
        edge.successorTaskId,
        (inDegree.get(edge.successorTaskId) ?? 0) + 1,
      );
    }

    const queue = [...nodes.keys()].filter((taskId) => inDegree.get(taskId) === 0);
    const ordered: string[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const taskId = queue[index];
      ordered.push(taskId);

      for (const successorTaskId of adjacency.get(taskId) ?? []) {
        const nextInDegree = (inDegree.get(successorTaskId) ?? 0) - 1;
        inDegree.set(successorTaskId, nextInDegree);
        if (nextInDegree === 0) {
          queue.push(successorTaskId);
        }
      }
    }

    if (ordered.length !== nodes.size) {
      issues.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Planning graph contains a circular dependency.',
      });
    }

    return ordered;
  }

  private isSupportedTaskKind(
    taskKind: PlanningGraphTaskInput['taskKind'],
  ): taskKind is TaskKind {
    return (
      taskKind === TaskKind.Standard ||
      taskKind === TaskKind.Summary ||
      taskKind === TaskKind.Milestone
    );
  }

  private isSupportedDependencyType(
    dependencyType: PlanningGraphDependencyInput['dependencyType'],
  ): dependencyType is TaskDependencyType {
    return SUPPORTED_GRAPH_DEPENDENCY_TYPES.has(
      dependencyType as TaskDependencyType,
    );
  }

  private getDurationDays(
    taskKind: TaskKind,
    durationDays: PlanningGraphTaskInput['durationDays'],
  ) {
    if (taskKind === TaskKind.Milestone || taskKind === TaskKind.Summary) {
      return 0;
    }

    return Math.max(0, Math.trunc(Number(durationDays ?? 1)));
  }
}
