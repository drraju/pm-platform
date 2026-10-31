import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { SlackService } from '../integrations/slack/slack.service';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import {
  isOverdueLeaf,
  isSummaryTask,
  localWorkDate,
  planWorkEvents,
  type WorkEventReason,
  type WorkEventSnapshot,
} from './work-events';

const hourMs = 60 * 60 * 1000;

export type NotificationView = {
  createdAt: Date;
  id: string;
  readAt: Date | null;
  reason: string | null;
  taskId: string | null;
  title: string;
};

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly slackService: SlackService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.timer = setInterval(() => {
      void this.sweepOverdue().catch((error: unknown) => {
        this.logger.warn(this.failure(error));
      });
    }, hourMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async list(userId: string): Promise<NotificationView[]> {
    const rows = await this.notificationsRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
      where: { userId },
    });
    return rows.map(present);
  }

  async unreadCount(userId: string) {
    const count = await this.notificationsRepository.count({
      where: { readAt: IsNull(), userId },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const row = await this.notificationsRepository.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (!row.readAt) {
      row.readAt = new Date();
      await this.notificationsRepository.save(row);
    }
    return present(row);
  }

  async markAllRead(userId: string) {
    await this.notificationsRepository.update(
      { readAt: IsNull(), userId },
      { readAt: new Date() },
    );
    return this.unreadCount(userId);
  }

  async afterSave(previous: WorkEventSnapshot, taskId: string, today = localWorkDate()) {
    const task = await this.loadTask(taskId);
    if (!task) {
      return;
    }
    const container = await this.isContainer(task);
    if (container || !isOverdueLeaf({ dueDate: task.dueDate, status: task.status, today })) {
      await this.clearOverdue(task.id);
    }
    const reasons = planWorkEvents({
      alreadyAlerted: Boolean(task.overdueAlertedOn),
      isContainer: container,
      nextAssigneeId: task.assigneeId ?? null,
      nextStatus: task.status,
      overdue: isOverdueLeaf({ dueDate: task.dueDate, status: task.status, today }),
      previous,
    });
    let tellWaiters: 'blocked' | 'overdue' | null = null;
    for (const reason of reasons) {
      if (reason === 'overdue') {
        const claimed = await this.claimOverdue(task.id, task.dueDate?.slice(0, 10) ?? today);
        if (!claimed) {
          continue;
        }
        try {
          await this.record(task, reason);
          if (tellWaiters !== 'blocked') tellWaiters = 'overdue';
        } catch (error) {
          await this.clearOverdue(task.id);
          throw error;
        }
        continue;
      }
      await this.record(task, reason);
      if (reason === 'blocked') tellWaiters = 'blocked';
    }
    if (tellWaiters) {
      await this.notifyWaiters(task, tellWaiters);
    }
  }

  async afterDependency(predecessorId: string, successorId: string, today = localWorkDate()) {
    const predecessor = await this.loadTask(predecessorId);
    const successor = await this.loadTask(successorId);
    if (!predecessor || !successor || (await this.isContainer(predecessor))) {
      return;
    }
    const kind = waitingKind(predecessor, today);
    if (!kind) {
      return;
    }
    await this.writeWaiting(predecessor, successor, kind);
  }

  async sweepOverdue(today = localWorkDate()) {
    const rows = (await this.tasksRepository.query(
      `SELECT task.id
       FROM tasks task
       WHERE task.deleted_at IS NULL
         AND task.assignee_id IS NOT NULL
         AND task.due_date IS NOT NULL
         AND task.due_date < $1
         AND task.status <> 'done'
         AND task.overdue_alerted_on IS NULL
         AND task.task_kind <> 'summary'
         AND NOT EXISTS (
           SELECT 1 FROM tasks child
           WHERE child.parent_task_id = task.id
             AND child.deleted_at IS NULL
         )`,
      [today],
    )) as Array<{ id: string }>;

    for (const row of rows) {
      const task = await this.loadTask(row.id);
      if (!task?.assigneeId) {
        continue;
      }
      await this.afterSave(
        { assigneeId: task.assigneeId, status: task.status },
        task.id,
        today,
      );
    }
  }

  private async record(task: Task, reason: WorkEventReason) {
    const ownerId = task.assigneeId;
    if (!ownerId) {
      return;
    }
    const saved = await this.notificationsRepository.save(
      this.notificationsRepository.create({
        body: eventBody(reason, task.project?.name),
        reason,
        taskId: task.id,
        title: task.title,
        type: reason,
        userId: ownerId,
      }),
    );
    await this.slackService.deliver(task.projectId, slackText(task, reason));
    return saved;
  }

  private async notifyWaiters(predecessor: Task, kind: 'blocked' | 'overdue') {
    const rows = (await this.tasksRepository.query(
      `SELECT successor.id
       FROM task_dependencies link
       JOIN tasks successor ON successor.id = link.successor_task_id
       WHERE link.predecessor_task_id = $1
         AND link.deleted_at IS NULL
         AND successor.deleted_at IS NULL
         AND successor.status <> 'done'
         AND successor.assignee_id IS NOT NULL
         AND ($2::uuid IS NULL OR successor.assignee_id <> $2::uuid)`,
      [predecessor.id, predecessor.assigneeId ?? null],
    )) as Array<{ id: string }>;

    for (const row of rows) {
      const successor = await this.loadTask(row.id);
      if (!successor) continue;
      await this.writeWaiting(predecessor, successor, kind);
    }
  }

  private async writeWaiting(predecessor: Task, successor: Task, kind: 'blocked' | 'overdue') {
    if (!successor.assigneeId || successor.assigneeId === predecessor.assigneeId) return;
    if (successor.status === TaskStatus.Done) return;
    const reason = kind === 'blocked' ? 'waiting_blocked' : 'waiting_overdue';
    await this.notificationsRepository.save(
      this.notificationsRepository.create({
        body: `Waiting on ${predecessor.title}`,
        reason,
        taskId: successor.id,
        title: `${successor.title} is waiting on ${predecessor.title}`,
        type: reason,
        userId: successor.assigneeId,
      }),
    );
    await this.slackService.deliver(
      successor.projectId,
      waitingSlackText(predecessor, successor, kind),
    );
  }

  private async loadTask(taskId: string) {
    return this.tasksRepository.findOne({
      relations: { assignee: true, project: true },
      where: { id: taskId },
    });
  }

  private async isContainer(task: Task) {
    if (isSummaryTask(task.taskKind)) {
      return true;
    }
    const children = await this.tasksRepository.count({
      where: { parentTaskId: task.id },
    });
    return children > 0;
  }

  private async claimOverdue(taskId: string, dueDate: string) {
    const rows = (await this.tasksRepository.query(
      `UPDATE tasks
       SET overdue_alerted_on = $2
       WHERE id = $1 AND overdue_alerted_on IS NULL
       RETURNING id`,
      [taskId, dueDate],
    )) as Array<{ id: string }>;
    return rows.length > 0;
  }

  private async clearOverdue(taskId: string) {
    await this.tasksRepository.query(
      `UPDATE tasks
       SET overdue_alerted_on = NULL
       WHERE id = $1 AND overdue_alerted_on IS NOT NULL`,
      [taskId],
    );
  }

  private failure(error: unknown) {
    return error instanceof Error ? error.message : 'Overdue alerts were not recorded';
  }
}

function present(row: Notification): NotificationView {
  return {
    createdAt: row.createdAt,
    id: row.id,
    readAt: row.readAt ?? null,
    reason: row.reason ?? null,
    taskId: row.taskId ?? null,
    title: row.title,
  };
}

function waitingKind(task: Task, today: string): 'blocked' | 'overdue' | null {
  if (task.status === TaskStatus.Blocked) return 'blocked';
  if (isOverdueLeaf({ dueDate: task.dueDate, status: task.status, today })) return 'overdue';
  return null;
}

function waitingSlackText(predecessor: Task, successor: Task, kind: 'blocked' | 'overdue') {
  const origin = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
  const headline = kind === 'blocked' ? 'Waiting · Blocked' : 'Waiting · Overdue';
  return [
    `${headline}: ${successor.title}`,
    successor.project?.name ?? predecessor.project?.name ?? 'Project',
    `Waiting on ${predecessor.title}`,
    `Status: ${statusLabel(successor.status)}`,
    `Owner: ${personName(successor.assignee)}`,
    `Due: ${formatDue(successor.dueDate)}`,
    `${origin}/today?work=${successor.id}`,
  ].join('\n');
}

function eventBody(reason: WorkEventReason, projectName?: string | null) {
  const project = projectName?.trim() || 'the project';
  if (reason === 'assigned') return `Assigned on ${project}`;
  if (reason === 'blocked') return `Blocked on ${project}`;
  return `Overdue on ${project}`;
}

function slackText(task: Task, reason: WorkEventReason) {
  const origin = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
  const status = statusLabel(task.status);
  const owner = personName(task.assignee);
  const due = formatDue(task.dueDate);
  const project = task.project?.name ?? 'Project';
  const headline =
    reason === 'assigned' ? 'Assigned' : reason === 'blocked' ? 'Blocked' : 'Overdue';
  return [
    `${headline}: ${task.title}`,
    project,
    `Status: ${status}`,
    `Owner: ${owner}`,
    `Due: ${due}`,
    `${origin}/today?work=${task.id}`,
  ].join('\n');
}

function statusLabel(status?: string | null) {
  if (status === TaskStatus.InProgress) return 'Doing';
  if (status === TaskStatus.Blocked) return 'Blocked';
  if (status === TaskStatus.Done) return 'Done';
  return 'Not started';
}

function personName(user?: User | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.email || 'Unassigned';
}

function formatDue(value?: string | null) {
  if (!value) return 'No finish';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
