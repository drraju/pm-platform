import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthorizationActor, AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { ProjectVisibilityService } from '../projects/project-visibility.service';
import { Project } from '../projects/entities/project.entity';
import { TasksService } from '../tasks/tasks.service';
import { customerNoteAccess } from './customer-access';
import { CreateCommitmentDto, UpdateCommitmentDto } from './dto/commitment.dto';
import { CommitmentStatus, CustomerCommitment } from './entities/customer-commitment.entity';
import { CustomersService } from './customers.service';

export type CommitmentView = {
  customerId: string;
  dueDate: string | null;
  id: string;
  projectId: string;
  projectName: string;
  status: CommitmentStatus;
  taskId: string | null;
  title: string;
};

@Injectable()
export class CommitmentsService {
  constructor(
    @InjectRepository(CustomerCommitment)
    private readonly commitmentsRepository: Repository<CustomerCommitment>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly customersService: CustomersService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly tasksService: TasksService,
  ) {}

  async listForCustomer(actor: AuthorizationActor, customerId: string): Promise<CommitmentView[]> {
    await this.requireSuccess(actor, customerId);
    return this.listWhere({ customerId });
  }

  async create(
    actor: AuthorizationActor,
    customerId: string,
    input: CreateCommitmentDto,
  ): Promise<CommitmentView> {
    await this.requireSuccess(actor, customerId);
    const project = await this.requireCustomerProject(customerId, input.projectId);
    const saved = await this.commitmentsRepository.save(
      this.commitmentsRepository.create({
        customerId,
        dueDate: this.blankToNull(input.dueDate),
        projectId: project.id,
        status: 'open',
        taskId: null,
        title: input.title.trim(),
      }),
    );
    saved.project = project;
    return this.toView(saved);
  }

  async update(
    actor: AuthorizationActor,
    customerId: string,
    commitmentId: string,
    input: UpdateCommitmentDto,
  ): Promise<CommitmentView> {
    await this.requireSuccess(actor, customerId);
    const commitment = await this.findForCustomer(customerId, commitmentId);
    if (commitment.status === 'dismissed') {
      throw new BadRequestException('This commitment was dismissed');
    }
    if (input.status === 'dismissed') {
      commitment.status = 'dismissed';
      const saved = await this.commitmentsRepository.save(commitment);
      return this.toView(saved);
    }
    if (commitment.status !== 'open') {
      throw new BadRequestException('An accepted commitment stays with its work item');
    }
    if (input.title !== undefined) {
      commitment.title = input.title.trim();
    }
    if (input.dueDate !== undefined) {
      commitment.dueDate = this.blankToNull(input.dueDate);
    }
    if (input.projectId !== undefined) {
      const project = await this.requireCustomerProject(customerId, input.projectId);
      commitment.projectId = project.id;
      commitment.project = project;
    }
    const saved = await this.commitmentsRepository.save(commitment);
    return this.toView(saved);
  }

  async listForProject(actor: AuthorizationActor, projectId: string): Promise<CommitmentView[]> {
    if (!(await this.projectVisibilityService.canViewProject(projectId, actor))) {
      throw new NotFoundException('Project not found');
    }
    const rows = await this.listWhere({ projectId });
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      return rows.filter((row) => row.status !== 'open');
    }
    return rows;
  }

  async accept(
    actor: AuthorizationActor,
    projectId: string,
    commitmentId: string,
  ): Promise<CommitmentView> {
    if (!(await this.projectVisibilityService.canViewProject(projectId, actor))) {
      throw new NotFoundException('Project not found');
    }
    const commitment = await this.commitmentsRepository.findOne({
      relations: { project: true },
      where: { id: commitmentId, projectId },
    });
    if (!commitment || commitment.status === 'dismissed') {
      throw new NotFoundException('Commitment not found');
    }
    if (commitment.status === 'accepted' && commitment.taskId) {
      return this.toView(commitment);
    }

    const task = await this.tasksService.create(
      {
        dueDate: commitment.dueDate ?? undefined,
        projectId,
        status: TaskStatus.Todo,
        title: commitment.title,
      },
      actor,
    );
    commitment.status = 'accepted';
    commitment.taskId = task.id;
    const saved = await this.commitmentsRepository.save(commitment);
    return this.toView(saved);
  }

  private async listWhere(where: { customerId?: string; projectId?: string }) {
    const rows = await this.commitmentsRepository.find({
      order: { createdAt: 'ASC', title: 'ASC' },
      relations: { project: true },
      where: { ...where, status: In(['open', 'accepted']) },
    });
    return rows.map((row) => this.toView(row));
  }

  private async requireSuccess(actor: AuthorizationActor, customerId: string) {
    const roleNames = await this.authorizationPolicyService.getActorRoleNames(actor);
    if (!customerNoteAccess(roleNames).success) {
      throw new ForbiddenException('Success notes are not available for this role');
    }
    await this.customersService.get(actor, customerId);
  }

  private async requireCustomerProject(customerId: string, projectId: string) {
    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project || project.customerId !== customerId) {
      throw new BadRequestException('Choose a project for this customer');
    }
    return project;
  }

  private async findForCustomer(customerId: string, commitmentId: string) {
    const commitment = await this.commitmentsRepository.findOne({
      relations: { project: true },
      where: { customerId, id: commitmentId },
    });
    if (!commitment) {
      throw new NotFoundException('Commitment not found');
    }
    return commitment;
  }

  private toView(commitment: CustomerCommitment): CommitmentView {
    return {
      customerId: commitment.customerId,
      dueDate: commitment.dueDate,
      id: commitment.id,
      projectId: commitment.projectId,
      projectName: commitment.project?.name ?? 'Project',
      status: commitment.status,
      taskId: commitment.taskId,
      title: commitment.title,
    };
  }

  private blankToNull(value: string | null | undefined) {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
