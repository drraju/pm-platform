import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ResourceAvailabilityOverrideType } from '../enums/resource-availability-override-type.enum';
import { Resource } from './resource.entity';

@Entity({ name: 'enterprise_resource_availability_overrides' })
export class ResourceAvailabilityOverride extends AuditableEntity {
  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'override_type', type: 'varchar' })
  overrideType: ResourceAvailabilityOverrideType;

  @Column({
    name: 'available_minutes_per_working_day',
    type: 'int',
    nullable: true,
  })
  availableMinutesPerWorkingDay?: number | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @ManyToOne(() => Resource, { nullable: false })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;
}
