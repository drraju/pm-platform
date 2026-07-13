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
import { Resource } from '../entities/resource.entity';
import { ResourceSkill } from '../entities/resource-skill.entity';
import { Skill } from '../entities/skill.entity';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillStatus } from '../enums/skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';
import { ResourceSkillApiService } from '../resource-skill-api.service';
import { ResourceSkillController } from '../resource-skill.controller';
import { ResourceSkillService } from '../resource-skill.service';
import { ResourceSkillValidationService } from '../resource-skill-validation.service';

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

describe('ResourceSkill API integration', () => {
  let controller: ResourceSkillController;
  let resourceSkillsRepository: InMemoryRepository<ResourceSkill>;
  let resourcesRepository: InMemoryRepository<Resource>;
  let skillsRepository: InMemoryRepository<Skill>;

  const actor = {
    email: 'admin@example.com',
    roleId: 'admin-role-id',
    userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  };

  beforeEach(async () => {
    resourceSkillsRepository = new InMemoryRepository<ResourceSkill>();
    resourcesRepository = new InMemoryRepository<Resource>();
    skillsRepository = new InMemoryRepository<Skill>();

    const repositoryByEntity = new Map<Function, InMemoryRepository<any>>([
      [ResourceSkill, resourceSkillsRepository],
      [Resource, resourcesRepository],
      [Skill, skillsRepository],
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

    resourceSkillsRepository.manager = manager;

    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceSkillController],
      providers: [
        ResourceSkillApiService,
        ResourceSkillService,
        ResourceSkillValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(ResourceSkill),
          useValue: resourceSkillsRepository,
        },
        {
          provide: getRepositoryToken(Resource),
          useValue: resourcesRepository,
        },
        {
          provide: getRepositoryToken(Skill),
          useValue: skillsRepository,
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

    controller = moduleRef.get(ResourceSkillController);
  });

  it('creates, reads, updates, lists, and archives resource skills', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const skill = await seedSkill(skillsRepository, 'skill-id');

    const created = await controller.createResourceSkill(
      createRequest(actor),
      createResourceSkillDto(resource.id, skill.id),
    );

    expect(created).toEqual(
      expect.objectContaining({
        proficiencyLevel: SkillProficiencyLevel.Advanced,
        resourceId: resource.id,
        skillId: skill.id,
        status: ResourceSkillStatus.Active,
      }),
    );

    await expect(
      controller.createResourceSkill(
        createRequest(actor),
        createResourceSkillDto(resource.id, skill.id),
      ),
    ).rejects.toThrow(ConflictException);

    await expect(controller.getResourceSkill(created.id)).resolves.toEqual(
      expect.objectContaining({ id: created.id }),
    );

    await expect(controller.listResourceSkills({})).resolves.toEqual([
      expect.objectContaining({ id: created.id }),
    ]);
    await expect(
      controller.listResourceSkillsByResource(resource.id),
    ).resolves.toEqual([expect.objectContaining({ id: created.id })]);
    await expect(controller.listResourceSkillsBySkill(skill.id)).resolves.toEqual([
      expect.objectContaining({ id: created.id }),
    ]);

    const updated = await controller.updateResourceSkill(
      createRequest(actor),
      created.id,
      {
        monthsExperience: 8,
        notes: 'Updated notes',
      },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        monthsExperience: 8,
        notes: 'Updated notes',
        yearsExperience: 5,
      }),
    );

    await controller.deleteResourceSkill(createRequest(actor), created.id);
    await expect(controller.getResourceSkill(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns not found for missing related records and entities', async () => {
    const resource = await seedResource(resourcesRepository, 'resource-id');
    const skill = await seedSkill(skillsRepository, 'skill-id');

    await expect(
      controller.createResourceSkill(createRequest(actor), {
        ...createResourceSkillDto(resource.id, 'missing-skill-id'),
      }),
    ).rejects.toThrow(NotFoundException);

    await expect(
      controller.listResourceSkillsByResource('missing-resource-id'),
    ).rejects.toThrow(NotFoundException);

    await expect(
      controller.getResourceSkill('11111111-1111-4111-8111-111111111111'),
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
    const skill = await seedSkill(skillsRepository, 'skill-id');

    await expect(
      controller.createResourceSkill(createRequest(actor), {
        ...createResourceSkillDto(resource.id, skill.id),
        monthsExperience: 14,
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

function createResourceSkillDto(resourceId: string, skillId: string) {
  return {
    monthsExperience: 6,
    notes: 'Applied in ERM workstreams',
    proficiencyLevel: SkillProficiencyLevel.Advanced,
    resourceId,
    skillId,
    status: ResourceSkillStatus.Active,
    yearsExperience: 5,
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

async function seedSkill(
  repository: InMemoryRepository<Skill>,
  id: string,
): Promise<Persisted<Skill>> {
  return repository.save({
    category: 'Engineering',
    id,
    name: 'TypeScript',
    status: SkillStatus.Active,
  } as Skill);
}

function createUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}
