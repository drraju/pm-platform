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

    expect(calls).toEqual(['graph', 'forward', 'backward', 'float', 'critical']);
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
      { identify: jest.fn() } as unknown as PlanningCriticalPathService,
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
});

function task(
  taskId: string,
  durationDays: number,
  taskKind: TaskKind = TaskKind.Standard,
  parentTaskId: string | null = null,
) {
  return { durationDays, parentTaskId, taskId, taskKind };
}
