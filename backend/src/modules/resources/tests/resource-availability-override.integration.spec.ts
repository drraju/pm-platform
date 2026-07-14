/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import {
  BadRequestException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsWhere } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceAvailabilityOverrideApiService } from '../resource-availability-override-api.service';
import { ResourceAvailabilityOverrideController } from '../resource-availability-override.controller';
import { CreateResourceAvailabilityOverrideDto } from '../dto/resource-availability-override.dto';
import { ResourceAvailabilityOverride } from '../entities/resource-availability-override.entity';
import { Resource } from '../entities/resource.entity';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';
import { ResourceAvailabilityOverrideService } from '../resource-availability-override.service';
import { ResourceAvailabilityOverrideValidationService } from '../resource-availability-override-validation.service';

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
    return this.save({
      ...input,
      deletedAt: new Date('2026-07-10T00:00:00.000Z'),
    });
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
      return row[key as keyof Persisted<T>] === expected;
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

describe('ResourceAvailabilityOverride API integration', () => {
  let controller: ResourceAvailabilityOverrideController;
  let availabilityOverridesRepository: InMemoryRepository<ResourceAvailabilityOverride>;
  let resourcesRepository: InMemoryRepository<Resource>;

  const actor = {
    email: 'admin@example.com',
    roleId: 'admin-role-id',
    userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  };

  beforeEach(async () => {
    availabilityOverridesRepository =
      new InMemoryRepository<ResourceAvailabilityOverride>();
    resourcesRepository = new InMemoryRepository<Resource>();

    const repositoryByEntity = new Map<Function, InMemoryRepository<any>>([
      [ResourceAvailabilityOverride, availabilityOverridesRepository],
      [Resource, resourcesRepository],
    ]);

    const manager = {
      create: (_entity: Function, input: any) => input,
      findOne: (entity: Function, options: any) =>
        repositoryByEntity.get(entity)?.findOne(options) ?? null,
      getRepository: (entity: Function) => repositoryByEntity.get(entity),
      merge: (_entity: Function, target: any, source: any) => ({
        ...target,
        ...source,
      }),
      save: (entity: Function, input: any) =>
        repositoryByEntity.get(entity)!.save(input),
      softRemove: (entity: Function, input: any) =>
        repositoryByEntity.get(entity)!.softRemove(input),
      transaction: async (
        callback: (manager: typeof manager) => Promise<any>,
      ) => callback(manager),
    };

    availabilityOverridesRepository.manager = manager;

    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceAvailabilityOverrideController],
      providers: [
        ResourceAvailabilityOverrideApiService,
        ResourceAvailabilityOverrideService,
        ResourceAvailabilityOverrideValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(ResourceAvailabilityOverride),
          useValue: availabilityOverridesRepository,
        },
        {
          provide: getRepositoryToken(Resource),
          useValue: resourcesRepository,
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

    controller = moduleRef.get(ResourceAvailabilityOverrideController);
  });

  it('creates, reads, updates, lists, and archives resource availability overrides', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');

    const created = await controller.createAvailabilityOverride(
      createRequest(actor),
      resource.id,
      createOverrideDto(),
    );

    expect(created).toEqual(
      expect.objectContaining({
        overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
        resourceId: resource.id,
      }),
    );

    await expect(
      controller.getAvailabilityOverride(resource.id, created.id),
    ).resolves.toEqual(expect.objectContaining({ id: created.id }));

    await expect(
      controller.listAvailabilityOverrides(resource.id),
    ).resolves.toEqual([expect.objectContaining({ id: created.id })]);

    const updated = await controller.updateAvailabilityOverride(
      createRequest(actor),
      resource.id,
      created.id,
      { reason: 'Updated reason' },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        id: created.id,
        reason: 'Updated reason',
      }),
    );

    await controller.deleteAvailabilityOverride(
      createRequest(actor),
      resource.id,
      created.id,
    );

    await expect(
      controller.getAvailabilityOverride(resource.id, created.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns not found when the resource or override path does not match', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const otherResource = await seedResource(
      resourcesRepository,
      'other-resource-id',
    );
    const created = await controller.createAvailabilityOverride(
      createRequest(actor),
      resource.id,
      createOverrideDto(),
    );

    await expect(
      controller.getAvailabilityOverride(otherResource.id, created.id),
    ).rejects.toThrow(NotFoundException);
    await expect(
      controller.createAvailabilityOverride(
        createRequest(actor),
        'missing-resource-id',
        createOverrideDto(),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects malformed UUIDs before reaching persistence', async () => {
    const uuidPipe = new ParseUUIDPipe();

    await expect(
      uuidPipe.transform('not-a-uuid', {
        type: 'param',
        metatype: String,
        data: 'overrideId',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid business input through the application service', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');

    await expect(
      controller.createAvailabilityOverride(createRequest(actor), resource.id, {
        ...createOverrideDto(),
        availableMinutesPerWorkingDay: undefined,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

function createOverrideDto(): CreateResourceAvailabilityOverrideDto {
  return {
    availableMinutesPerWorkingDay: 240,
    endDate: '2026-08-03',
    overrideType: ResourceAvailabilityOverrideType.ReducedCapacity,
    reason: 'Training block',
    startDate: '2026-08-01',
  };
}

function createRequest(actor: {
  email: string;
  roleId: string;
  userId: string;
}): Parameters<
  ResourceAvailabilityOverrideController['createAvailabilityOverride']
>[0] {
  return { user: actor } as unknown as Parameters<
    ResourceAvailabilityOverrideController['createAvailabilityOverride']
  >[0];
}

async function seedResource(
  repository: InMemoryRepository<Resource>,
  id: string,
): Promise<Persisted<Resource>> {
  return repository.save(
    Object.assign(new Resource(), {
      id,
      name: `Resource ${id}`,
      resourceType: ResourceType.Human,
      status: ResourceStatus.Active,
    }),
  );
}

function createUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}
