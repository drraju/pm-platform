import { ResourceSkill } from '../entities/resource-skill.entity';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';
import { ResourceSkillMapper } from '../resource-skill.mapper';

describe('ResourceSkillMapper', () => {
  it('maps create command to entity', () => {
    const resourceSkill = ResourceSkillMapper.fromCreateCommand({
      monthsExperience: 6,
      notes: 'Applied in ERM workstreams',
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      yearsExperience: 5,
    });

    expect(resourceSkill).toMatchObject({
      monthsExperience: 6,
      notes: 'Applied in ERM workstreams',
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      yearsExperience: 5,
    });
  });

  it('maps update command without mutating unrelated fields', () => {
    const existing = Object.assign(new ResourceSkill(), {
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      id: 'resource-skill-id',
      monthsExperience: 3,
      notes: 'Original notes',
      proficiencyLevel: SkillProficiencyLevel.Intermediate,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      updatedAt: new Date('2026-07-10T00:00:00.000Z'),
      yearsExperience: 2,
    });

    const updated = ResourceSkillMapper.fromUpdateCommand(existing, {
      monthsExperience: 6,
      notes: null,
      proficiencyLevel: SkillProficiencyLevel.Advanced,
    });

    expect(updated).toMatchObject({
      monthsExperience: 6,
      notes: null,
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
    });
    expect(existing.monthsExperience).toBe(3);
    expect(existing.notes).toBe('Original notes');
  });

  it('maps entity to response dto', () => {
    const resourceSkill = Object.assign(new ResourceSkill(), {
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      id: 'resource-skill-id',
      monthsExperience: 6,
      notes: 'Applied in ERM workstreams',
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
      yearsExperience: 5,
    });

    expect(ResourceSkillMapper.toResponse(resourceSkill)).toMatchObject({
      id: 'resource-skill-id',
      monthsExperience: 6,
      notes: 'Applied in ERM workstreams',
      proficiencyLevel: SkillProficiencyLevel.Advanced,
      resourceId: 'resource-id',
      skillId: 'skill-id',
      status: ResourceSkillStatus.Active,
      yearsExperience: 5,
    });
  });
});
