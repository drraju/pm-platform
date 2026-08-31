import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { CanonicalCapabilityResolverService } from '../../common/authz/canonical-capability-resolver.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { Task } from './entities/task.entity';

const ineligibleAssigneeRoles = new Set<string>([
  UserRole.Customer,
  UserRole.Partner,
]);

@Injectable()
export class TaskAssignmentService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly canonicalCapabilityResolver: CanonicalCapabilityResolverService,
  ) {}

  async changeTaskAssignment(
    projectId: string,
    taskId: string,
    requestedAssigneeId: string | null,
    actor: AuthorizationActor,
    entityManager?: EntityManager,
  ): Promise<Task> {
    if (!actor?.userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const tasksRepository = entityManager
      ? entityManager.getRepository(Task)
      : this.tasksRepository;
    const projectMembersRepository = entityManager
      ? entityManager.getRepository(ProjectMember)
      : this.projectMembersRepository;
    const usersRepository = entityManager
      ? entityManager.getRepository(User)
      : this.usersRepository;

    const task = await tasksRepository.findOne({
      relations: { assignee: true, project: true },
      where: { id: taskId },
      withDeleted: true,
    });
    if (!task || task.projectId !== projectId || !task.project) {
      throw new NotFoundException(`Task ${taskId} not found in project`);
    }

    const decision =
      await this.canonicalCapabilityResolver.resolveTaskAssignment({
        actor,
        requestedAssigneeId,
        resource: {
          assigneeId: task.assigneeId ?? null,
          deletedAt: task.deletedAt ?? null,
          projectId: task.projectId,
          projectStatus: task.project.status,
          status: task.status,
          taskKind: task.taskKind,
          type: 'task',
        },
      });
    if (!decision.allowed) {
      throw new ForbiddenException({
        message: 'Task assignment is not permitted',
        reasonCode: decision.reasonCode,
      });
    }

    if (decision.operation === 'none') {
      return task;
    }

    if (requestedAssigneeId) {
      await this.validateTargetAssignee(
        projectId,
        requestedAssigneeId,
        projectMembersRepository,
        usersRepository,
      );
    }

    task.assigneeId = requestedAssigneeId;
    task.assignee = requestedAssigneeId ? undefined : null;
    task.updatedById = actor.userId;
    await tasksRepository.save(task);

    const updatedTask = await tasksRepository.findOne({
      relations: { assignee: true, project: true },
      where: { id: taskId, projectId },
    });
    if (!updatedTask) {
      throw new NotFoundException(`Task ${taskId} not found after assignment`);
    }
    return updatedTask;
  }

  private async validateTargetAssignee(
    projectId: string,
    assigneeId: string,
    projectMembersRepository = this.projectMembersRepository,
    usersRepository = this.usersRepository,
  ): Promise<void> {
    const user = await usersRepository.findOne({
      relations: { role: true },
      where: { id: assigneeId },
    });
    if (!user) {
      throw new NotFoundException(`Assignee ${assigneeId} not found`);
    }
    if (user.status !== 'active') {
      throw new ConflictException('Assignee must be active');
    }
    if (!user.role || ineligibleAssigneeRoles.has(user.role.name)) {
      throw new ConflictException(
        'Assignee is not eligible for task assignment',
      );
    }

    const membership = await projectMembersRepository.findOne({
      select: { id: true },
      where: { projectId, userId: assigneeId },
    });
    if (!membership) {
      throw new ConflictException('Assignee must be an active project member');
    }
  }
}
