import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { RaidItem } from './raid-item.entity';

@Entity({ name: 'assumptions' })
export class Assumption extends RaidItem {
  type = RaidType.Assumption;

  @Column({ name: 'validation_status', default: 'unvalidated' })
  validationStatus: string;

  @Column({ name: 'validation_notes', type: 'text', nullable: true })
  validationNotes?: string | null;

  @ManyToOne(() => Project, (project) => project.assumptions)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;
}
