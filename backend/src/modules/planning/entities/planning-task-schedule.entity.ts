import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { PlanningScheduleSnapshot } from './planning-schedule-snapshot.entity';

@Entity({ name: 'planning_task_schedules' })
export class PlanningTaskSchedule extends AuditableEntity {
  @Column({ name: 'snapshot_id', type: 'uuid' })
  snapshotId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string | null;

  @Column({ name: 'task_kind', type: 'varchar', default: TaskKind.Standard })
  taskKind: TaskKind;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate?: string | null;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate?: string | null;

  @Column({ name: 'scheduled_start_date', type: 'date', nullable: true })
  scheduledStartDate?: string | null;

  @Column({ name: 'scheduled_end_date', type: 'date', nullable: true })
  scheduledEndDate?: string | null;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays?: number | null;

  @Column({ name: 'total_float_days', type: 'int', nullable: true })
  totalFloatDays?: number | null;

  @Column({ name: 'free_float_days', type: 'int', nullable: true })
  freeFloatDays?: number | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({
    name: 'percent_complete',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  percentComplete: number;

  @Column({ name: 'sequence_number', type: 'int', nullable: true })
  sequenceNumber?: number | null;

  @ManyToOne(() => PlanningScheduleSnapshot, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: PlanningScheduleSnapshot;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
