import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ResourceCapacityPolicyStatus } from '../enums/resource-capacity-policy-status.enum';
import { Resource } from './resource.entity';

@Entity({ name: 'enterprise_resource_capacity_policies' })
export class ResourceCapacityPolicy extends AuditableEntity {
  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'capacity_minutes_per_working_day', type: 'int' })
  capacityMinutesPerWorkingDay: number;

  @Column({ name: 'effective_start_date', type: 'date' })
  effectiveStartDate: string;

  @Column({ name: 'effective_end_date', type: 'date', nullable: true })
  effectiveEndDate?: string | null;

  @Column({
    type: 'varchar',
    default: ResourceCapacityPolicyStatus.Draft,
  })
  status: ResourceCapacityPolicyStatus;

  @ManyToOne(() => Resource, { nullable: false })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;
}
