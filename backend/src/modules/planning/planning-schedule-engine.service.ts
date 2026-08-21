import { Injectable } from '@nestjs/common';
import { TaskKind } from '../../common/enums/task-kind.enum';
import { SchedulingContext } from '../../common/scheduling/scheduling-context';
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
  PlanningGraphValidationError,
  PlanningGraphValidationIssue,
} from './planning-graph-builder.service';

export type ScheduleAnalysisNode = Readonly<{
  children: readonly string[];
  durationDays: number | null;
  earlyFinish: number | null;
  earlyStart: number | null;
  freeFloat: number | null;
  isCritical: boolean;
  lateFinish: number | null;
  lateStart: number | null;
  milestoneCategory: string | null;
  parentTaskId: string | null;
  scheduledEndDate: string | null;
  scheduledStartDate: string | null;
  taskId: string;
  taskType: TaskKind | 'unknown';
  totalFloat: number | null;
}>;

export type ScheduleAnalysis = Readonly<{
  criticalPathTaskIds: readonly string[];
  graph: Readonly<{
    dependencyCount: number;
    edgeCount: number;
    nodeCount: number;
  }>;
  nodes: readonly ScheduleAnalysisNode[];
  projectFinishDate: string | null;
  projectStartDate: string | null;
  projectSummary: Readonly<{
    dependencyCount: number;
    executableTaskCount: number;
    milestoneCount: number;
    projectFinish: number;
    summaryTaskCount: number;
    taskCount: number;
  }>;
  scheduleAnchorDate: string | null;
  topologicalOrder: readonly string[];
  validationMessages: readonly string[];
}>;

type MutableScheduleAnalysisNode = {
  -readonly [Key in keyof ScheduleAnalysisNode]: ScheduleAnalysisNode[Key];
} & { children: string[] };

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

  analyze(context: SchedulingContext): ScheduleAnalysis {
    return this.runAnalysis(context, context.scheduleAnchorDate ?? null);
  }

  calculateDatedForecast(context: SchedulingContext): ScheduleAnalysis {
    const scheduleAnchorDate = this.resolveScheduleAnchorDate(context);
    return this.runAnalysis(context, scheduleAnchorDate);
  }

  private runAnalysis(
    context: SchedulingContext,
    scheduleAnchorDate: string | null,
  ): ScheduleAnalysis {
    try {
      const graph = this.graphBuilder.buildGraph({
        dependencies: [...(context.dependencies ?? [])],
        tasks: context.tasks.map((task) => ({
          ...task,
          minimumStartOffset: this.calculateMinimumStartOffset(
            scheduleAnchorDate,
            task.plannedStartDate,
          ),
        })),
      });
      const forward = this.forwardPass.calculate(graph);
      const backward = this.backwardPass.calculate(graph, forward);
      const float = this.floatService.calculate(graph, forward, backward);
      const critical = this.criticalPath.identify(graph, float);

      return this.buildAnalysis({
        backward,
        critical,
        dependencyCount: context.dependencies?.length ?? 0,
        float,
        forward,
        graph,
        scheduleAnchorDate,
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
    scheduleAnchorDate: string | null;
  }): ScheduleAnalysis {
    const mutableNodes = new Map<string, MutableScheduleAnalysisNode>();

    input.graph.topologicalTaskIds.forEach((taskId) => {
      const node = input.graph.nodes.get(taskId);
      const forwardTask = input.forward.tasks.get(taskId);
      const backwardTask = input.backward.tasks.get(taskId);
      const floatTask = input.float.tasks.get(taskId);
      const criticalTask = input.critical.tasks.get(taskId);
      const scheduledStartDate = this.shiftDate(
        input.scheduleAnchorDate,
        forwardTask?.earlyStart,
      );
      const scheduledEndDate = this.shiftDate(
        input.scheduleAnchorDate,
        forwardTask?.earlyFinish,
      );

      mutableNodes.set(taskId, {
        children: [...(node?.children ?? [])],
        durationDays: forwardTask?.durationDays ?? null,
        earlyFinish: forwardTask?.earlyFinish ?? null,
        earlyStart: forwardTask?.earlyStart ?? null,
        freeFloat: floatTask?.freeFloat ?? null,
        isCritical: criticalTask?.isCritical ?? false,
        lateFinish: backwardTask?.lateFinish ?? null,
        lateStart: backwardTask?.lateStart ?? null,
        milestoneCategory: node?.milestoneCategory ?? null,
        parentTaskId: node?.parentTaskId ?? null,
        scheduledEndDate,
        scheduledStartDate,
        taskId,
        taskType: node?.taskType ?? 'unknown',
        totalFloat: floatTask?.totalFloat ?? null,
      });
    });
    this.rollUpSummaryForecasts(input.graph, mutableNodes);
    const nodes = input.graph.topologicalTaskIds.map((taskId) => {
      const node = mutableNodes.get(taskId)!;
      return Object.freeze({
        ...node,
        children: Object.freeze([...node.children]),
      });
    });
    const executableTaskCount = input.forward.tasks.size;
    const summaryTaskCount = nodes.length - executableTaskCount;
    const milestoneCount = nodes.filter(
      (node) => node.taskType === TaskKind.Milestone,
    ).length;
    const executableNodes = nodes.filter(
      (node) => node.taskType !== TaskKind.Summary,
    );
    const projectStartDate = this.minimumDate(
      executableNodes.map((node) => node.scheduledStartDate),
    );
    const projectFinishDate = this.maximumDate(
      executableNodes.map((node) => node.scheduledEndDate),
    );
    const criticalPathTaskIds = executableNodes
      .filter((node) => node.isCritical)
      .map((node) => node.taskId);

    return Object.freeze({
      criticalPathTaskIds: Object.freeze(criticalPathTaskIds),
      graph: Object.freeze({
        dependencyCount: input.dependencyCount,
        edgeCount: input.graph.edges.length,
        nodeCount: input.graph.nodes.size,
      }),
      nodes: Object.freeze(nodes),
      projectFinishDate,
      projectStartDate,
      projectSummary: Object.freeze({
        dependencyCount: input.dependencyCount,
        executableTaskCount,
        milestoneCount,
        projectFinish: input.backward.projectFinish,
        summaryTaskCount,
        taskCount: input.graph.nodes.size,
      }),
      scheduleAnchorDate: input.scheduleAnchorDate,
      topologicalOrder: Object.freeze([...input.graph.topologicalTaskIds]),
      validationMessages: Object.freeze([]),
    });
  }

  private resolveScheduleAnchorDate(context: SchedulingContext): string {
    if (context.scheduleAnchorDate) {
      return context.scheduleAnchorDate;
    }

    const earliestPlannedStart = this.minimumDate(
      context.tasks
        .filter(
          (task) =>
            task.taskKind === TaskKind.Standard ||
            task.taskKind === TaskKind.Milestone,
        )
        .map((task) => task.plannedStartDate ?? null),
    );
    if (earliestPlannedStart) {
      return earliestPlannedStart;
    }

    throw new PlanningScheduleEngineError(
      'Planning schedule is missing a deterministic schedule anchor',
      [
        {
          code: 'MISSING_SCHEDULE_ANCHOR',
          message:
            'Provide a project start date or at least one executable task planned start date.',
        },
      ],
    );
  }

  private calculateMinimumStartOffset(
    scheduleAnchorDate?: string | null,
    plannedStartDate?: string | null,
  ): number {
    if (!scheduleAnchorDate || !plannedStartDate) {
      return 0;
    }
    return Math.max(0, this.daysBetween(scheduleAnchorDate, plannedStartDate));
  }

  private rollUpSummaryForecasts(
    graph: PlanningGraph,
    nodes: Map<string, MutableScheduleAnalysisNode>,
  ): void {
    const visited = new Set<string>();
    const rollUp = (taskId: string): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      const graphNode = graph.nodes.get(taskId);
      const resultNode = nodes.get(taskId);
      if (
        !graphNode ||
        !resultNode ||
        graphNode.taskType !== TaskKind.Summary
      ) {
        return;
      }

      graphNode.children.forEach(rollUp);
      const descendants = this.collectExecutableDescendants(
        taskId,
        graph,
        nodes,
      );
      const scheduledStartDate = this.minimumDate(
        descendants.map((node) => node.scheduledStartDate),
      );
      const scheduledEndDate = this.maximumDate(
        descendants.map((node) => node.scheduledEndDate),
      );
      resultNode.scheduledStartDate = scheduledStartDate;
      resultNode.scheduledEndDate = scheduledEndDate;
      resultNode.durationDays =
        scheduledStartDate && scheduledEndDate
          ? this.daysBetween(scheduledStartDate, scheduledEndDate)
          : null;
    };

    for (const [taskId, node] of graph.nodes) {
      if (node.taskType === TaskKind.Summary) rollUp(taskId);
    }
  }

  private collectExecutableDescendants(
    taskId: string,
    graph: PlanningGraph,
    nodes: Map<string, MutableScheduleAnalysisNode>,
  ): MutableScheduleAnalysisNode[] {
    const children = graph.nodes.get(taskId)?.children ?? [];
    return children.flatMap((childId) => {
      const graphNode = graph.nodes.get(childId);
      if (!graphNode) return [];
      if (graphNode.taskType === TaskKind.Summary) {
        return this.collectExecutableDescendants(childId, graph, nodes);
      }
      const node = nodes.get(childId);
      return node ? [node] : [];
    });
  }

  private shiftDate(
    scheduleAnchorDate: string | null,
    offset?: number | null,
  ): string | null {
    if (!scheduleAnchorDate || typeof offset !== 'number') return null;
    const date = new Date(`${scheduleAnchorDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  }

  private daysBetween(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    return Math.round((end - start) / 86_400_000);
  }

  private minimumDate(values: Array<string | null>): string | null {
    const dates = values.filter((value): value is string => Boolean(value));
    return dates.length === 0
      ? null
      : dates.reduce((left, right) => (left < right ? left : right));
  }

  private maximumDate(values: Array<string | null>): string | null {
    const dates = values.filter((value): value is string => Boolean(value));
    return dates.length === 0
      ? null
      : dates.reduce((left, right) => (left > right ? left : right));
  }
}
