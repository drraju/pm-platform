import { Column, Entity, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { SkillStatus } from '../enums/skill-status.enum';
import { ResourceSkill } from './resource-skill.entity';

@Entity({ name: 'enterprise_skills' })
export class Skill extends AuditableEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  category?: string | null;

  @Column({
    type: 'varchar',
    default: SkillStatus.Proposed,
  })
  status: SkillStatus;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => ResourceSkill, (resourceSkill) => resourceSkill.skill)
  resourceSkills: ResourceSkill[];
}
