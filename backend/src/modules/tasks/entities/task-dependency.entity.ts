import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { Task } from './task.entity';

@Entity({ name: 'task_dependencies' })
export class TaskDependency extends AuditableEntity {
  @Column({ name: 'predecessor_task_id', type: 'uuid' })
  predecessorTaskId: string;

  @Column({ name: 'successor_task_id', type: 'uuid' })
  successorTaskId: string;

  @Column({ name: 'dependency_type', type: 'varchar', length: 2 })
  dependencyType: TaskDependencyType;

  @Column({ name: 'lag_days', type: 'int', default: 0 })
  lagDays: number;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: 'predecessor_task_id' })
  predecessorTask: Task;

  @ManyToOne(() => Task, { nullable: false })
  @JoinColumn({ name: 'successor_task_id' })
  successorTask: Task;
}
