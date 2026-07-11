import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsWhere } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ResourceAssignmentApiService } from '../resource-assignment-api.service';
import { ResourceAssignmentController } from '../resource-assignment.controller';
import { CreateResourceAssignmentDto } from '../dto/resource-assignment.dto';
import { ResourceAssignment } from '../entities/resource-assignment.entity';
import { Resource } from '../entities/resource.entity';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';
import { ResourceAssignmentService } from '../resource-assignment.service';
import { ResourceAssignmentValidationService } from '../resource-assignment-validation.service';

type Persisted<T> = T & {
  createdAt: Date;
  deletedAt?: Date | null;
  id: string;
  updatedAt: Date;
};

class InMemoryRepository<T extends { id?: string; deletedAt?: Date | null }> {
  public manager: any;
  private sequence = 1;

  constructor(private readonly rows: Persisted<T>[] = []) {}

  async save(input: T): Promise<Persisted<T>> {
    const now = new Date('2026-07-10T00:00:00.000Z');
    const existingIndex = input.id
      ? this.rows.findIndex((row) => row.id === input.id)
      : -1;

    if (existingIndex >= 0) {
      this.rows[existingIndex] = {
        ...this.rows[existingIndex],
        ...input,
        updatedAt: now,
      };
      return this.rows[existingIndex];
    }

    const persisted = {
      ...input,
      createdAt: now,
      id: input.id ?? createUuid(this.sequence++),
      updatedAt: now,
    } as Persisted<T>;
    this.rows.push(persisted);
    return persisted;
  }

  async softRemove(input: T): Promise<Persisted<T>> {
    const persisted = await this.save({
      ...input,
      deletedAt: new Date('2026-07-10T00:00:00.000Z'),
    } as T);
    return persisted;
  }

  async find(options?: {
    order?: Record<string, 'ASC' | 'DESC'>;
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }): Promise<Persisted<T>[]> {
    return this.applyOrder(this.filter(options?.where), options?.order);
  }

  async findOne(options?: {
    order?: Record<string, 'ASC' | 'DESC'>;
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }): Promise<Persisted<T> | null> {
    return (
      this.applyOrder(this.filter(options?.where), options?.order)[0] ?? null
    );
  }

  private filter(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
    return this.rows.filter((row) => {
      if (row.deletedAt) {
        return false;
      }
      if (!where) {
        return true;
      }
      const clauses = Array.isArray(where) ? where : [where];
      return clauses.some((clause) => this.matches(row, clause));
    });
  }

  private matches(row: Persisted<T>, clause: FindOptionsWhere<T>) {
    return Object.entries(clause).every(([key, expected]) => {
      if (expected === undefined) {
        return true;
      }

      const actual = row[key as keyof Persisted<T>];
      if (expected && typeof expected === 'object' && '_type' in expected) {
        if (expected._type === 'not') {
          return actual !== expected._value;
        }
        if (expected._type === 'isNull') {
          return actual === null || actual === undefined;
        }
      }
      return actual === expected;
    });
  }

  private applyOrder(
    rows: Persisted<T>[],
    order?: Record<string, 'ASC' | 'DESC'>,
  ) {
    if (!order) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      for (const [key, direction] of Object.entries(order)) {
        const leftValue = left[key as keyof Persisted<T>];
        const rightValue = right[key as keyof Persisted<T>];
        if (leftValue === rightValue) {
          continue;
        }
        const comparison = leftValue < rightValue ? -1 : 1;
        return direction === 'ASC' ? comparison : -comparison;
      }
      return 0;
    });
  }
}

describe('ResourceAssignment API integration', () => {
  let controller: ResourceAssignmentController;
  let assignmentsRepository: InMemoryRepository<ResourceAssignment>;
  let resourcesRepository: InMemoryRepository<Resource>;
  let projectsRepository: InMemoryRepository<Project>;
  let tasksRepository: InMemoryRepository<Task>;

  const actor = {
    email: 'admin@example.com',
    roleId: 'admin-role-id',
    userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  };

  beforeEach(async () => {
    assignmentsRepository = new InMemoryRepository<ResourceAssignment>();
    resourcesRepository = new InMemoryRepository<Resource>();
    projectsRepository = new InMemoryRepository<Project>();
    tasksRepository = new InMemoryRepository<Task>();

    const repositoryByEntity = new Map<Function, InMemoryRepository<any>>([
      [ResourceAssignment, assignmentsRepository],
      [Resource, resourcesRepository],
      [Project, projectsRepository],
      [Task, tasksRepository],
    ]);

    const manager = {
      findOne: (entity: Function, options: any) =>
        repositoryByEntity.get(entity)?.findOne(options) ?? null,
      getRepository: (entity: Function) => repositoryByEntity.get(entity),
      save: (entity: Function, input: any) =>
        repositoryByEntity.get(entity)!.save(input),
      softRemove: (entity: Function, input: any) =>
        repositoryByEntity.get(entity)!.softRemove(input),
      transaction: async (callback: (manager: typeof manager) => Promise<any>) =>
        callback(manager),
    };

    assignmentsRepository.manager = manager;

    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceAssignmentController],
      providers: [
        ResourceAssignmentApiService,
        ResourceAssignmentService,
        ResourceAssignmentValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(ResourceAssignment),
          useValue: assignmentsRepository,
        },
        {
          provide: getRepositoryToken(Resource),
          useValue: resourcesRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: projectsRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: tasksRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          const request = context.switchToHttp().getRequest();
          request.user = actor;
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(ResourceAssignmentController);
  });

  it('creates, reads, updates, lists, and archives assignments', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const project = await seedProject(projectsRepository, 'project-id');
    const task = await seedTask(tasksRepository, project.id, 'task-id');

    const created = await controller.createAssignment(
      createRequest(actor),
      createAssignmentDto(resource.id, project.id, task.id),
    );

    expect(created).toEqual(
      expect.objectContaining({
        allocationPercent: 50,
        projectId: project.id,
        resourceId: resource.id,
        status: ResourceAssignmentStatus.Active,
        taskId: task.id,
      }),
    );

    await expect(
      controller.createAssignment(
        createRequest(actor),
        createAssignmentDto(resource.id, project.id, task.id),
      ),
    ).rejects.toThrow(ConflictException);

    await expect(controller.getAssignmentById(created.id)).resolves.toEqual(
      expect.objectContaining({ id: created.id }),
    );

    await expect(controller.listAssignmentsByProject(project.id)).resolves.toEqual(
      [expect.objectContaining({ id: created.id })],
    );
    await expect(
      controller.listAssignmentsByResource(resource.id),
    ).resolves.toEqual([expect.objectContaining({ id: created.id })]);

    const updated = await controller.updateAssignment(
      createRequest(actor),
      created.id,
      {
        plannedMinutesPerDay: 240,
        taskId: null,
      },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        allocationPercent: 50,
        plannedMinutesPerDay: 240,
        taskId: null,
      }),
    );

    await controller.deleteAssignment(createRequest(actor), created.id);
    await expect(controller.getAssignmentById(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns not found for missing related records and entities', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const project = await seedProject(projectsRepository, 'project-id');

    await expect(
      controller.createAssignment(
        createRequest(actor),
        createAssignmentDto(resource.id, project.id, 'missing-task-id'),
      ),
    ).rejects.toThrow(NotFoundException);

    await expect(
      controller.getAssignmentById('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects malformed UUIDs before reaching persistence', async () => {
    const uuidPipe = new ParseUUIDPipe();

    await expect(
      uuidPipe.transform('not-a-uuid', {
        type: 'param',
        metatype: String,
        data: 'id',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid business input through the application service', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const project = await seedProject(projectsRepository, 'project-id');

    await expect(
      controller.createAssignment(createRequest(actor), {
        allocationPercent: 120,
        endDate: '2026-07-11',
        projectId: project.id,
        resourceId: resource.id,
        startDate: '2026-07-18',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

function createRequest(user: {
  email: string;
  roleId: string;
  userId: string;
}) {
  return { user } as any;
}

function createAssignmentDto(
  resourceId: string,
  projectId: string,
  taskId?: string,
): CreateResourceAssignmentDto {
  return {
    allocationPercent: 50,
    endDate: '2026-07-18',
    projectId,
    resourceId,
    startDate: '2026-07-11',
    status: ResourceAssignmentStatus.Active,
    taskId,
  };
}

async function seedResource(
  repository: InMemoryRepository<Resource>,
  id: string,
): Promise<Persisted<Resource>> {
  return repository.save({
    description: 'Delivers backend planning services',
    id,
    name: 'Senior Engineer',
    resourceType: 'human' as Resource['resourceType'],
    status: 'active' as Resource['status'],
  } as Resource);
}

async function seedProject(
  repository: InMemoryRepository<Project>,
  id: string,
): Promise<Persisted<Project>> {
  return repository.save({
    id,
    name: 'Project Atlas',
    status: 'active' as Project['status'],
  } as Project);
}

async function seedTask(
  repository: InMemoryRepository<Task>,
  projectId: string,
  id: string,
): Promise<Persisted<Task>> {
  return repository.save({
    id,
    projectId,
    status: 'todo' as Task['status'],
    title: 'Implement assignment API',
  } as Task);
}

function createUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}
