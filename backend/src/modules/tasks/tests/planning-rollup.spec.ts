import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { decoratePlanningTasks } from '../planning-rollup';

describe('planning rollup', () => {
  it('rolls 100/100/0 descendant work progress up to 67%', () => {
    const tasks = decoratePlanningTasks([
      {
        id: 'phase-1',
        taskKind: TaskKind.Summary,
        title: 'Infrastructure',
      },
      {
        id: 'task-1',
        parentTaskId: 'phase-1',
        percentComplete: 100,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Provision VM',
      },
      {
        id: 'task-2',
        parentTaskId: 'phase-1',
        percentComplete: 100,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Install PostgreSQL',
      },
      {
        id: 'task-3',
        parentTaskId: 'phase-1',
        percentComplete: 0,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Configure Backups',
      },
    ]);

    expect(tasks.find((task) => task.id === 'phase-1')).toEqual(
      expect.objectContaining({
        childTaskCount: 3,
        phaseProgress: 67,
        percentComplete: 67,
      }),
    );
  });

  it('rolls 50/50 descendant work progress up to 50%', () => {
    const tasks = decoratePlanningTasks([
      {
        id: 'phase-1',
        taskKind: TaskKind.Summary,
        title: 'Build',
      },
      {
        id: 'task-1',
        parentTaskId: 'phase-1',
        percentComplete: 50,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'API',
      },
      {
        id: 'task-2',
        parentTaskId: 'phase-1',
        percentComplete: 50,
        status: TaskStatus.InProgress,
        taskKind: TaskKind.Standard,
        title: 'UI',
      },
    ]);

    expect(tasks.find((task) => task.id === 'phase-1')).toEqual(
      expect.objectContaining({
        childTaskCount: 2,
        phaseProgress: 50,
        percentComplete: 50,
      }),
    );
  });

  it('excludes milestones from progress rollup', () => {
    const tasks = decoratePlanningTasks([
      {
        id: 'phase-1',
        taskKind: TaskKind.Summary,
        title: 'Release',
      },
      {
        id: 'task-1',
        parentTaskId: 'phase-1',
        percentComplete: 50,
        status: TaskStatus.InProgress,
        taskKind: TaskKind.Standard,
        title: 'Deploy',
      },
      {
        id: 'milestone-1',
        parentTaskId: 'phase-1',
        percentComplete: 100,
        status: TaskStatus.Done,
        taskKind: TaskKind.Milestone,
        title: 'Go-live',
      },
    ]);

    expect(tasks.find((task) => task.id === 'phase-1')).toEqual(
      expect.objectContaining({
        childTaskCount: 2,
        phaseProgress: 50,
      }),
    );
  });

  it('rolls subtask progress into a standard parent while retaining task fields', () => {
    const tasks = decoratePlanningTasks([
      {
        assigneeId: 'owner-1',
        estimatedHours: 12,
        id: 'task-1',
        parentTaskId: null,
        percentComplete: 0,
        status: TaskStatus.Todo,
        taskKind: TaskKind.Standard,
        title: 'Build integration',
      },
      {
        estimatedHours: 2,
        id: 'subtask-1',
        parentTaskId: 'task-1',
        percentComplete: 50,
        status: TaskStatus.InProgress,
        taskKind: TaskKind.Standard,
        title: 'API mapping',
      },
      {
        estimatedHours: 6,
        id: 'subtask-2',
        parentTaskId: 'task-1',
        percentComplete: 100,
        status: TaskStatus.Done,
        taskKind: TaskKind.Standard,
        title: 'Payload tests',
      },
    ]);

    expect(tasks.find((task) => task.id === 'task-1')).toEqual(
      expect.objectContaining({
        assigneeId: 'owner-1',
        childTaskCount: 2,
        estimatedHours: 12,
        percentComplete: 88,
        phaseProgress: null,
        status: TaskStatus.InProgress,
        taskKind: TaskKind.Standard,
      }),
    );
  });
});
