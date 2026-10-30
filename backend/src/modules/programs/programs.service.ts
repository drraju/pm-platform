import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../common/authz/permissions';
import { ProjectRole } from '../../common/enums/project-role.enum';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { CustomersService } from '../customers/customers.service';
import { Project } from '../projects/entities/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { countWork, WorkCountTask } from '../tasks/work-count';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import {
  AcceptProjectRequestDto,
  AttachProgramProjectDto,
  CreateProgramDto,
  CreateProgramProjectDto,
  CreateProjectRequestDto,
} from './dto/program.dto';
import { Program } from './entities/program.entity';
import { ProjectRequest } from './entities/project-request.entity';

type WorkRow = WorkCountTask & { projectId: string };

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programsRepository: Repository<Program>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(ProjectRequest)
    private readonly requestsRepository: Repository<ProjectRequest>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectsService: ProjectsService,
    private readonly customersService: CustomersService,
  ) {}

  async list(actor: AuthorizationActor) {
    const programs = await this.programsRepository.find({
      order: { name: 'ASC' },
      relations: { owner: true },
      where: (await this.seesEveryProgram(actor)) ? {} : { ownerId: actor.userId },
    });
    const projects = await this.projectsFor(programs.map((program) => program.id));
    const work = await this.workFor(projects.map((project) => project.id));

    return programs.map((program) => {
      const rows = projects.filter((project) => project.programId === program.id);
      const customers = new Set(
        rows.map((project) => project.customerId).filter((id): id is string => Boolean(id)),
      );
      return {
        customersTouched: customers.size,
        id: program.id,
        name: program.name,
        ownerName: personName(program.owner),
        projectCount: rows.length,
        projects: rows.map((project) => ({
          id: project.id,
          work: work
            .filter((item) => item.projectId === project.id)
            .map(presentWork),
        })),
      };
    });
  }

  async get(actor: AuthorizationActor, id: string) {
    const program = await this.requireProgram(actor, id);
    const projects = await this.projectsFor([program.id]);
    const work = await this.workFor(projects.map((project) => project.id));
    return {
      editable: await this.canEdit(actor, program),
      id: program.id,
      name: program.name,
      ownerName: personName(program.owner),
      projects: projects.map((project) => ({
        customerName: project.customer?.name ?? null,
        id: project.id,
        leadName: leadName(project),
        name: project.name,
        targetFinish: project.targetEndDate ?? null,
        work: work.filter((item) => item.projectId === project.id).map(presentWork),
      })),
    };
  }

  async create(actor: AuthorizationActor, input: CreateProgramDto) {
    await this.assertCanWrite(actor);
    const ownerId = input.ownerId && (await this.isAdmin(actor)) ? input.ownerId : actor.userId;
    const owner = await this.usersRepository.findOne({ where: { id: ownerId } });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    const program = await this.programsRepository.save(
      this.programsRepository.create({
        createdById: actor.userId,
        name: input.name.trim(),
        ownerId: owner.id,
      }),
    );
    program.owner = owner;
    return {
      id: program.id,
      name: program.name,
      ownerName: personName(owner),
    };
  }

  async availableProjects(actor: AuthorizationActor, programId: string) {
    const program = await this.requireProgram(actor, programId);
    if (!(await this.canEdit(actor, program))) {
      throw new ForbiddenException('Program edit access is required');
    }
    const projects = await this.projectsRepository.find({
      order: { name: 'ASC' },
      relations: { customer: true },
      take: 100,
      where: { programId: IsNull() },
    });
    return projects.map((project) => ({
      customerName: project.customer?.name ?? null,
      id: project.id,
      name: project.name,
    }));
  }

  async attachProject(
    actor: AuthorizationActor,
    programId: string,
    input: AttachProgramProjectDto,
  ) {
    const program = await this.requireProgram(actor, programId);
    if (!(await this.canEdit(actor, program))) {
      throw new ForbiddenException('Program edit access is required');
    }
    const project = await this.projectsRepository.findOne({ where: { id: input.projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.programId) {
      throw new BadRequestException('This project is already in a program');
    }
    project.programId = program.id;
    await this.projectsRepository.save(project);
    return { id: project.id, programId: program.id };
  }

  async createProject(
    actor: AuthorizationActor,
    programId: string,
    input: CreateProgramProjectDto,
  ) {
    const program = await this.requireProgram(actor, programId);
    if (!(await this.canEdit(actor, program))) {
      throw new ForbiddenException('Program edit access is required');
    }
    await this.customersService.get(actor, input.customerId);
    const project = await this.projectsService.create(
      {
        customerId: input.customerId,
        leadUserId: input.leadUserId ?? null,
        name: input.name.trim(),
        status: 'active',
        targetEndDate: input.targetFinish ?? null,
      },
      actor,
    );
    await this.projectsRepository.update(project.id, { programId: program.id });
    return { id: project.id, programId: program.id };
  }

  async leads(actor: AuthorizationActor) {
    if (!(await this.canAccept(actor))) {
      throw new ForbiddenException('Program edit access is required');
    }
    const users = await this.usersRepository.find({
      order: { firstName: 'ASC', lastName: 'ASC' },
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

  async createRequest(
    actor: AuthorizationActor,
    customerId: string,
    input: CreateProjectRequestDto,
  ) {
    await this.customersService.get(actor, customerId);
    const request = await this.requestsRepository.save(
      this.requestsRepository.create({
        customerId,
        name: input.name.trim(),
        note: blank(input.note),
        requestedById: actor.userId,
        status: 'open',
        targetFinish: input.targetFinish ?? null,
      }),
    );
    return this.presentRequest(actor, request);
  }

  async listCustomerRequests(actor: AuthorizationActor, customerId: string) {
    await this.customersService.get(actor, customerId);
    const requests = await this.requestsRepository.find({
      order: { createdAt: 'ASC' },
      where: { customerId, status: 'open' },
    });
    return Promise.all(requests.map((request) => this.presentRequest(actor, request)));
  }

  async listOpenRequests(actor: AuthorizationActor) {
    if (!(await this.canAccept(actor))) {
      throw new ForbiddenException('Program edit access is required');
    }
    const requests = await this.requestsRepository.find({
      order: { createdAt: 'ASC' },
      relations: { customer: true },
      where: { status: 'open' },
    });
    return Promise.all(requests.map((request) => this.presentRequest(actor, request)));
  }

  async acceptRequest(
    actor: AuthorizationActor,
    requestId: string,
    input: AcceptProjectRequestDto,
  ) {
    if (!(await this.canAccept(actor))) {
      throw new ForbiddenException('Program edit access is required');
    }
    const request = await this.requestsRepository.findOne({ where: { id: requestId } });
    if (!request || request.status !== 'open') {
      throw new NotFoundException('Project request not found');
    }
    const project = await this.projectsService.create(
      {
        customerId: request.customerId,
        leadUserId: input.leadUserId,
        name: request.name,
        status: 'active',
        targetEndDate: request.targetFinish ?? null,
      },
      actor,
    );
    request.projectId = project.id;
    request.status = 'closed';
    await this.requestsRepository.save(request);
    return {
      customerId: request.customerId,
      projectId: project.id,
      requestId: request.id,
    };
  }

  private async projectsFor(programIds: string[]) {
    if (programIds.length === 0) {
      return [];
    }
    return this.projectsRepository.find({
      order: { name: 'ASC' },
      relations: { customer: true, members: { user: true }, owner: true },
      where: { programId: In(programIds) },
    });
  }

  private async workFor(projectIds: string[]): Promise<WorkRow[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const tasks = await this.tasksRepository.find({
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
    return tasks.map((task) => ({
      dueDate: task.dueDate ?? null,
      id: task.id,
      parentTaskId: task.parentTaskId ?? null,
      projectId: task.projectId,
      status: task.status,
      taskKind: task.taskKind,
    }));
  }

  private async requireProgram(actor: AuthorizationActor, id: string) {
    const program = await this.programsRepository.findOne({
      relations: { owner: true },
      where: { id },
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }
    if (!(await this.seesEveryProgram(actor)) && program.ownerId !== actor.userId) {
      throw new NotFoundException('Program not found');
    }
    return program;
  }

  private async seesEveryProgram(actor: AuthorizationActor) {
    const roles = await this.authorizationPolicyService.getActorRoleNames(actor);
    if (roles.includes(UserRole.Executive)) {
      return true;
    }
    return this.authorizationPolicyService.hasAnyPermission(actor, [
      PermissionKey.UserManage,
      PermissionKey.RoleManage,
      PermissionKey.PermissionManage,
    ]);
  }

  private async isAdmin(actor: AuthorizationActor) {
    const roles = await this.authorizationPolicyService.getActorRoleNames(actor);
    return (
      roles.includes(UserRole.PlatformAdmin) ||
      roles.includes(UserRole.Admin) ||
      (await this.authorizationPolicyService.hasPermission(actor, PermissionKey.UserManage))
    );
  }

  private async assertCanWrite(actor: AuthorizationActor) {
    if (await this.canAccept(actor)) {
      return;
    }
    throw new ForbiddenException('Program edit access is required');
  }

  private async canEdit(actor: AuthorizationActor, program: Program) {
    if (!(await this.canAccept(actor))) {
      return false;
    }
    if (await this.isAdmin(actor)) {
      return true;
    }
    return program.ownerId === actor.userId;
  }

  private async canAccept(actor: AuthorizationActor) {
    const roles = await this.authorizationPolicyService.getActorRoleNames(actor);
    if (roles.includes(UserRole.Executive) && !(await this.isAdmin(actor))) {
      return false;
    }
    return this.authorizationPolicyService.hasAnyPermission(actor, [
      PermissionKey.ProjectCreate,
      PermissionKey.UserManage,
    ]);
  }

  private async presentRequest(actor: AuthorizationActor, request: ProjectRequest) {
    const roles = await this.authorizationPolicyService.getActorRoleNames(actor);
    const hideNote =
      roles.includes(UserRole.CustomerSuccessManager) && !(await this.isAdmin(actor));
    return {
      customerId: request.customerId,
      customerName: request.customer?.name ?? null,
      id: request.id,
      name: request.name,
      ...(hideNote ? {} : { note: request.note ?? null }),
      projectId: request.projectId ?? null,
      status: request.status,
      targetFinish: request.targetFinish ?? null,
    };
  }
}

function presentWork(task: WorkRow): WorkCountTask {
  return {
    dueDate: task.dueDate ?? null,
    id: task.id,
    parentTaskId: task.parentTaskId ?? null,
    status: task.status,
    taskKind: task.taskKind,
  };
}

function personName(user?: { email?: string; firstName?: string | null; lastName?: string | null } | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.email || 'Unassigned';
}

function leadName(project: Project) {
  const lead = (project.members ?? []).find(
    (member) => member.role === ProjectRole.Owner || member.role === ProjectRole.Manager,
  );
  return personName(lead?.user ?? project.owner);
}

function blank(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function programOverdueCount(
  projects: Array<{ work?: WorkCountTask[] }>,
  today: string,
) {
  return projects.reduce((sum, project) => sum + countWork(project.work ?? [], today).overdue, 0);
}
