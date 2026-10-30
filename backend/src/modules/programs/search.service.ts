import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOperator, FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../common/authz/permissions';
import { UserRole } from '../../common/enums/user-role.enum';
import { CustomersService } from '../customers/customers.service';
import { Project } from '../projects/entities/project.entity';
import { ProjectVisibilityService } from '../projects/project-visibility.service';
import { Task } from '../tasks/entities/task.entity';

export type SearchHit = {
  href: string;
  id: string;
  name: string;
  parent: string | null;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async search(actor: AuthorizationActor, query?: string) {
    const term = safeTerm(query ?? '');
    if (term.length < 2) {
      return { customers: [], projects: [], work: [] };
    }
    const pattern: FindOperator<string> = ILike(`%${term}%`);
    const external = await this.authorizationPolicyService.isExternalActor(actor);
    const customers = external ? [] : await this.customersService.list(actor, 'all');
    const customerHits: SearchHit[] = customers
      .filter(
        (customer) =>
          contains(customer.name, term) || contains(customer.domain, term),
      )
      .slice(0, 8)
      .map((customer) => ({
        href: `/customers/${customer.id}`,
        id: customer.id,
        name: customer.name,
        parent: null,
      }));

    const visible = await this.projectVisibilityService.getVisibleProjectIds(actor);
    const roles = await this.authorizationPolicyService.getActorRoleNames(actor);
    const programScoped =
      roles.includes(UserRole.ProgramManager) && visible !== 'all';
    const customerIds = programScoped ? [] : customers.map((customer) => customer.id);
    const projects = await this.findProjects(visible, customerIds, pattern);
    const projectHits: SearchHit[] = projects.slice(0, 8).map((project) => ({
      href: `/projects/${project.id}`,
      id: project.id,
      name: project.name,
      parent: project.customer?.name ?? null,
    }));

    const workHits = (await this.includeWork(actor))
      ? await this.findWork(visible, pattern)
      : [];

    return { customers: customerHits, projects: projectHits, work: workHits };
  }

  private async findProjects(
    visible: string[] | 'all',
    customerIds: string[],
    pattern: FindOperator<string>,
  ) {
    if (visible === 'all') {
      return this.projectsRepository.find({
        order: { name: 'ASC' },
        relations: { customer: true },
        take: 8,
        where: { name: pattern },
      });
    }
    const clauses: FindOptionsWhere<Project>[] = [];
    if (visible.length > 0) {
      clauses.push({ id: In(visible), name: pattern });
    }
    if (customerIds.length > 0) {
      clauses.push({ customerId: In(customerIds), name: pattern });
    }
    if (clauses.length === 0) {
      return [];
    }
    return this.projectsRepository.find({
      order: { name: 'ASC' },
      relations: { customer: true },
      take: 8,
      where: clauses,
    });
  }

  private async findWork(
    visible: string[] | 'all',
    pattern: FindOperator<string>,
  ): Promise<SearchHit[]> {
    if (visible !== 'all' && visible.length === 0) {
      return [];
    }
    const tasks = await this.tasksRepository.find({
      order: { title: 'ASC' },
      relations: { project: true },
      take: 8,
      where:
        visible === 'all'
          ? { title: pattern }
          : { projectId: In(visible), title: pattern },
    });
    return tasks.map((task) => ({
      href: `/today?work=${task.id}`,
      id: task.id,
      name: task.title,
      parent: task.project?.name ?? null,
    }));
  }

  private async includeWork(actor: AuthorizationActor) {
    const roles = await this.authorizationPolicyService.getActorRoleNames(actor);
    if (
      roles.includes(UserRole.Executive) ||
      roles.includes(UserRole.PlatformAdmin) ||
      roles.includes(UserRole.Admin)
    ) {
      return true;
    }
    return this.authorizationPolicyService.hasAnyPermission(actor, [
      PermissionKey.WorkUpdate,
      PermissionKey.TaskUpdate,
      PermissionKey.TaskCreate,
    ]);
  }
}

function safeTerm(query: string) {
  return query.trim().replace(/[%_]/g, '');
}

function contains(value: string | null | undefined, term: string) {
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
