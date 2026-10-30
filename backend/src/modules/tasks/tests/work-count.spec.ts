import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { countWork, isOverdueWork } from '../work-count';

const today = '2026-10-29';

describe('work count', () => {
  const container = {
    dueDate: '2026-10-01',
    id: 'container',
    status: TaskStatus.InProgress,
    taskKind: TaskKind.Summary,
  };
  const parent = {
    dueDate: '2026-10-01',
    id: 'parent',
    status: TaskStatus.InProgress,
    taskKind: TaskKind.Standard,
  };
  const overdueLeaf = {
    dueDate: '2026-10-28',
    id: 'overdue',
    parentTaskId: 'parent',
    status: TaskStatus.InProgress,
    taskKind: TaskKind.Standard,
  };
  const doneLeaf = {
    dueDate: '2026-10-01',
    id: 'done',
    parentTaskId: 'parent',
    status: TaskStatus.Done,
    taskKind: TaskKind.Standard,
  };
  const futureLeaf = {
    dueDate: '2026-10-30',
    id: 'future',
    status: TaskStatus.Todo,
    taskKind: TaskKind.Standard,
  };
  const backlogLeaf = {
    dueDate: '2026-10-20',
    id: 'backlog',
    status: TaskStatus.Backlog,
    taskKind: TaskKind.Standard,
  };

  const tasks = [container, parent, overdueLeaf, doneLeaf, futureLeaf, backlogLeaf];

  it('counts operational leaves and ignores containers', () => {
    expect(countWork(tasks, today)).toEqual({
      line: '2 of 4 overdue',
      operational: 4,
      overdue: 2,
    });
    expect(isOverdueWork(parent, tasks, today)).toBe(false);
    expect(isOverdueWork(container, tasks, today)).toBe(false);
    expect(isOverdueWork(doneLeaf, tasks, today)).toBe(false);
  });

  it('clears the overdue mark when the leaf is done', () => {
    const finished = tasks.map((task) =>
      task.id === 'overdue' ? { ...task, status: TaskStatus.Done } : task,
    );
    expect(countWork(finished, today).overdue).toBe(1);
  });
});
