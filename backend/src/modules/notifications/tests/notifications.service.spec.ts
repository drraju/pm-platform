import { TaskStatus } from '../../../common/enums/task-status.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { NotificationsService } from '../notifications.service';

describe('NotificationsService', () => {
  const saved: Array<Record<string, unknown>> = [];
  let alerted = false;
  const notificationsRepository = {
    count: jest.fn(),
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => {
      saved.push(value);
      return value;
    }),
    update: jest.fn(),
  };
  const tasksRepository = {
    count: jest.fn(async () => 0),
    findOne: jest.fn(),
    query: jest.fn(async (sql: string) => {
      if (sql.includes('SET overdue_alerted_on = $2')) {
        if (alerted) return [];
        alerted = true;
        return [{ id: 'task-1' }];
      }
      if (sql.includes('SET overdue_alerted_on = NULL')) {
        alerted = false;
        return [];
      }
      if (sql.includes('SELECT task.id')) {
        return alerted ? [] : [{ id: 'task-1' }];
      }
      return [];
    }),
  };
  const slackService = { deliver: jest.fn(async () => undefined) };
  const service = new NotificationsService(
    notificationsRepository as never,
    tasksRepository as never,
    slackService as never,
  );

  beforeEach(() => {
    saved.length = 0;
    alerted = false;
    jest.clearAllMocks();
    tasksRepository.count.mockResolvedValue(0);
  });

  function task(overrides: Record<string, unknown> = {}) {
    return {
      assignee: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
      assigneeId: 'ada',
      dueDate: '2026-12-01',
      id: 'task-1',
      overdueAlertedOn: alerted ? '2026-10-01' : null,
      project: { name: 'CapGemini' },
      projectId: 'project-1',
      status: TaskStatus.Todo,
      taskKind: TaskKind.Standard,
      title: 'Test2',
      ...overrides,
    };
  }

  it('notifies the new owner once when work is assigned', async () => {
    tasksRepository.findOne.mockResolvedValue(task());

    await service.afterSave({ assigneeId: 'previous', status: TaskStatus.Todo }, 'task-1', '2026-10-29');

    expect(saved).toEqual([
      expect.objectContaining({ reason: 'assigned', userId: 'ada', taskId: 'task-1' }),
    ]);
    expect(saved.some((row) => row.userId === 'previous')).toBe(false);
    expect(slackService.deliver).toHaveBeenCalledTimes(1);
  });

  it('records blocked for the owner without a second copy', async () => {
    tasksRepository.findOne.mockResolvedValue(
      task({ dueDate: null, status: TaskStatus.Blocked }),
    );

    await service.afterSave({ assigneeId: 'ada', status: TaskStatus.InProgress }, 'task-1', '2026-10-29');

    expect(saved).toEqual([
      expect.objectContaining({ reason: 'blocked', userId: 'ada' }),
    ]);
    expect(slackService.deliver).toHaveBeenCalledTimes(1);
  });

  it('records one overdue alert per episode, including a second sweep', async () => {
    tasksRepository.findOne.mockImplementation(async () =>
      task({ dueDate: '2026-10-01', status: TaskStatus.Todo }),
    );

    await service.sweepOverdue('2026-10-29');
    await service.sweepOverdue('2026-10-29');

    expect(saved.filter((row) => row.reason === 'overdue')).toHaveLength(1);
    expect(slackService.deliver).toHaveBeenCalledTimes(1);
  });
});
