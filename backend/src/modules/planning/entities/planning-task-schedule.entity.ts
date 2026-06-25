import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { ScheduleSnapshot } from './schedule-snapshot.entity';

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

  @Column({ name: 'task_title' })
  taskTitle: string;

  @Column({ name: 'task_kind', type: 'varchar', default: TaskKind.Standard })
  taskKind: TaskKind;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string | null;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate?: string | null;

  @Column({ name: 'planned_finish_date', type: 'date', nullable: true })
  plannedFinishDate?: string | null;

  @Column({ name: 'duration_days', type: 'int', default: 0 })
  durationDays: number;

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

  @Column({ name: 'total_float_days', type: 'int', nullable: true })
  totalFloatDays?: number | null;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @ManyToOne(() => ScheduleSnapshot, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: ScheduleSnapshot;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
