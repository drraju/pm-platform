import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { RaidItem } from './raid-item.entity';

@Entity({ name: 'dependencies' })
export class Dependency extends RaidItem {
  type = RaidType.Dependency;

  @Column({ name: 'depends_on', type: 'text', nullable: true })
  dependsOn?: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @ManyToOne(() => Project, (project) => project.dependencies)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;
}
