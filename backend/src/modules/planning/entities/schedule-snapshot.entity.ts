import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Project } from '../../projects/entities/project.entity';
import { PlanningTaskSchedule } from './planning-task-schedule.entity';

@Entity({ name: 'schedule_snapshots' })
export class ScheduleSnapshot extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

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

  @Column({ name: 'calculated_at', type: 'timestamptz', nullable: true })
  calculatedAt?: Date | null;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(
    () => PlanningTaskSchedule,
    (taskSchedule) => taskSchedule.snapshot,
  )
  taskSchedules?: PlanningTaskSchedule[];
}
