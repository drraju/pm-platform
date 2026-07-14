/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
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
import { ResourceCapacityPolicyApiService } from '../resource-capacity-policy-api.service';
import { ResourceCapacityPolicyController } from '../resource-capacity-policy.controller';
import { CreateResourceCapacityPolicyDto } from '../dto/resource-capacity-policy.dto';
import { ResourceCapacityPolicy } from '../entities/resource-capacity-policy.entity';
import { Resource } from '../entities/resource.entity';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';
import { ResourceCapacityPolicyService } from '../resource-capacity-policy.service';
import { ResourceCapacityPolicyValidationService } from '../resource-capacity-policy-validation.service';

type Persisted<T> = T & {
  createdAt: Date;
  deletedAt?: Date | null;
  id: string;
  updatedAt: Date;
};

class InMemoryRepository<T extends { id?: string; deletedAt?: Date | null }> {
  public manager: any;
  protected sequence = 1;

  constructor(protected readonly rows: Persisted<T>[] = []) {}

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

  protected filter(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
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

  protected matches(row: Persisted<T>, clause: FindOptionsWhere<T>) {
    return Object.entries(clause).every(([key, expected]) => {
      if (expected === undefined) {
        return true;
      }

      const actual = row[key as keyof Persisted<T>];
      if (expected && typeof expected === 'object' && '_type' in expected) {
        if (expected._type === 'not') {
          return actual !== expected._value;
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

class CapacityPolicyRepository extends InMemoryRepository<ResourceCapacityPolicy> {
  createQueryBuilder(_alias: string) {
    void _alias;
    let resourceId = '';
    let status: ResourceCapacityPolicyStatus | undefined;
    let excludedPolicyId: string | undefined;
    let effectiveEndDate = '9999-12-31';
    let effectiveStartDate = '0001-01-01';

    const builder = {
      where: (_expression: string, parameters: { resourceId: string }) => {
        resourceId = parameters.resourceId;
        return builder;
      },
      andWhere: (
        expression: string,
        parameters?:
          | { status?: ResourceCapacityPolicyStatus }
          | { policyId?: string }
          | { effectiveEndDate?: string }
          | { effectiveStartDate?: string },
      ) => {
        if (expression.includes('policy.status')) {
          status = (parameters as { status?: ResourceCapacityPolicyStatus })
            ?.status;
        } else if (expression.includes('policy.id <>')) {
          excludedPolicyId = (parameters as { policyId?: string })?.policyId;
        } else if (expression.includes('policy.effective_start_date')) {
          effectiveEndDate =
            (parameters as { effectiveEndDate?: string })?.effectiveEndDate ??
            effectiveEndDate;
        } else if (expression.includes('COALESCE(policy.effective_end_date')) {
          effectiveStartDate =
            (parameters as { effectiveStartDate?: string })
              ?.effectiveStartDate ?? effectiveStartDate;
        }
        return builder;
      },
      getOne: async () =>
        this.rows.find((row) => {
          if (row.deletedAt) {
            return false;
          }
          if (row.resourceId !== resourceId) {
            return false;
          }
          if (status && row.status !== status) {
            return false;
          }
          if (excludedPolicyId && row.id === excludedPolicyId) {
            return false;
          }
          const rowEndDate = row.effectiveEndDate ?? '9999-12-31';
          return (
            row.effectiveStartDate <= effectiveEndDate &&
            rowEndDate >= effectiveStartDate
          );
        }) ?? null,
    };

    return builder;
  }
}

describe('ResourceCapacityPolicy API integration', () => {
  let controller: ResourceCapacityPolicyController;
  let capacityPoliciesRepository: CapacityPolicyRepository;
  let resourcesRepository: InMemoryRepository<Resource>;

  const actor = {
    email: 'admin@example.com',
    roleId: 'admin-role-id',
    userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  };

  beforeEach(async () => {
    capacityPoliciesRepository = new CapacityPolicyRepository();
    resourcesRepository = new InMemoryRepository<Resource>();

    const repositoryByEntity = new Map<Function, InMemoryRepository<any>>([
      [ResourceCapacityPolicy, capacityPoliciesRepository],
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
      transaction: async (
        callback: (manager: typeof manager) => Promise<any>,
      ) => callback(manager),
    };

    capacityPoliciesRepository.manager = manager;

    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceCapacityPolicyController],
      providers: [
        ResourceCapacityPolicyApiService,
        ResourceCapacityPolicyService,
        ResourceCapacityPolicyValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(ResourceCapacityPolicy),
          useValue: capacityPoliciesRepository,
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

    controller = moduleRef.get(ResourceCapacityPolicyController);
  });

  it('creates, reads, updates, lists, and archives resource capacity policies', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');

    const created = await controller.createCapacityPolicy(
      createRequest(actor),
      resource.id,
      createPolicyDto(),
    );

    expect(created).toEqual(
      expect.objectContaining({
        capacityMinutesPerWorkingDay: 480,
        resourceId: resource.id,
        status: ResourceCapacityPolicyStatus.Active,
      }),
    );

    await expect(
      controller.createCapacityPolicy(
        createRequest(actor),
        resource.id,
        createPolicyDto(),
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      controller.getCapacityPolicy(resource.id, created.id),
    ).resolves.toEqual(expect.objectContaining({ id: created.id }));

    await expect(controller.listCapacityPolicies(resource.id)).resolves.toEqual(
      [expect.objectContaining({ id: created.id })],
    );

    const updated = await controller.updateCapacityPolicy(
      createRequest(actor),
      resource.id,
      created.id,
      { capacityMinutesPerWorkingDay: 420, effectiveEndDate: null },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        capacityMinutesPerWorkingDay: 420,
        effectiveEndDate: null,
      }),
    );

    await controller.deleteCapacityPolicy(
      createRequest(actor),
      resource.id,
      created.id,
    );

    await expect(
      controller.getCapacityPolicy(resource.id, created.id),
    ).resolves.toEqual(
      expect.objectContaining({
        id: created.id,
        status: ResourceCapacityPolicyStatus.Archived,
      }),
    );
    await expect(controller.listCapacityPolicies(resource.id)).resolves.toEqual(
      [],
    );
  });

  it('returns not found when the resource or policy path does not match', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const otherResource = await seedResource(
      resourcesRepository,
      'other-resource-id',
    );
    const created = await controller.createCapacityPolicy(
      createRequest(actor),
      resource.id,
      createPolicyDto(),
    );

    await expect(
      controller.getCapacityPolicy(otherResource.id, created.id),
    ).rejects.toThrow(NotFoundException);
    await expect(
      controller.createCapacityPolicy(
        createRequest(actor),
        'missing-resource-id',
        createPolicyDto(),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects malformed UUIDs before reaching persistence', async () => {
    const uuidPipe = new ParseUUIDPipe();

    await expect(
      uuidPipe.transform('not-a-uuid', {
        type: 'param',
        metatype: String,
        data: 'resourceId',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid business input through the application service', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');

    await expect(
      controller.createCapacityPolicy(createRequest(actor), resource.id, {
        ...createPolicyDto(),
        capacityMinutesPerWorkingDay: -1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

function createPolicyDto(): CreateResourceCapacityPolicyDto {
  return {
    capacityMinutesPerWorkingDay: 480,
    effectiveEndDate: '2026-08-31',
    effectiveStartDate: '2026-08-01',
    status: ResourceCapacityPolicyStatus.Active,
  };
}

function createRequest(actor: {
  email: string;
  roleId: string;
  userId: string;
}): Parameters<ResourceCapacityPolicyController['createCapacityPolicy']>[0] {
  return { user: actor } as unknown as Parameters<
    ResourceCapacityPolicyController['createCapacityPolicy']
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
