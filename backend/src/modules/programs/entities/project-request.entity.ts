import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'project_requests' })
export class ProjectRequest extends BaseEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column()
  name: string;

  @Column({ name: 'target_finish', type: 'date', nullable: true })
  targetFinish?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ default: 'open' })
  status: 'open' | 'closed';

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @Column({ name: 'requested_by_id', type: 'uuid', nullable: true })
  requestedById?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy?: User | null;
}
