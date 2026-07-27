import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from './task.entity';

@Entity({ name: 'task_execution_updates' })
export class TaskExecutionUpdate extends AuditableEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 50 })
  status: TaskStatus;

  @Column({ type: 'varchar', length: 20 })
  priority: string;

  @Column({ name: 'percent_complete', type: 'int' })
  percentComplete: number;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @Column({ name: 'next_step', type: 'text', nullable: true })
  nextStep?: string | null;

  @Column({ name: 'next_action_owner_id', type: 'uuid', nullable: true })
  nextActionOwnerId?: string | null;

  @Column({ name: 'target_completion_date', type: 'date', nullable: true })
  targetCompletionDate?: string | null;

  @Column({ name: 'update_notes', type: 'text', nullable: true })
  updateNotes?: string | null;

  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes?: Record<
    string,
    { previousValue: string | number | null; nextValue: string | number | null }
  > | null;

  @ManyToOne(() => Task, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'next_action_owner_id' })
  nextActionOwner?: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy?: User | null;
}
