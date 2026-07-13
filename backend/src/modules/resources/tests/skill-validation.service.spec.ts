import { BadRequestException, ConflictException } from '@nestjs/common';
import { SkillStatus } from '../enums/skill-status.enum';
import { SkillValidationService } from '../skill-validation.service';

describe('SkillValidationService', () => {
  let service: SkillValidationService;
  let skillsRepository: { createQueryBuilder: jest.Mock };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      where: jest.fn().mockReturnThis(),
    };
    skillsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    service = new SkillValidationService(skillsRepository as never);
  });

  it('accepts valid skill metadata', () => {
    expect(() =>
      service.validateCreateSkill({
        category: 'Engineering',
        description: 'Typed language used across services',
        name: 'TypeScript',
        status: SkillStatus.Active,
      }),
    ).not.toThrow();
  });

  it('rejects a blank skill name', () => {
    expect(() => service.validateCreateSkill({ name: '   ' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects unsupported status values', () => {
    expect(() =>
      service.validateUpdateSkill({ status: 'unsupported' as SkillStatus }),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicate active skill names', async () => {
    queryBuilder.getOne.mockResolvedValue({ id: 'skill-id' });

    await expect(
      service.ensureSkillNameIsUnique('TypeScript'),
    ).rejects.toThrow(ConflictException);
  });

  it('accepts unique active skill names', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.ensureSkillNameIsUnique('TypeScript'),
    ).resolves.toBeUndefined();
  });
});
