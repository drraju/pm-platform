import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { SkillProficiencyLevel } from '../enums/skill-proficiency-level.enum';
import { ResourceSkillStatus } from '../enums/resource-skill-status.enum';
import { Resource } from './resource.entity';
import { Skill } from './skill.entity';

@Entity({ name: 'enterprise_resource_skills' })
export class ResourceSkill extends AuditableEntity {
  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId: string;

  @Column({ name: 'proficiency_level', type: 'varchar' })
  proficiencyLevel: SkillProficiencyLevel;

  @Column({ name: 'years_experience', type: 'int', nullable: true })
  yearsExperience?: number | null;

  @Column({ name: 'months_experience', type: 'int', nullable: true })
  monthsExperience?: number | null;

  @Column({
    type: 'varchar',
    default: ResourceSkillStatus.Draft,
  })
  status: ResourceSkillStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @ManyToOne(() => Resource, (resource) => resource.resourceSkills, {
    nullable: false,
  })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @ManyToOne(() => Skill, (skill) => skill.resourceSkills, {
    nullable: false,
  })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;
}
