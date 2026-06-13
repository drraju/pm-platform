import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'raid_comments' })
export class RaidComment extends AuditableEntity {
  @Column({ name: 'raid_item_id', type: 'uuid' })
  raidItemId: string;

  @Column({ name: 'raid_type', type: 'enum', enum: RaidType })
  raidType: RaidType;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string | null;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'author_id' })
  author?: User | null;
}
