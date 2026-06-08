import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { AuthorizationService } from '../../authorization/authorization.service';
import { Task } from '../entities/task.entity';
import { TasksService } from '../tasks.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const taskId = '32b10c65-8a4b-4e03-a58c-ffea2ec860e6';
const userId = 'f308d314-4cf3-4bc0-9607-e7ad88f264b8';
const projectId = '2bbca1cb-1be2-4a04-b857-f1f8c7a26800';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: MockRepository<Task>;

  beforeEach(async () => {
    tasksRepository = {
      create: jest.fn((input) => input),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(() => Promise.resolve()),
      save: jest.fn((input) => Promise.resolve({ id: taskId, ...input })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
        {
          provide: AuthorizationService,
          useValue: {},
        },
      ],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a task from the existing DTO shape', async () => {
    const result = await service.create({
      projectId,
      title: 'Prepare steering committee readout',
      status: TaskStatus.Todo,
    });

    expect(tasksRepository.create).toHaveBeenCalledWith({
      projectId,
      title: 'Prepare steering committee readout',
      status: TaskStatus.Todo,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: taskId,
        projectId,
        title: 'Prepare steering committee readout',
      }),
    );
  });

  it('lists all tasks with project and assignee relations', async () => {
    tasksRepository.find?.mockResolvedValue([{ id: taskId }]);

    await expect(service.findAll()).resolves.toEqual([{ id: taskId }]);
    expect(tasksRepository.find).toHaveBeenCalledWith({
      relations: { project: true, assignee: true },
    });
  });

  it('lists authenticated user tasks with filters and required sorting', async () => {
    tasksRepository.find?.mockResolvedValue([{ id: taskId, assigneeId: userId }]);

    await expect(
      service.findMyTasks(userId, {
        priority: 'high',
        projectId,
        status: TaskStatus.InProgress,
      }),
    ).resolves.toEqual([{ id: taskId, assigneeId: userId }]);

    expect(tasksRepository.find).toHaveBeenCalledWith({
      order: {
        dueDate: 'ASC',
        createdAt: 'DESC',
      },
      relations: { project: true, assignee: true },
      where: {
        assigneeId: userId,
        priority: 'high',
        projectId,
        status: TaskStatus.InProgress,
      },
    });
  });

  it('omits empty authenticated user task filters', async () => {
    tasksRepository.find?.mockResolvedValue([]);

    await service.findMyTasks(userId);

    expect(tasksRepository.find).toHaveBeenCalledWith({
      order: {
        dueDate: 'ASC',
        createdAt: 'DESC',
      },
      relations: { project: true, assignee: true },
      where: {
        assigneeId: userId,
      },
    });
  });

  it('summarizes authenticated user tasks', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));
    tasksRepository.find?.mockResolvedValue([
      {
        id: 'todo-overdue',
        assigneeId: userId,
        dueDate: '2026-06-01',
        status: TaskStatus.Todo,
      },
      {
        id: 'in-progress-overdue',
        assigneeId: userId,
        dueDate: '2026-06-05',
        status: TaskStatus.InProgress,
      },
      {
        id: 'blocked-future',
        assigneeId: userId,
        dueDate: '2026-06-10',
        status: TaskStatus.Blocked,
      },
      {
        id: 'done-overdue-but-complete',
        assigneeId: userId,
        dueDate: '2026-06-01',
        status: TaskStatus.Done,
      },
      {
        id: 'backlog-without-due-date',
        assigneeId: userId,
        status: TaskStatus.Backlog,
      },
    ]);

    await expect(service.getMyTasksSummary(userId)).resolves.toEqual({
      totalTasks: 5,
      todoTasks: 1,
      inProgressTasks: 1,
      blockedTasks: 1,
      completedTasks: 1,
      overdueTasks: 2,
    });
    expect(tasksRepository.find).toHaveBeenCalledWith({
      where: { assigneeId: userId },
    });
  });

  it('gets one task with project and assignee relations', async () => {
    tasksRepository.findOne?.mockResolvedValue({ id: taskId });

    await expect(service.findOne(taskId)).resolves.toEqual({ id: taskId });
    expect(tasksRepository.findOne).toHaveBeenCalledWith({
      where: { id: taskId },
      relations: { project: true, assignee: true },
    });
  });

  it('throws when a task is missing', async () => {
    tasksRepository.findOne?.mockResolvedValue(null);

    await expect(service.findOne(taskId)).rejects.toThrow(NotFoundException);
  });

  it('updates an existing task', async () => {
    const task = { id: taskId, title: 'Original', status: TaskStatus.Backlog };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.update(taskId, {
      status: TaskStatus.Done,
      title: 'Updated',
    });

    expect(tasksRepository.save).toHaveBeenCalledWith({
      id: taskId,
      title: 'Updated',
      status: TaskStatus.Done,
    });
  });

  it('removes an existing task', async () => {
    const task = { id: taskId, title: 'Task to remove' };
    tasksRepository.findOne?.mockResolvedValue(task);

    await service.remove(taskId);

    expect(tasksRepository.remove).toHaveBeenCalledWith(task);
  });
});
