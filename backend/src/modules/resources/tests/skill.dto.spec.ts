import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSkillDto, QuerySkillsDto, UpdateSkillDto } from '../dto/skill.dto';
import { SkillStatus } from '../enums/skill-status.enum';

describe('Skill DTO validation', () => {
  it('accepts a valid create skill payload', async () => {
    const dto = plainToInstance(CreateSkillDto, {
      category: 'Engineering',
      description: 'Typed language used across platform services',
      name: 'TypeScript',
      status: SkillStatus.Active,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid enum values', async () => {
    const dto = plainToInstance(CreateSkillDto, {
      name: 'TypeScript',
      status: 'unsupported',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['status']),
    );
  });

  it('accepts partial update payloads', async () => {
    const dto = plainToInstance(UpdateSkillDto, {
      description: 'Updated description',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('transforms and validates supported query filters', async () => {
    const dto = plainToInstance(QuerySkillsDto, {
      category: 'Engineering',
      includeArchived: 'true',
      search: 'type',
      status: SkillStatus.Deprecated,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.includeArchived).toBe(true);
  });

  it('rejects invalid query values', async () => {
    const dto = plainToInstance(QuerySkillsDto, {
      includeArchived: 'maybe',
      status: 'unsupported',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['includeArchived', 'status']),
    );
  });
});
