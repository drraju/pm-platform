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
import { CreateSkillDto } from '../dto/skill.dto';
import { Skill } from '../entities/skill.entity';
import { SkillStatus } from '../enums/skill-status.enum';
import { SkillApiService } from '../skill-api.service';
import { SkillController } from '../skill.controller';
import { SkillService } from '../skill.service';
import { SkillValidationService } from '../skill-validation.service';

type Persisted<T> = T & {
  createdAt: Date;
  deletedAt?: Date | null;
  id: string;
  updatedAt: Date;
};

class InMemoryRepository<T extends { id?: string; deletedAt?: Date | null }> {
  private sequence = 1;

  constructor(
    private readonly rows: Persisted<T>[] = [],
  ) {}

  async find(options?: {
    order?: Record<string, 'ASC' | 'DESC'>;
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }): Promise<Persisted<T>[]> {
    return this.applyOrder(this.filter(options?.where), options?.order);
  }

  async findOne(options?: {
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }): Promise<Persisted<T> | null> {
    return this.filter(options?.where)[0] ?? null;
  }

  createQueryBuilder(_alias: string) {
    let name = '';
    let excludedId: string | undefined;
    const queryBuilder = {
      where: (_expression: string, parameters: { name: string }) => {
        name = parameters.name;
        return queryBuilder;
      },
      andWhere: (_expression: string, parameters: { skillId?: string }) => {
        excludedId = parameters.skillId;
        return queryBuilder;
      },
      getOne: async () =>
        this.rows.find((row) => {
          if (row.deletedAt) {
            return false;
          }
          if (excludedId && row.id === excludedId) {
            return false;
          }
          return String((row as any).name).toLowerCase() === name.toLowerCase();
        }) ?? null,
    };
    return queryBuilder;
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
      ...input,
      createdAt: now,
      id: createUuid(this.sequence++),
      updatedAt: now,
    } as Persisted<T>;
    this.rows.push(persisted);
    return persisted;
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

describe('Skill API integration', () => {
  let controller: SkillController;

  const actor = {
    email: 'admin@example.com',
    roleId: 'admin-role-id',
    userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SkillController],
      providers: [
        SkillApiService,
        SkillService,
        SkillValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(Skill),
          useValue: new InMemoryRepository<Skill>(),
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

    controller = moduleRef.get(SkillController);
  });

  it('creates, lists, reads, updates, searches, and archives skills', async () => {
    const created = await controller.createSkill(
      createRequest(actor),
      createSkillDto(),
    );

    expect(created).toEqual(
      expect.objectContaining({
        category: 'Engineering',
        name: 'TypeScript',
        status: SkillStatus.Active,
      }),
    );

    await expect(
      controller.createSkill(createRequest(actor), createSkillDto()),
    ).rejects.toThrow(ConflictException);

    await expect(controller.listSkills({})).resolves.toHaveLength(1);
    await expect(controller.getSkill(created.id)).resolves.toEqual(
      expect.objectContaining({ id: created.id, name: 'TypeScript' }),
    );

    const updated = await controller.updateSkill(createRequest(actor), created.id, {
      category: 'Architecture',
      status: SkillStatus.Deprecated,
    });
    expect(updated).toEqual(
      expect.objectContaining({
        category: 'Architecture',
        status: SkillStatus.Deprecated,
      }),
    );

    const searched = await controller.listSkills({ search: 'arch' });
    expect(searched).toHaveLength(1);
    expect(searched[0].id).toBe(created.id);

    await controller.deleteSkill(createRequest(actor), created.id);
    await expect(controller.getSkill(created.id)).resolves.toEqual(
      expect.objectContaining({ status: SkillStatus.Archived }),
    );
    await expect(controller.listSkills({})).resolves.toEqual([]);
    await expect(controller.listSkills({ includeArchived: true })).resolves.toHaveLength(1);
  });

  it('filters by category and excludes archived skills by default', async () => {
    const created = await controller.createSkill(createRequest(actor), createSkillDto());
    const other = await controller.createSkill(createRequest(actor), {
      category: 'Delivery',
      name: 'Stakeholder Management',
      status: SkillStatus.Active,
    });

    await controller.deleteSkill(createRequest(actor), created.id);

    await expect(
      controller.listSkills({ category: 'Delivery' }),
    ).resolves.toEqual([expect.objectContaining({ id: other.id })]);
  });

  it('throws when reading a missing skill', async () => {
    await expect(
      controller.getSkill('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects malformed UUIDs before reaching persistence', async () => {
    const created = await controller.createSkill(
      createRequest(actor),
      createSkillDto(),
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
      controller.getSkill('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow(NotFoundException);

    await expect(controller.getSkill(created.id)).resolves.toEqual(
      expect.objectContaining({ id: created.id, name: 'TypeScript' }),
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

function createSkillDto(): CreateSkillDto {
  return {
    category: 'Engineering',
    description: 'Typed language used across platform services',
    name: 'TypeScript',
    status: SkillStatus.Active,
  };
}

function createUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}
