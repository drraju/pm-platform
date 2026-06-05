import { Column } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { RaidType } from '../../../common/enums/raid-type.enum';

export abstract class RaidItem extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ type: 'enum', enum: RaidType })
  type: RaidType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string | null;

  @Column({ default: 'open' })
  status: string;
}
