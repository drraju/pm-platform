import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export abstract class AuditableEntity extends BaseEntity {
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById?: string | null;

  @Column({ name: 'deleted_by_id', type: 'uuid', nullable: true })
  deletedById?: string | null;
}
