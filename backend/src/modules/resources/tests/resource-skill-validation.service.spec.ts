import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';
import { ResourceSkillValidationService } from '../resource-skill-validation.service';

describe('ResourceSkillValidationService', () => {
  let service: ResourceSkillValidationService;
  let resourceSkillsRepository: { findOne: jest.Mock };
  let resourcesRepository: { findOne: jest.Mock };
  let skillsRepository: { findOne: jest.Mock };

  beforeEach(() => {
    resourceSkillsRepository = { findOne: jest.fn() };
    resourcesRepository = { findOne: jest.fn() };
    skillsRepository = { findOne: jest.fn() };

    service = new ResourceSkillValidationService(
      resourceSkillsRepository as never,
      resourcesRepository as never,
      skillsRepository as never,
    );
  });

  it('accepts a valid create resource skill input', async () => {
    resourcesRepository.findOne.mockResolvedValue({ id: 'resource-id' });
    skillsRepository.findOne.mockResolvedValue({ id: 'skill-id' });

    await expect(
      service.validateCreateResourceSkill({
        monthsExperience: 6,
        notes: 'Applied on ERM workstreams',
        proficiencyLevel: SkillProficiencyLevel.Advanced,
        resourceId: 'resource-id',
        skillId: 'skill-id',
        status: ResourceSkillStatus.Active,
        yearsExperience: 5,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects invalid proficiency and status values', async () => {
    await expect(
      service.validateUpdateResourceSkill({
        proficiencyLevel: 'unsupported' as SkillProficiencyLevel,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validateUpdateResourceSkill({
        status: 'unsupported' as ResourceSkillStatus,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid experience values', async () => {
    await expect(
      service.validateUpdateResourceSkill({
        monthsExperience: 12,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validateUpdateResourceSkill({
        yearsExperience: -1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing related records', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.validateCreateResourceSkill({
        proficiencyLevel: SkillProficiencyLevel.Beginner,
        resourceId: 'resource-id',
        skillId: 'skill-id',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects duplicate active resource skills', async () => {
    resourceSkillsRepository.findOne.mockResolvedValue({
      id: 'resource-skill-id',
      status: ResourceSkillStatus.Archived,
    });

    await expect(
      service.ensureResourceSkillNotDuplicated({
        resourceId: 'resource-id',
        skillId: 'skill-id',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
