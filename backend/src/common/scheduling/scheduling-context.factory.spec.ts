import { TaskDependencyType } from '../enums/task-dependency-type.enum';
import { TaskKind } from '../enums/task-kind.enum';
import { SchedulingContextFactory } from './scheduling-context.factory';

describe('SchedulingContextFactory', () => {
  let factory: SchedulingContextFactory;

  beforeEach(() => {
    factory = new SchedulingContextFactory();
  });

  it('creates an immutable scheduling context from tasks and dependencies', () => {
    const tasks = [
      {
        durationDays: 2,
        parentTaskId: null,
        plannedStartDate: '2026-09-01',
        taskId: 'task-1',
        taskKind: TaskKind.Standard,
      },
    ];
    const dependencies = [
      {
        dependencyType: TaskDependencyType.FinishToStart,
        id: 'dependency-1',
        lagDays: 2,
        predecessorTaskId: 'task-1',
        successorTaskId: 'task-2',
      },
    ];

    const context = factory.create({
      dependencies,
      scheduleAnchorDate: '2026-09-01',
      tasks,
    });

    expect(context.tasks).toEqual(tasks);
    expect(context.dependencies).toEqual(dependencies);
    expect(context.scheduleAnchorDate).toBe('2026-09-01');
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.tasks)).toBe(true);
    expect(Object.isFrozen(context.dependencies)).toBe(true);
    expect(Object.isFrozen(context.tasks[0])).toBe(true);
    expect(Object.isFrozen(context.dependencies?.[0])).toBe(true);
    expect(context.tasks[0]).not.toBe(tasks[0]);
    expect(context.dependencies?.[0]).not.toBe(dependencies[0]);
  });

  it('defaults dependencies to an immutable empty collection', () => {
    const context = factory.create({
      tasks: [{ durationDays: 1, taskId: 'task-1' }],
    });

    expect(context.dependencies).toEqual([]);
    expect(context.scheduleAnchorDate).toBeNull();
    expect(Object.isFrozen(context.dependencies)).toBe(true);
  });
});
