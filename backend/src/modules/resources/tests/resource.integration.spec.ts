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
import { ResourceController } from '../resource.controller';
import { ResourceApiService } from '../resource-api.service';
import { CreateResourceDto } from '../dto/resource.dto';
import { Resource } from '../entities/resource.entity';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';
import { ResourceService } from '../resource.service';
import { ResourceValidationService } from '../resource-validation.service';

type Persisted<T> = T & {
  createdAt: Date;
  deletedAt?: Date | null;
  id: string;
  updatedAt: Date;
};

class InMemoryRepository<T extends { id?: string; deletedAt?: Date | null }> {
  private sequence = 1;

  constructor(
    private readonly prefix: string,
    private readonly rows: Persisted<T>[] = [],
  ) {}

  create(input: Partial<T>): T {
    return input as T;
  }

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
      createdAt: now,
      id: createUuid(this.sequence++),
      updatedAt: now,
      ...input,
    } as Persisted<T>;
    this.rows.push(persisted);
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
      const actual = row[key as keyof Persisted<T>];
      if (
        expected &&
        typeof expected === 'object' &&
        '_type' in expected &&
        expected._type === 'not'
      ) {
        return actual !== expected._value;
      }
      if (
        expected &&
        typeof expected === 'object' &&
        '_type' in expected &&
        expected._type === 'ilike'
      ) {
        const normalizedActual = String(actual ?? '').toLowerCase();
        const normalizedExpected = String(expected._value)
          .toLowerCase()
          .replaceAll('%', '');
        return normalizedActual.includes(normalizedExpected);
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

describe('Resource API integration', () => {
  let controller: ResourceController;

  const actor = {
    email: 'admin@example.com',
    roleId: 'admin-role-id',
    userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceController],
      providers: [
        ResourceApiService,
        ResourceService,
        ResourceValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(Resource),
          useValue: new InMemoryRepository<Resource>('resource'),
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

    controller = moduleRef.get(ResourceController);
  });

  it('creates, lists, reads, updates, searches, and archives resources', async () => {
    const created = await controller.createResource(
      createRequest(actor),
      createResourceDto(),
    );

    expect(created).toEqual(
      expect.objectContaining({
        description: 'Delivers backend planning services',
        name: 'Senior Engineer',
        resourceType: ResourceType.Human,
        roleName: 'Engineering',
        status: ResourceStatus.Active,
      }),
    );

    await expect(
      controller.createResource(createRequest(actor), createResourceDto()),
    ).rejects.toThrow(ConflictException);

    await expect(controller.listResources({})).resolves.toHaveLength(1);
    await expect(controller.getResource(created.id)).resolves.toEqual(
      expect.objectContaining({ id: created.id, name: 'Senior Engineer' }),
    );

    const updated = await controller.updateResource(
      createRequest(actor),
      created.id,
      {
        roleName: 'Architecture',
        status: ResourceStatus.Inactive,
      },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        roleName: 'Architecture',
        status: ResourceStatus.Inactive,
      }),
    );

    const searched = await controller.listResources({ search: 'architect' });
    expect(searched).toHaveLength(1);
    expect(searched[0].id).toBe(created.id);

    await controller.deleteResource(createRequest(actor), created.id);
    await expect(controller.getResource(created.id)).resolves.toEqual(
      expect.objectContaining({ status: ResourceStatus.Archived }),
    );
    await expect(controller.listResources({})).resolves.toEqual([]);
    await expect(
      controller.listResources({ includeArchived: true }),
    ).resolves.toHaveLength(1);
  });

  it('filters by resource type and excludes archived resources by default', async () => {
    const human = await controller.createResource(
      createRequest(actor),
      createResourceDto(),
    );
    const team = await controller.createResource(createRequest(actor), {
      name: 'Delivery Team',
      resourceType: ResourceType.Team,
      status: ResourceStatus.Active,
    });

    await controller.deleteResource(createRequest(actor), human.id);

    await expect(
      controller.listResources({ resourceType: ResourceType.Team }),
    ).resolves.toEqual([expect.objectContaining({ id: team.id })]);
  });

  it('throws when reading a missing resource', async () => {
    await expect(
      controller.getResource('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects malformed UUIDs before reaching persistence', async () => {
    const created = await controller.createResource(
      createRequest(actor),
      createResourceDto(),
    );

    const uuidPipe = new ParseUUIDPipe();

    await expect(
      uuidPipe.transform('not-a-uuid', {
        type: 'param',
        metatype: String,
        data: 'id',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      controller.getResource('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(NotFoundException);

    await expect(controller.getResource(created.id)).resolves.toEqual(
      expect.objectContaining({ id: created.id, name: 'Senior Engineer' }),
    );
  });
});

function createRequest(user: {
  email: string;
  roleId: string;
  userId: string;
}) {
  return { user } as any;
}

function createResourceDto(): CreateResourceDto {
  return {
    description: 'Delivers backend planning services',
    name: 'Senior Engineer',
    resourceType: ResourceType.Human,
    roleName: 'Engineering',
    status: ResourceStatus.Active,
  };
}

function createUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}
