import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'raid_history_entries' })
export class RaidHistoryEntry extends AuditableEntity {
  @Column({ name: 'raid_item_id', type: 'uuid' })
  raidItemId: string;

  @Column({ name: 'raid_type', type: 'enum', enum: RaidType })
  raidType: RaidType;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column()
  action: string;

  @Column({ name: 'field_name', nullable: true })
  fieldName?: string | null;

  @Column({ name: 'previous_value', type: 'text', nullable: true })
  previousValue?: string | null;

  @Column({ name: 'next_value', type: 'text', nullable: true })
  nextValue?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  changes?: Record<string, { previousValue: string | null; nextValue: string | null }> | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: User | null;
}
