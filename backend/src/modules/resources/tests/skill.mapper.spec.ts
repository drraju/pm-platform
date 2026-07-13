import { Skill } from '../entities/skill.entity';
import { SkillStatus } from '../enums/skill-status.enum';
import { SkillMapper } from '../skill.mapper';

describe('SkillMapper', () => {
  it('maps create command to entity', () => {
    const skill = SkillMapper.fromCreateCommand({
      category: 'Engineering',
      description: 'Typed language used across services',
      name: 'TypeScript',
      status: SkillStatus.Active,
    });

    expect(skill).toMatchObject({
      category: 'Engineering',
      description: 'Typed language used across services',
      name: 'TypeScript',
      status: SkillStatus.Active,
    });
  });

  it('maps update command without mutating unrelated fields', () => {
    const existing = Object.assign(new Skill(), {
      category: 'Engineering',
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      description: 'Original description',
      id: 'skill-id',
      name: 'TypeScript',
      status: SkillStatus.Active,
      updatedAt: new Date('2026-07-10T00:00:00.000Z'),
    });

    const updated = SkillMapper.fromUpdateCommand(existing, {
      category: null,
      description: 'Updated description',
    });

    expect(updated).toMatchObject({
      category: null,
      description: 'Updated description',
      name: 'TypeScript',
    });
    expect(existing.category).toBe('Engineering');
    expect(existing.description).toBe('Original description');
  });

  it('maps entity to response dto', () => {
    const skill = Object.assign(new Skill(), {
      category: 'Engineering',
      createdAt: new Date('2026-07-10T00:00:00.000Z'),
      description: 'Typed language used across services',
      id: 'skill-id',
      name: 'TypeScript',
      status: SkillStatus.Active,
      updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    });

    expect(SkillMapper.toResponse(skill)).toMatchObject({
      category: 'Engineering',
      description: 'Typed language used across services',
      id: 'skill-id',
      name: 'TypeScript',
      status: SkillStatus.Active,
    });
  });
});
