import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { SkillStatus } from '../enums/skill-status.enum';
import { SkillService } from '../skill.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('SkillService', () => {
  let service: SkillService;
  let skillsRepository: MockRepository<Skill>;
  let validationService: {
    ensureSkillNameIsUnique: jest.Mock;
    validateCreateSkill: jest.Mock;
    validateResolvedSkill: jest.Mock;
    validateUpdateSkill: jest.Mock;
  };

  beforeEach(() => {
    skillsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((input) => Promise.resolve({ id: 'skill-id', ...input })),
    };

    validationService = {
      ensureSkillNameIsUnique: jest.fn(),
      validateCreateSkill: jest.fn(),
      validateResolvedSkill: jest.fn(),
      validateUpdateSkill: jest.fn(),
    };

    service = new SkillService(
      skillsRepository as Repository<Skill>,
      validationService as never,
    );
  });

  it('creates a skill with default lifecycle state and audit metadata', async () => {
    await expect(
      service.createSkill(
        {
          category: 'Engineering',
          name: 'TypeScript',
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        category: 'Engineering',
        createdById: actor.userId,
        name: 'TypeScript',
        status: SkillStatus.Proposed,
        updatedById: actor.userId,
      }),
    );

    expect(validationService.validateCreateSkill).toHaveBeenCalledWith({
      category: 'Engineering',
      name: 'TypeScript',
    });
    expect(validationService.ensureSkillNameIsUnique).toHaveBeenCalledWith(
      'TypeScript',
    );
  });

  it('archives a skill without deleting it', async () => {
    skillsRepository.findOne?.mockResolvedValue({
      id: 'skill-id',
      status: SkillStatus.Active,
    });

    await expect(service.archiveSkill('skill-id', actor)).resolves.toEqual(
      expect.objectContaining({
        status: SkillStatus.Archived,
        updatedById: actor.userId,
      }),
    );
  });

  it('lists non-archived skills by default', async () => {
    skillsRepository.find?.mockResolvedValue([]);

    await service.listSkills();

    expect(skillsRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { createdAt: 'ASC', name: 'ASC' },
        where: expect.objectContaining({ status: expect.any(Object) }),
      }),
    );
  });

  it('throws when the skill is missing', async () => {
    skillsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findSkill('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('propagates duplicate name conflicts during update', async () => {
    validationService.ensureSkillNameIsUnique.mockRejectedValue(
      new ConflictException('Skill name already exists'),
    );

    await expect(
      service.updateSkill('skill-id', { name: 'TypeScript' }),
    ).rejects.toThrow(ConflictException);
  });
});
