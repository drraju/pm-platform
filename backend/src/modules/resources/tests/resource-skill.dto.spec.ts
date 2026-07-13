import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateResourceSkillDto,
  QueryResourceSkillsDto,
  UpdateResourceSkillDto,
} from '../dto/resource-skill.dto';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';

describe('ResourceSkill DTO validation', () => {
  it('accepts a valid create resource skill payload', async () => {
    const dto = plainToInstance(CreateResourceSkillDto, {
      monthsExperience: 6,
      notes: 'Applied on ERM and planning features',
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      skillId: '3e9e5d92-b2e4-4f13-9d66-c8b39536bb4d',
      status: ResourceSkillStatus.Active,
      yearsExperience: 5,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts partial update payloads', async () => {
    const dto = plainToInstance(UpdateResourceSkillDto, {
      notes: 'Updated notes',
      status: ResourceSkillStatus.Archived,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid uuids, enums, and experience values', async () => {
    const dto = plainToInstance(CreateResourceSkillDto, {
      monthsExperience: 12,
      proficiencyLevel: 'unsupported',
      resourceId: 'invalid-resource',
      skillId: 'invalid-skill',
      status: 'invalid-status',
      yearsExperience: -1,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'monthsExperience',
        'proficiencyLevel',
        'resourceId',
        'skillId',
        'status',
        'yearsExperience',
      ]),
    );
  });

  it('transforms and validates supported query filters', async () => {
    const dto = plainToInstance(QueryResourceSkillsDto, {
      includeArchived: 'false',
      proficiencyLevel: SkillProficiencyLevel.Intermediate,
      resourceId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
      skillId: '3e9e5d92-b2e4-4f13-9d66-c8b39536bb4d',
      status: ResourceSkillStatus.Active,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.includeArchived).toBe(false);
  });
});
