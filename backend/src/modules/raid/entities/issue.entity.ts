import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { RaidItem } from './raid-item.entity';

@Entity({ name: 'issues' })
export class Issue extends RaidItem {
  type = RaidType.Issue;

  @Column({ default: 'medium' })
  severity: string;

  @Column({ name: 'resolution_plan', type: 'text', nullable: true })
  resolutionPlan?: string | null;

  @ManyToOne(() => Project, (project) => project.issues)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;
}
