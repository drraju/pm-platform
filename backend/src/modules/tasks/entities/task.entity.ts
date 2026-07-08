import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'tasks' })
export class Task extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.Backlog })
  status: TaskStatus;

  @Column({ default: 'medium' })
  priority: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ name: 'task_kind', type: 'varchar', default: TaskKind.Standard })
  taskKind: TaskKind;

  @Column({
    name: 'milestone_category',
    type: 'varchar',
    nullable: true,
  })
  milestoneCategory?: MilestoneCategory | null;

  @Column({ name: 'percent_complete', type: 'int', default: 0 })
  percentComplete: number;

  @Column({ name: 'sequence_number', type: 'int', nullable: true })
  sequenceNumber?: number | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate?: string | null;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate?: string | null;

  @Column({ name: 'actual_start_date', type: 'date', nullable: true })
  actualStartDate?: string | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate?: string | null;

  @Column({
    name: 'estimated_hours',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimatedHours?: number | null;

  @Column({
    name: 'remaining_hours',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  remainingHours?: number | null;

  phaseProgress?: number | null;

  phaseStartDate?: string | null;

  phaseEndDate?: string | null;

  childTaskCount?: number;

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;
}
