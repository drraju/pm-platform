import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { Project } from '../../projects/entities/project.entity';
import { PlanningTaskSchedule } from './planning-task-schedule.entity';

@Entity({ name: 'planning_schedule_snapshots' })
export class PlanningScheduleSnapshot extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'schedule_version', type: 'int' })
  scheduleVersion: number;

  @Column({
    name: 'calculation_status',
    type: 'varchar',
    default: PlanningCalculationStatus.Pending,
  })
  calculationStatus: PlanningCalculationStatus;

  @Column({ name: 'calculated_at', type: 'timestamptz', nullable: true })
  calculatedAt?: Date | null;

  @Column({ name: 'schedule_anchor_date', type: 'date', nullable: true })
  scheduleAnchorDate?: string | null;

  @Column({ name: 'project_start_date', type: 'date', nullable: true })
  projectStartDate?: string | null;

  @Column({ name: 'project_finish_date', type: 'date', nullable: true })
  projectFinishDate?: string | null;

  @Column({
    name: 'project_completion_percent',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  projectCompletionPercent: number;

  @Column({
    name: 'critical_path_task_ids',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  criticalPathTaskIds: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(
    () => PlanningTaskSchedule,
    (taskSchedule) => taskSchedule.snapshot,
  )
  taskSchedules?: PlanningTaskSchedule[];
}
