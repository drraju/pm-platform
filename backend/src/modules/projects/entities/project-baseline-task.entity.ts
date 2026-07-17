import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { Task } from '../../tasks/entities/task.entity';
import { Project } from './project.entity';
import { ProjectBaseline } from './project-baseline.entity';

@Entity({ name: 'project_baseline_tasks' })
export class ProjectBaselineTask extends AuditableEntity {
  @Column({ name: 'project_baseline_id', type: 'uuid' })
  projectBaselineId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string | null;

  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string | null;

  @Column({ name: 'task_title' })
  taskTitle: string;

  @Column({ name: 'task_kind', type: 'varchar', default: TaskKind.Standard })
  taskKind: TaskKind;

  @Column({ name: 'milestone_category', type: 'varchar', nullable: true })
  milestoneCategory?: MilestoneCategory | null;

  @Column({ name: 'sequence_number', type: 'int', nullable: true })
  sequenceNumber?: number | null;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate?: string | null;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate?: string | null;

  @Column({
    name: 'estimated_hours',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimatedHours?: number | null;

  @Column({ name: 'percent_complete', type: 'int', nullable: true })
  percentComplete?: number | null;

  @ManyToOne(() => ProjectBaseline, { nullable: false })
  @JoinColumn({ name: 'project_baseline_id' })
  projectBaseline: ProjectBaseline;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;
}
