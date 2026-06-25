import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ResourceAllocationUnit } from '../../../common/enums/resource-allocation-unit.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'resource_capacities' })
export class ResourceCapacity extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ name: 'resource_unit', type: 'varchar' })
  resourceUnit: ResourceAllocationUnit;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'team_name', type: 'varchar', nullable: true })
  teamName?: string | null;

  @Column({ name: 'capacity_date', type: 'date' })
  capacityDate: string;

  @Column({ name: 'capacity_minutes', type: 'int', default: 480 })
  capacityMinutes: number;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone: string;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;
}
