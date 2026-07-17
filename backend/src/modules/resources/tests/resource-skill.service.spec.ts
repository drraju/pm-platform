import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ResourceSkill } from '../entities/resource-skill.entity';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';
import { ResourceSkillService } from '../resource-skill.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  manager: {
    findOne: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
    transaction: jest.Mock;
  };
};

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('ResourceSkillService', () => {
  let service: ResourceSkillService;
  let resourceSkillsRepository: MockRepository<ResourceSkill>;
  let validationService: {
    ensureResourceExists: jest.Mock;
    ensureResourceSkillNotDuplicated: jest.Mock;
    ensureSkillExists: jest.Mock;
    validateResolvedResourceSkill: jest.Mock;
  };

  const existingResourceSkill = Object.assign(new ResourceSkill(), {
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    id: 'resource-skill-id',
    monthsExperience: 6,
    notes: 'Applied in ERM workstreams',
    proficiencyLevel: SkillProficiencyLevel.Advanced,
    resourceId: 'resource-id',
    skillId: 'skill-id',
    status: ResourceSkillStatus.Active,
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
    yearsExperience: 5,
  });

  beforeEach(() => {
    resourceSkillsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(async (_entity, input) => input),
        softRemove: jest.fn(async (_entity, input) => input),
        transaction: jest.fn(async (callback) =>
          callback(resourceSkillsRepository.manager),
        ),
      },
    };

    validationService = {
      ensureResourceExists: jest.fn(),
      ensureResourceSkillNotDuplicated: jest.fn(),
      ensureSkillExists: jest.fn(),
      validateResolvedResourceSkill: jest.fn(),
    };

    service = new ResourceSkillService(
      resourceSkillsRepository as Repository<ResourceSkill>,
      validationService as never,
    );
  });

  it('creates a resource skill in a transaction with audit metadata', async () => {
    const input = {
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      yearsExperience: 5,
    };

    const created = await service.createResourceSkill(input, actor);

    expect(resourceSkillsRepository.manager.transaction).toHaveBeenCalled();
    expect(
      validationService.validateResolvedResourceSkill,
    ).toHaveBeenCalledWith(input, resourceSkillsRepository.manager);
    expect(
      validationService.ensureResourceSkillNotDuplicated,
    ).toHaveBeenCalledWith(input, undefined, resourceSkillsRepository.manager);
    expect(created).toEqual(
      expect.objectContaining({
        createdById: actor.userId,
        proficiencyLevel: SkillProficiencyLevel.Advanced,
        resourceId: 'resource-id',
        skillId: 'skill-id',
        updatedById: actor.userId,
      }),
    );
  });

  it('updates a resource skill using merged state validation', async () => {
    resourceSkillsRepository.manager.findOne.mockResolvedValue(
      existingResourceSkill,
    );

    const updated = await service.updateResourceSkill(
      existingResourceSkill.id,
      {
        monthsExperience: 8,
        notes: null,
      },
      actor,
    );

    expect(
      validationService.validateResolvedResourceSkill,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        monthsExperience: 8,
        notes: null,
        proficiencyLevel: SkillProficiencyLevel.Advanced,
      }),
      resourceSkillsRepository.manager,
    );
    expect(
      validationService.ensureResourceSkillNotDuplicated,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: existingResourceSkill.resourceId,
        skillId: existingResourceSkill.skillId,
      }),
      existingResourceSkill.id,
      resourceSkillsRepository.manager,
    );
    expect(updated).toEqual(
      expect.objectContaining({
        monthsExperience: 8,
        notes: null,
        updatedById: actor.userId,
      }),
    );
  });

  it('soft deletes a resource skill in a transaction', async () => {
    resourceSkillsRepository.manager.findOne.mockResolvedValue(
      existingResourceSkill,
    );

    await service.removeResourceSkill(existingResourceSkill.id, actor);

    expect(resourceSkillsRepository.manager.transaction).toHaveBeenCalled();
    expect(resourceSkillsRepository.manager.save).toHaveBeenCalledWith(
      ResourceSkill,
      expect.objectContaining({
        deletedById: actor.userId,
        updatedById: actor.userId,
      }),
    );
    expect(resourceSkillsRepository.manager.softRemove).toHaveBeenCalledWith(
      ResourceSkill,
      expect.objectContaining({ id: existingResourceSkill.id }),
    );
  });

  it('lists resource skills by resource after validating resource existence', async () => {
    resourceSkillsRepository.find?.mockResolvedValue([existingResourceSkill]);

    await expect(
      service.getResourceSkillsByResource(existingResourceSkill.resourceId),
    ).resolves.toEqual([existingResourceSkill]);

    expect(validationService.ensureResourceExists).toHaveBeenCalledWith(
      existingResourceSkill.resourceId,
    );
    expect(resourceSkillsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      where: { resourceId: existingResourceSkill.resourceId },
    });
  });

  it('lists resource skills by skill after validating skill existence', async () => {
    resourceSkillsRepository.find?.mockResolvedValue([existingResourceSkill]);

    await expect(
      service.getResourceSkillsBySkill(existingResourceSkill.skillId),
    ).resolves.toEqual([existingResourceSkill]);

    expect(validationService.ensureSkillExists).toHaveBeenCalledWith(
      existingResourceSkill.skillId,
    );
    expect(resourceSkillsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'ASC' },
      where: { skillId: existingResourceSkill.skillId },
    });
  });

  it('throws when updating a missing resource skill', async () => {
    resourceSkillsRepository.manager.findOne.mockResolvedValue(null);

    await expect(
      service.updateResourceSkill('missing-resource-skill-id', {}),
    ).rejects.toThrow(NotFoundException);
  });
});
