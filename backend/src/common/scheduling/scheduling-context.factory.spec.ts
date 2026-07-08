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
        taskId: 'task-1',
        taskKind: TaskKind.Standard,
      },
    ];
    const dependencies = [
      {
        dependencyType: TaskDependencyType.FinishToStart,
        id: 'dependency-1',
        predecessorTaskId: 'task-1',
        successorTaskId: 'task-2',
      },
    ];

    const context = factory.create({ dependencies, tasks });

    expect(context.tasks).toEqual(tasks);
    expect(context.dependencies).toEqual(dependencies);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.tasks)).toBe(true);
    expect(Object.isFrozen(context.dependencies)).toBe(true);
  });

  it('defaults dependencies to an immutable empty collection', () => {
    const context = factory.create({
      tasks: [{ durationDays: 1, taskId: 'task-1' }],
    });

    expect(context.dependencies).toEqual([]);
    expect(Object.isFrozen(context.dependencies)).toBe(true);
  });
});
