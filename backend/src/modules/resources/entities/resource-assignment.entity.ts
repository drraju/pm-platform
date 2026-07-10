import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';
import { Resource } from './resource.entity';

@Entity({ name: 'enterprise_resource_assignments' })
export class ResourceAssignment extends AuditableEntity {
  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string | null;

  @Column({
    name: 'allocation_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  allocationPercent?: number | null;

  @Column({ name: 'planned_minutes_per_day', type: 'int', nullable: true })
  plannedMinutesPerDay?: number | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({
    type: 'varchar',
    default: ResourceAssignmentStatus.Draft,
  })
  status: ResourceAssignmentStatus;

  @ManyToOne(() => Resource, { nullable: false })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;
}
