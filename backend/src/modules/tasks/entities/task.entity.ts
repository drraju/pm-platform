import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'tasks' })
export class Task extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

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

  @Column({ name: 'percent_complete', type: 'int', default: 0 })
  percentComplete: number;

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

  @ManyToOne(() => Project, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;
}
