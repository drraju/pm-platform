import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { ProjectMember } from '../projects/entities/project-member.entity';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { MyTasksSummaryDto } from './dto/my-tasks-summary.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

type AuthenticatedActor = AuthorizationActor;
const teamMemberEditableTaskFields = new Set([
  'assigneeId',
  'remarks',
  'percentComplete',
  'status',
]);

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    await this.ensureCanManageProject(createTaskDto.projectId, actor);
    await this.validateAssigneeMembership(
      createTaskDto.projectId,
      createTaskDto.assigneeId,
    );
    return this.tasksRepository.save(
      this.tasksRepository.create(createTaskDto),
    );
  }

  async findAll(actor?: ProjectVisibilityActor): Promise<Task[]> {
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    if (visibleProjectIds !== 'all' && visibleProjectIds.length === 0) {
      return [];
    }

    return this.tasksRepository.find({
      relations: { project: true, assignee: true },
      where:
        visibleProjectIds === 'all'
          ? undefined
          : { projectId: In(visibleProjectIds) },
    });
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

  async findOne(id: string, actor?: ProjectVisibilityActor): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { project: true, assignee: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    if (
      !(await this.projectVisibilityService.canViewProject(
        task.projectId,
        actor,
      ))
    ) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<Task> {
    const task = await this.findOne(id, actor);
    await this.ensureCanUpdateTask(task, updateTaskDto, actor);
    await this.validateAssigneeMembership(
      updateTaskDto.projectId ?? task.projectId,
      updateTaskDto.assigneeId,
    );
    Object.assign(task, updateTaskDto);
    return this.tasksRepository.save(task);
  }

  async remove(id: string, actor?: AuthenticatedActor): Promise<void> {
    const task = await this.findOne(id, actor);
    await this.ensureCanManageProject(task.projectId, actor);
    await this.tasksRepository.softRemove(task);
  }

  private toDateOnly(value: string | Date): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private async ensureCanManageProject(
    projectId: string,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    if (await this.authorizationPolicyService.canManageProject(projectId, actor)) {
      return;
    }

    throw new ForbiddenException('Project manager access is required');
  }

  private async ensureCanUpdateTask(
    task: Task,
    updateTaskDto: UpdateTaskDto,
    actor?: AuthenticatedActor,
  ): Promise<void> {
    if (!actor) {
      return;
    }

    if (await this.canManageTask(task.projectId, actor)) {
      return;
    }

    if (task.assigneeId !== actor.userId) {
      throw new ForbiddenException(
        'Only assigned team members can update this task',
      );
    }

    const disallowedFields = Object.keys(updateTaskDto).filter(
      (field) => !teamMemberEditableTaskFields.has(field),
    );
    if (disallowedFields.length > 0) {
      throw new ForbiddenException(
        'Team members can only update status, remarks, percent complete, or assignee',
      );
    }
  }

  private async canManageTask(
    projectId: string,
    actor: AuthenticatedActor,
  ): Promise<boolean> {
    return this.authorizationPolicyService.canManageTask(projectId, actor);
  }

  private async validateAssigneeMembership(
    projectId: string,
    assigneeId?: string | null,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }

    const membership = await this.projectMembersRepository.findOne({
      select: { id: true },
      where: { projectId, userId: assigneeId },
    });
    if (!membership) {
      throw new ConflictException('Assignee must be a project member');
    }
  }

}
