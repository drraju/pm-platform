import { Injectable } from '@nestjs/common';
import {
  PlanningBackwardPassResult,
  PlanningBackwardPassService,
} from './planning-backward-pass.service';
import {
  PlanningCriticalPathResult,
  PlanningCriticalPathService,
} from './planning-critical-path.service';
import {
  PlanningFloatResult,
  PlanningFloatService,
} from './planning-float.service';
import {
  PlanningForwardPassResult,
  PlanningForwardPassService,
} from './planning-forward-pass.service';
import {
  PlanningGraph,
  PlanningGraphBuilderService,
  PlanningGraphDependencyInput,
  PlanningGraphTaskInput,
  PlanningGraphValidationError,
  PlanningGraphValidationIssue,
} from './planning-graph-builder.service';

export type ScheduleAnalysisNode = Readonly<{
  children: readonly string[];
  earlyFinish: number | null;
  earlyStart: number | null;
  freeFloat: number | null;
  isCritical: boolean;
  lateFinish: number | null;
  lateStart: number | null;
  parentTaskId: string | null;
  taskId: string;
  taskType: string;
  totalFloat: number | null;
}>;

export type ScheduleAnalysis = Readonly<{
  graph: Readonly<{
    dependencyCount: number;
    edgeCount: number;
    nodeCount: number;
  }>;
  nodes: readonly ScheduleAnalysisNode[];
  projectSummary: Readonly<{
    dependencyCount: number;
    executableTaskCount: number;
    milestoneCount: number;
    projectFinish: number;
    summaryTaskCount: number;
    taskCount: number;
  }>;
  topologicalOrder: readonly string[];
  validationMessages: readonly string[];
}>;

export class PlanningScheduleEngineError extends Error {
  constructor(
    message: string,
    readonly issues: readonly PlanningGraphValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'PlanningScheduleEngineError';
  }
}

@Injectable()
export class PlanningScheduleEngineService {
  constructor(
    private readonly graphBuilder: PlanningGraphBuilderService,
    private readonly forwardPass: PlanningForwardPassService,
    private readonly backwardPass: PlanningBackwardPassService,
    private readonly floatService: PlanningFloatService,
    private readonly criticalPath: PlanningCriticalPathService,
  ) {}

  analyze(input: {
    dependencies?: PlanningGraphDependencyInput[];
    tasks: PlanningGraphTaskInput[];
  }): ScheduleAnalysis {
    try {
      const graph = this.graphBuilder.buildGraph(input);
      const forward = this.forwardPass.calculate(graph);
      const backward = this.backwardPass.calculate(graph, forward);
      const float = this.floatService.calculate(graph, forward, backward);
      const critical = this.criticalPath.identify(graph, float);

      return this.buildAnalysis({
        backward,
        critical,
        dependencyCount: input.dependencies?.length ?? 0,
        float,
        forward,
        graph,
      });
    } catch (error) {
      if (error instanceof PlanningGraphValidationError) {
        throw new PlanningScheduleEngineError(
          'Planning schedule graph validation failed',
          error.issues,
        );
      }

      throw error;
    }
  }

  private buildAnalysis(input: {
    backward: PlanningBackwardPassResult;
    critical: PlanningCriticalPathResult;
    dependencyCount: number;
    float: PlanningFloatResult;
    forward: PlanningForwardPassResult;
    graph: PlanningGraph;
  }): ScheduleAnalysis {
    const nodes = input.graph.topologicalTaskIds.map((taskId) => {
      const node = input.graph.nodes.get(taskId);
      const forwardTask = input.forward.tasks.get(taskId);
      const backwardTask = input.backward.tasks.get(taskId);
      const floatTask = input.float.tasks.get(taskId);
      const criticalTask = input.critical.tasks.get(taskId);

      return Object.freeze({
        children: Object.freeze([...(node?.children ?? [])]),
        earlyFinish: forwardTask?.earlyFinish ?? null,
        earlyStart: forwardTask?.earlyStart ?? null,
        freeFloat: floatTask?.freeFloat ?? null,
        isCritical: criticalTask?.isCritical ?? false,
        lateFinish: backwardTask?.lateFinish ?? null,
        lateStart: backwardTask?.lateStart ?? null,
        parentTaskId: node?.parentTaskId ?? null,
        taskId,
        taskType: node?.taskType ?? 'unknown',
        totalFloat: floatTask?.totalFloat ?? null,
      });
    });
    const executableTaskCount = input.forward.tasks.size;
    const summaryTaskCount = nodes.length - executableTaskCount;
    const milestoneCount = nodes.filter(
      (node) => node.taskType === 'milestone',
    ).length;

    return Object.freeze({
      graph: Object.freeze({
        dependencyCount: input.dependencyCount,
        edgeCount: input.graph.edges.length,
        nodeCount: input.graph.nodes.size,
      }),
      nodes: Object.freeze(nodes),
      projectSummary: Object.freeze({
        dependencyCount: input.dependencyCount,
        executableTaskCount,
        milestoneCount,
        projectFinish: input.backward.projectFinish,
        summaryTaskCount,
        taskCount: input.graph.nodes.size,
      }),
      topologicalOrder: Object.freeze([...input.graph.topologicalTaskIds]),
      validationMessages: Object.freeze([]),
    });
  }
}
