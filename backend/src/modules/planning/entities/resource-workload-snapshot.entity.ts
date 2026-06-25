import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ResourceAllocationUnit } from '../../../common/enums/resource-allocation-unit.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'resource_workload_snapshots' })
export class ResourceWorkloadSnapshot extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ name: 'resource_unit', type: 'varchar' })
  resourceUnit: ResourceAllocationUnit;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'team_name', type: 'varchar', nullable: true })
  teamName?: string | null;

  @Column({ name: 'workload_date', type: 'date' })
  workloadDate: string;

  @Column({ name: 'capacity_minutes', type: 'int', default: 0 })
  capacityMinutes: number;

  @Column({ name: 'allocated_minutes', type: 'int', default: 0 })
  allocatedMinutes: number;

  @Column({ name: 'is_overallocated', type: 'boolean', default: false })
  isOverallocated: boolean;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;
}
