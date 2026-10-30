import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { AuthorizationActor, AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
import { PermissionKey } from '../../common/authz/permissions';
import { Project } from '../projects/entities/project.entity';
import { ProjectVisibilityService } from '../projects/project-visibility.service';
import { User } from '../users/entities/user.entity';
import {
  CustomerNoteAccess,
  CustomerStatus,
  CustomerView,
  customerNoteAccess,
  presentCustomer,
} from './customer-access';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { Customer } from './entities/customer.entity';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    @Optional()
    @InjectRepository(Project)
    private readonly projectsRepository?: Repository<Project>,
    @Optional()
    @InjectRepository(Task)
    private readonly tasksRepository?: Repository<Task>,
    @Optional()
    private readonly projectVisibilityService?: ProjectVisibilityService,
  ) {}

  async list(
    actor: AuthorizationActor,
    status: CustomerStatus | 'all' = 'active',
  ): Promise<CustomerView[]> {
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      return [];
    }
    const access = await this.accessFor(actor);
    const where: FindOptionsWhere<Customer> = {};
    if (!access.seesAll) {
      where.ownerId = actor.userId;
    }
    if (status !== 'all') {
      where.status = status;
    }

    const owned = await this.customersRepository.find({
      order: { name: 'ASC' },
      relations: { owner: true },
      where,
    });
    const customers = await this.withLinkedCustomers(actor, access, owned, status);
    const counts = await this.projectCounts(customers.map((customer) => customer.id));

    return customers.map((customer) =>
      this.toView(customer, access, counts.get(customer.id) ?? 0),
    );
  }

  async listProjects(actor: AuthorizationActor, customerId: string) {
    await this.get(actor, customerId);
    if (!this.projectsRepository) {
      return [];
    }
    const projects = await this.projectsRepository.find({
      order: { name: 'ASC' },
      relations: { members: { user: true }, owner: true },
      where: { customerId },
    });
    const ids = projects.map((project) => project.id);
    const includeWork =
      typeof this.authorizationPolicyService.hasAnyPermission === 'function'
        ? await this.authorizationPolicyService.hasAnyPermission(actor, [
            PermissionKey.CustomerSuccessView,
            PermissionKey.WorkUpdate,
            PermissionKey.TaskUpdate,
          ])
        : false;
    const visible = this.projectVisibilityService
      ? await this.projectVisibilityService.getVisibleProjectIds(actor)
      : [];
    const work = includeWork ? await this.workForProjects(ids) : [];
    return projects.map((project) => ({
      id: project.id,
      leadName: personName(project.owner),
      name: project.name,
      openable: projectIsOpenable(visible, project.id),
      status: project.status,
      targetFinish: project.targetEndDate ?? null,
      ...(includeWork
        ? {
            work: work
              .filter((item) => item.projectId === project.id)
              .map((item) => ({
                dueDate: item.dueDate ?? null,
                id: item.id,
                parentTaskId: item.parentTaskId ?? null,
                status: item.status,
                taskKind: item.taskKind,
              })),
          }
        : {}),
    }));
  }

  async get(actor: AuthorizationActor, id: string): Promise<CustomerView> {
    if (await this.authorizationPolicyService.isExternalActor(actor)) {
      throw new NotFoundException('Customer not found');
    }
    const access = await this.accessFor(actor);
    const customer = await this.findVisible(actor, access, id);
    const counts = await this.projectCounts([customer.id]);
    return this.toView(customer, access, counts.get(customer.id) ?? 0);
  }

  async create(
    actor: AuthorizationActor,
    input: CreateCustomerDto,
  ): Promise<CustomerView> {
    const access = await this.accessFor(actor);
    this.assertNoteWrite(access, input);
    const owner = await this.requireOwner(input.ownerId ?? actor.userId);

    const customer = await this.customersRepository.save(
      this.customersRepository.create({
        commercialNote: this.blankToNull(input.commercialNote),
        domain: this.blankToNull(input.domain),
        name: input.name.trim(),
        ownerId: owner.id,
        renewalDate: this.blankToNull(input.renewalDate),
        lastTouch: this.blankToNull(input.lastTouch),
        status: input.status ?? 'active',
        successNote: this.blankToNull(input.successNote),
      }),
    );
    customer.owner = owner;
    return this.toView(customer, access, 0);
  }

  async update(
    actor: AuthorizationActor,
    id: string,
    input: UpdateCustomerDto,
  ): Promise<CustomerView> {
    const access = await this.accessFor(actor);
    this.assertNoteWrite(access, input);
    const customer = await this.findVisible(actor, access, id);

    if (input.name !== undefined) {
      customer.name = input.name.trim();
    }
    if (input.status !== undefined) {
      customer.status = input.status;
    }
    if (input.ownerId !== undefined) {
      const owner = await this.requireOwner(input.ownerId);
      customer.ownerId = owner.id;
      customer.owner = owner;
    }
    if (input.domain !== undefined) {
      customer.domain = this.blankToNull(input.domain);
    }
    if (input.renewalDate !== undefined) {
      customer.renewalDate = this.blankToNull(input.renewalDate);
    }
    if (input.lastTouch !== undefined) {
      customer.lastTouch = this.blankToNull(input.lastTouch);
    }
    if (input.commercialNote !== undefined) {
      customer.commercialNote = this.blankToNull(input.commercialNote);
    }
    if (input.successNote !== undefined) {
      customer.successNote = this.blankToNull(input.successNote);
    }

    const saved = await this.customersRepository.save(customer);
    saved.owner = customer.owner;
    const counts = await this.projectCounts([saved.id]);
    return this.toView(saved, access, counts.get(saved.id) ?? 0);
  }

  async access(actor: AuthorizationActor) {
    const access = await this.accessFor(actor);
    return {
      commercial: access.commercial,
      renewal: access.renewal,
      success: access.success,
    };
  }

  async listOwners(actor: AuthorizationActor) {
    await this.accessFor(actor);
    const users = await this.usersRepository.find({
      order: { firstName: 'ASC', lastName: 'ASC', email: 'ASC' },
      where: {
        identityType: UserIdentityType.Human,
        status: In(['active', 'first_login_pending']),
      },
    });

    return users.map((user) => ({
      email: user.email,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
    }));
  }

  private async accessFor(actor: AuthorizationActor) {
    const roleNames = await this.authorizationPolicyService.getActorRoleNames(actor);
    return customerNoteAccess(roleNames);
  }

  private async findVisible(
    actor: AuthorizationActor,
    access: CustomerNoteAccess,
    id: string,
  ) {
    const customer = await this.customersRepository.findOne({
      relations: { owner: true },
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (access.seesAll || customer.ownerId === actor.userId) {
      return customer;
    }
    if (await this.memberCanSeeCustomer(actor, customer.id)) {
      return customer;
    }
    throw new NotFoundException('Customer not found');
  }

  private assertNoteWrite(
    access: CustomerNoteAccess,
    input: {
      commercialNote?: string | null;
      lastTouch?: string | null;
      renewalDate?: string | null;
      successNote?: string | null;
    },
  ) {
    if (input.commercialNote !== undefined && !access.commercial) {
      throw new ForbiddenException('Commercial notes are not available for this role');
    }
    if (input.successNote !== undefined && !access.success) {
      throw new ForbiddenException('Success notes are not available for this role');
    }
    if (input.renewalDate !== undefined && !access.renewal) {
      throw new ForbiddenException('Renewal date is not available for this role');
    }
    if (input.lastTouch !== undefined && !access.success) {
      throw new ForbiddenException('Last touch is not available for this role');
    }
  }

  private async requireOwner(ownerId: string) {
    const owner = await this.usersRepository.findOne({ where: { id: ownerId } });
    if (
      !owner ||
      owner.identityType !== UserIdentityType.Human ||
      !['active', 'first_login_pending'].includes(owner.status)
    ) {
      throw new BadRequestException('Choose an active person as the owner');
    }
    return owner;
  }

  private async withLinkedCustomers(
    actor: AuthorizationActor,
    access: CustomerNoteAccess,
    owned: Customer[],
    status: CustomerStatus | 'all',
  ) {
    if (access.seesAll || !this.projectsRepository) {
      return owned;
    }
    const linked = await this.projectsRepository.find({
      relations: { customer: { owner: true }, members: true },
      where: {
        members: { userId: actor.userId },
      },
    });
    const seen = new Set(owned.map((customer) => customer.id));
    const extras = linked
      .map((project) => project.customer)
      .filter((customer): customer is Customer => {
        if (!customer || seen.has(customer.id)) {
          return false;
        }
        if (status !== 'all' && customer.status !== status) {
          return false;
        }
        seen.add(customer.id);
        return true;
      });
    return [...owned, ...extras].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async memberCanSeeCustomer(actor: AuthorizationActor, customerId: string) {
    if (!this.projectsRepository) {
      return false;
    }
    const project = await this.projectsRepository.findOne({
      where: { customerId, members: { userId: actor.userId } },
    });
    return Boolean(project);
  }

  private async projectCounts(customerIds: string[]) {
    const counts = new Map<string, number>();
    if (!this.projectsRepository || customerIds.length === 0) {
      return counts;
    }
    const rows = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.customerId', 'customerId')
      .addSelect('COUNT(*)', 'count')
      .where('project.customerId IN (:...customerIds)', { customerIds })
      .groupBy('project.customerId')
      .getRawMany<{ count: string; customerId: string }>();
    for (const row of rows) {
      counts.set(row.customerId, Number(row.count));
    }
    return counts;
  }

  private async workForProjects(projectIds: string[]) {
    if (!this.tasksRepository || projectIds.length === 0) {
      return [];
    }
    return this.tasksRepository.find({
      select: {
        dueDate: true,
        id: true,
        parentTaskId: true,
        projectId: true,
        status: true,
        taskKind: true,
      },
      where: { projectId: In(projectIds) },
    });
  }

  private toView(
    customer: Customer,
    access: CustomerNoteAccess,
    projectCount = 0,
  ): CustomerView {
    return presentCustomer(
      {
        commercialNote: customer.commercialNote,
        domain: customer.domain,
        id: customer.id,
        name: customer.name,
        owner: {
          email: customer.owner.email,
          firstName: customer.owner.firstName,
          id: customer.owner.id,
          lastName: customer.owner.lastName,
        },
        projectCount,
        renewalDate: customer.renewalDate,
        lastTouch: customer.lastTouch ?? null,
        status: customer.status as CustomerStatus,
        successNote: customer.successNote,
      },
      access,
    );
  }

  private blankToNull(value: string | null | undefined) {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

export function projectIsOpenable(visible: string[] | 'all', projectId: string) {
  if (visible === 'all') {
    return true;
  }
  return visible.includes(projectId);
}

function personName(
  user?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null,
) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.email || 'Unassigned';
}
