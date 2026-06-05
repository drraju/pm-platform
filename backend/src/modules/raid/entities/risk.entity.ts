import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { RaidItem } from './raid-item.entity';

@Entity({ name: 'risks' })
export class Risk extends RaidItem {
  type = RaidType.Risk;

  @Column({ default: 'medium' })
  probability: string;

  @Column({ default: 'medium' })
  impact: string;

  @Column({ name: 'mitigation_plan', type: 'text', nullable: true })
  mitigationPlan?: string | null;

  @ManyToOne(() => Project, (project) => project.risks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;
}
