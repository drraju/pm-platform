import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskStatus } from '../../common/enums/task-status.enum';
import {
  AuthenticatedPrincipal,
  AuthorizationService,
} from '../authorization/authorization.service';
import { PermissionKey } from '../authorization/permissions';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { MyTasksSummaryDto } from './dto/my-tasks-summary.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  create(createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksRepository.save(this.tasksRepository.create(createTaskDto));
  }

  findAll(): Promise<Task[]> {
    return this.tasksRepository.find({
      relations: { project: true, assignee: true },
    });
  }

  async findAllForUser(principal: AuthenticatedPrincipal): Promise<Task[]> {
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    const accessibleProjectIds =
      await this.authorizationService.getAccessibleProjectIds(user);
    if (accessibleProjectIds?.length === 0) {
      return [];
    }

    return this.tasksRepository.find({
      relations: { project: true, assignee: true },
      where:
        accessibleProjectIds === null
          ? {}
          : { projectId: In(accessibleProjectIds) },
    });
  }

  async createForUser(
    principal: AuthenticatedPrincipal,
    createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    await this.authorizationService.assertCanManageProjectTasks(
      user,
      createTaskDto.projectId,
    );
    return this.create(createTaskDto);
  }

  findMyTasks(userId: string, query: MyTasksQueryDto = {}): Promise<Task[]> {
    return this.tasksRepository.find({
      order: {
        dueDate: 'ASC',
        createdAt: 'DESC',
      },
      relations: { project: true, assignee: true },
      where: {
        assigneeId: userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
      },
    });
  }

  async getMyTasksSummary(userId: string): Promise<MyTasksSummaryDto> {
    const tasks = await this.tasksRepository.find({
      where: { assigneeId: userId },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalTasks: tasks.length,
      todoTasks: tasks.filter((task) => task.status === TaskStatus.Todo).length,
      inProgressTasks: tasks.filter(
        (task) => task.status === TaskStatus.InProgress,
      ).length,
      blockedTasks: tasks.filter((task) => task.status === TaskStatus.Blocked)
        .length,
      completedTasks: tasks.filter((task) => task.status === TaskStatus.Done)
        .length,
      overdueTasks: tasks.filter((task) => {
        if (!task.dueDate || task.status === TaskStatus.Done) {
          return false;
        }

        return this.toDateOnly(task.dueDate) < today;
      }).length,
    };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { project: true, assignee: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async findOneForUser(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<Task> {
    const task = await this.findOne(id);
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    await this.authorizationService.assertCanReadProject(user, task.projectId);
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    return this.tasksRepository.save(task);
  }

  async updateForUser(
    principal: AuthenticatedPrincipal,
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(id);
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );

    if (this.authorizationService.hasPermission(user, PermissionKey.ProjectTasksUpdateAny)) {
      await this.authorizationService.assertCanManageProjectTasks(
        user,
        task.projectId,
      );
    } else if (
      !this.authorizationService.hasPermission(
        user,
        PermissionKey.ProjectTasksUpdateOwn,
      ) ||
      task.assigneeId !== user.userId
    ) {
      throw new ForbiddenException('Task update access denied');
    }

    Object.assign(task, updateTaskDto);
    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);
  }

  async removeForUser(
    principal: AuthenticatedPrincipal,
    id: string,
  ): Promise<void> {
    const task = await this.findOne(id);
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    this.authorizationService.assertHasAnyPermission(user, [
      PermissionKey.ProjectTasksDelete,
    ]);
    await this.authorizationService.assertCanManageProjectTasks(
      user,
      task.projectId,
    );
    await this.tasksRepository.remove(task);
  }

  private toDateOnly(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
