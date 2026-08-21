/* eslint-disable @typescript-eslint/unbound-method */
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { PlanningBackwardPassService } from '../planning-backward-pass.service';
import { PlanningCriticalPathService } from '../planning-critical-path.service';
import { PlanningFloatService } from '../planning-float.service';
import { PlanningForwardPassService } from '../planning-forward-pass.service';
import {
  PlanningGraphBuilderService,
  PlanningGraphValidationError,
} from '../planning-graph-builder.service';
import {
  PlanningScheduleEngineError,
  PlanningScheduleEngineService,
} from '../planning-schedule-engine.service';

describe('PlanningScheduleEngineService', () => {
  it('executes the scheduling pipeline in order without duplicate calculations', () => {
    const calls: string[] = [];
    const graph = {
      edges: [],
      nodes: new Map([
        [
          'task-1',
          {
            children: [],
            durationDays: 2,
            incomingDependencies: [],
            outgoingDependencies: [],
            parentTaskId: null,
            taskId: 'task-1',
            taskType: TaskKind.Standard,
          },
        ],
      ]),
      topologicalTaskIds: ['task-1'],
    };
    const forward = {
      tasks: new Map([
        [
          'task-1',
          {
            durationDays: 2,
            earlyFinish: 2,
            earlyStart: 0,
            taskId: 'task-1',
            taskType: TaskKind.Standard,
          },
        ],
      ]),
    };
    const backward = {
      projectFinish: 2,
      tasks: new Map([
        [
          'task-1',
          {
            durationDays: 2,
            lateFinish: 2,
            lateStart: 0,
            taskId: 'task-1',
            taskType: TaskKind.Standard,
          },
        ],
      ]),
    };
    const float = {
      tasks: new Map([
        [
          'task-1',
          {
            freeFloat: 0,
            taskId: 'task-1',
            taskType: TaskKind.Standard,
            totalFloat: 0,
          },
        ],
      ]),
    };
    const critical = {
      tasks: new Map([
        [
          'task-1',
          {
            isCritical: true,
            taskId: 'task-1',
            taskType: TaskKind.Standard,
          },
        ],
      ]),
    };
    const graphBuilder = {
      buildGraph: jest.fn(() => {
        calls.push('graph');
        return graph;
      }),
    } as unknown as PlanningGraphBuilderService;
    const forwardPass = {
      calculate: jest.fn(() => {
        calls.push('forward');
        return forward;
      }),
    } as unknown as PlanningForwardPassService;
    const backwardPass = {
      calculate: jest.fn(() => {
        calls.push('backward');
        return backward;
      }),
    } as unknown as PlanningBackwardPassService;
    const floatService = {
      calculate: jest.fn(() => {
        calls.push('float');
        return float;
      }),
    } as unknown as PlanningFloatService;
    const criticalPath = {
      identify: jest.fn(() => {
        calls.push('critical');
        return critical;
      }),
    } as unknown as PlanningCriticalPathService;

    const service = new PlanningScheduleEngineService(
      graphBuilder,
      forwardPass,
      backwardPass,
      floatService,
      criticalPath,
    );

    const analysis = service.analyze({ tasks: [task('task-1', 2)] });

    expect(calls).toEqual([
      'graph',
      'forward',
      'backward',
      'float',
      'critical',
    ]);
    expect(graphBuilder.buildGraph).toHaveBeenCalledTimes(1);
    expect(forwardPass.calculate).toHaveBeenCalledTimes(1);
    expect(backwardPass.calculate).toHaveBeenCalledTimes(1);
    expect(floatService.calculate).toHaveBeenCalledTimes(1);
    expect(criticalPath.identify).toHaveBeenCalledTimes(1);
    expect(analysis.nodes[0]).toEqual(
      expect.objectContaining({
        earlyFinish: 2,
        earlyStart: 0,
        freeFloat: 0,
        isCritical: true,
        lateFinish: 2,
        lateStart: 0,
        taskId: 'task-1',
        totalFloat: 0,
      }),
    );
    expect(analysis.scheduleAnchorDate).toBeNull();
    expect(analysis.nodes[0].scheduledStartDate).toBeNull();
  });

  it('stops the pipeline when graph validation fails', () => {
    const graphBuilder = {
      buildGraph: jest.fn(() => {
        throw new PlanningGraphValidationError([
          {
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Planning graph contains a circular dependency.',
          },
        ]);
      }),
    } as unknown as PlanningGraphBuilderService;
    const forwardPass = {
      calculate: jest.fn(),
    } as unknown as PlanningForwardPassService;
    const service = new PlanningScheduleEngineService(
      graphBuilder,
      forwardPass,
      { calculate: jest.fn() } as unknown as PlanningBackwardPassService,
      { calculate: jest.fn() } as unknown as PlanningFloatService,
      { identify: jest.fn() },
    );

    expect(() =>
      service.analyze({
        tasks: [task('task-1', 1), task('task-2', 1)],
      }),
    ).toThrow(PlanningScheduleEngineError);
    expect(forwardPass.calculate).not.toHaveBeenCalled();
  });

  it('returns a complete immutable ScheduleAnalysis object', () => {
    const graphBuilder = new PlanningGraphBuilderService();
    const forwardPass = new PlanningForwardPassService();
    const backwardPass = new PlanningBackwardPassService();
    const floatService = new PlanningFloatService();
    const criticalPath = new PlanningCriticalPathService();
    const service = new PlanningScheduleEngineService(
      graphBuilder,
      forwardPass,
      backwardPass,
      floatService,
      criticalPath,
    );

    const analysis = service.analyze({
      dependencies: [
        {
          dependencyType: 'FS',
          id: 'dep-1',
          predecessorTaskId: 'task-1',
          successorTaskId: 'task-2',
        },
      ],
      tasks: [
        task('summary-1', 0, TaskKind.Summary),
        task('task-1', 2, TaskKind.Standard, 'summary-1'),
        task('task-2', 3, TaskKind.Standard, 'summary-1'),
      ],
    });

    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.nodes)).toBe(true);
    expect(Object.isFrozen(analysis.nodes[0])).toBe(true);
    expect(analysis.projectSummary).toEqual({
      dependencyCount: 1,
      executableTaskCount: 2,
      milestoneCount: 0,
      projectFinish: 5,
      summaryTaskCount: 1,
      taskCount: 3,
    });
    expect(analysis.graph).toEqual({
      dependencyCount: 1,
      edgeCount: 1,
      nodeCount: 3,
    });
    expect(analysis.topologicalOrder).toEqual([
      'summary-1',
      'task-1',
      'task-2',
    ]);
    expect(analysis.nodes).toEqual([
      expect.objectContaining({
        earlyFinish: null,
        earlyStart: null,
        isCritical: false,
        taskId: 'summary-1',
        totalFloat: null,
      }),
      expect.objectContaining({
        earlyFinish: 2,
        earlyStart: 0,
        freeFloat: 0,
        isCritical: true,
        lateFinish: 2,
        lateStart: 0,
        taskId: 'task-1',
        totalFloat: 0,
      }),
      expect.objectContaining({
        earlyFinish: 5,
        earlyStart: 2,
        freeFloat: 0,
        isCritical: true,
        lateFinish: 5,
        lateStart: 2,
        taskId: 'task-2',
        totalFloat: 0,
      }),
    ]);
    expect(analysis.validationMessages).toEqual([]);
  });

  it('calculates the authoritative dated finish-to-start acceptance scenario', () => {
    const service = createEngine();
    const context = {
      dependencies: [
        {
          dependencyType: TaskDependencyType.FinishToStart,
          id: 'dep-a-b',
          lagDays: 0,
          predecessorTaskId: 'task-a',
          successorTaskId: 'task-b',
        },
      ],
      scheduleAnchorDate: '2026-09-01',
      tasks: [
        {
          durationDays: 5,
          plannedEndDate: '2026-09-06',
          plannedStartDate: '2026-09-01',
          taskId: 'task-a',
          taskKind: TaskKind.Standard,
        },
        {
          durationDays: 3,
          plannedEndDate: '2026-09-06',
          plannedStartDate: '2026-09-03',
          taskId: 'task-b',
          taskKind: TaskKind.Standard,
        },
      ],
    } as const;
    const original = JSON.stringify(context);

    const result = service.calculateDatedForecast(context);

    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scheduledEndDate: '2026-09-06',
          scheduledStartDate: '2026-09-01',
          taskId: 'task-a',
        }),
        expect.objectContaining({
          scheduledEndDate: '2026-09-09',
          scheduledStartDate: '2026-09-06',
          taskId: 'task-b',
        }),
      ]),
    );
    expect(result).toEqual(
      expect.objectContaining({
        criticalPathTaskIds: ['task-a', 'task-b'],
        projectFinishDate: '2026-09-09',
        projectStartDate: '2026-09-01',
        scheduleAnchorDate: '2026-09-01',
      }),
    );
    expect(JSON.stringify(context)).toBe(original);
    expect(context.tasks[1].plannedStartDate).toBe('2026-09-03');
    expect(context.tasks[1].plannedEndDate).toBe('2026-09-06');
  });

  it.each([
    { expectedEnd: '2026-09-11', expectedStart: '2026-09-08', lagDays: 2 },
    { expectedEnd: '2026-09-08', expectedStart: '2026-09-05', lagDays: -1 },
  ])(
    'calculates absolute dates with signed FS lag $lagDays',
    ({ expectedEnd, expectedStart, lagDays }) => {
      const result = createEngine().calculateDatedForecast({
        dependencies: [
          {
            dependencyType: TaskDependencyType.FinishToStart,
            lagDays,
            predecessorTaskId: 'task-a',
            successorTaskId: 'task-b',
          },
        ],
        scheduleAnchorDate: '2026-09-01',
        tasks: [
          task('task-a', 5),
          {
            ...task('task-b', 3),
            plannedStartDate: '2026-09-03',
          },
        ],
      });
      const taskB = result.nodes.find((node) => node.taskId === 'task-b');

      expect(taskB).toEqual(
        expect.objectContaining({
          scheduledEndDate: expectedEnd,
          scheduledStartDate: expectedStart,
        }),
      );
    },
  );

  it('uses the earliest executable planned start when no project anchor is supplied', () => {
    const result = createEngine().calculateDatedForecast({
      tasks: [
        { ...task('task-a', 2), plannedStartDate: '2026-09-04' },
        { ...task('task-b', 1), plannedStartDate: '2026-09-02' },
      ],
    });

    expect(result.scheduleAnchorDate).toBe('2026-09-02');
    expect(result.projectStartDate).toBe('2026-09-02');
    expect(
      result.nodes.find((node) => node.taskId === 'task-a')?.scheduledStartDate,
    ).toBe('2026-09-04');
  });

  it('fails a dated calculation without a deterministic schedule anchor', () => {
    const service = createEngine();

    try {
      service.calculateDatedForecast({ tasks: [task('task-a', 2)] });
      throw new Error('Expected dated forecast calculation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PlanningScheduleEngineError);
      expect((error as PlanningScheduleEngineError).issues).toEqual([
        expect.objectContaining({ code: 'MISSING_SCHEDULE_ANCHOR' }),
      ]);
    }
  });

  it('rejects start-to-finish dependencies with a structured engine error', () => {
    const service = createEngine();

    try {
      service.calculateDatedForecast({
        dependencies: [
          {
            dependencyType: TaskDependencyType.StartToFinish,
            id: 'unsupported-dependency',
            predecessorTaskId: 'task-a',
            successorTaskId: 'task-b',
          },
        ],
        scheduleAnchorDate: '2026-09-01',
        tasks: [task('task-a', 2), task('task-b', 1)],
      });
      throw new Error('Expected dated forecast calculation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(PlanningScheduleEngineError);
      expect((error as PlanningScheduleEngineError).issues).toEqual([
        expect.objectContaining({ code: 'UNSUPPORTED_DEPENDENCY_TYPE' }),
      ]);
    }
  });

  it('rolls up nested Summary forecast dates without scheduling summaries', () => {
    const result = createEngine().calculateDatedForecast({
      scheduleAnchorDate: '2026-09-01',
      tasks: [
        task('summary-project', 0, TaskKind.Summary),
        task('summary-phase', 0, TaskKind.Summary, 'summary-project'),
        {
          ...task('task-a', 3, TaskKind.Standard, 'summary-phase'),
          plannedStartDate: '2026-09-02',
        },
        {
          ...task('milestone', 99, TaskKind.Milestone, 'summary-project'),
          milestoneCategory: 'release',
          plannedStartDate: '2026-09-10',
        },
      ],
    });
    const project = result.nodes.find(
      (node) => node.taskId === 'summary-project',
    );
    const phase = result.nodes.find((node) => node.taskId === 'summary-phase');
    const milestone = result.nodes.find((node) => node.taskId === 'milestone');

    expect(phase).toEqual(
      expect.objectContaining({
        durationDays: 3,
        freeFloat: null,
        isCritical: false,
        scheduledEndDate: '2026-09-05',
        scheduledStartDate: '2026-09-02',
        totalFloat: null,
      }),
    );
    expect(project).toEqual(
      expect.objectContaining({
        durationDays: 8,
        scheduledEndDate: '2026-09-10',
        scheduledStartDate: '2026-09-02',
      }),
    );
    expect(milestone).toEqual(
      expect.objectContaining({
        durationDays: 0,
        milestoneCategory: 'release',
        scheduledEndDate: '2026-09-10',
        scheduledStartDate: '2026-09-10',
      }),
    );
  });

  it('returns the same immutable result for repeated identical calculations', () => {
    const service = createEngine();
    const context = {
      scheduleAnchorDate: '2026-09-01',
      tasks: [{ ...task('task-a', 2), plannedStartDate: '2026-09-03' }],
    } as const;

    const first = service.calculateDatedForecast(context);
    const second = service.calculateDatedForecast(context);

    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.nodes)).toBe(true);
    expect(Object.isFrozen(first.criticalPathTaskIds)).toBe(true);
  });
});

function createEngine() {
  return new PlanningScheduleEngineService(
    new PlanningGraphBuilderService(),
    new PlanningForwardPassService(),
    new PlanningBackwardPassService(),
    new PlanningFloatService(),
    new PlanningCriticalPathService(),
  );
}

function task(
  taskId: string,
  durationDays: number,
  taskKind: TaskKind = TaskKind.Standard,
  parentTaskId: string | null = null,
) {
  return { durationDays, parentTaskId, taskId, taskKind };
}
