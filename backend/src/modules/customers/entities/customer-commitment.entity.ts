import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity';
import { Project } from '../../projects/entities/project.entity';
import { Customer } from './customer.entity';

export const commitmentStatuses = ['open', 'accepted', 'dismissed'] as const;

export type CommitmentStatus = (typeof commitmentStatuses)[number];

@Entity({ name: 'customer_commitments' })
export class CustomerCommitment extends TimestampedEntity {
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'text' })
  title: string;

  @Column({ name: 'due_date', nullable: true, type: 'date' })
  dueDate: string | null;

  @Column({ default: 'open', length: 32 })
  status: CommitmentStatus;
}
