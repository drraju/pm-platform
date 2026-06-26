import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';

@Entity({ name: 'portfolio_dependencies' })
export class PortfolioDependency extends AuditableEntity {
  @Column({ name: 'predecessor_project_id', type: 'uuid' })
  predecessorProjectId: string;

  @Column({ name: 'successor_project_id', type: 'uuid' })
  successorProjectId: string;

  @Column({ name: 'predecessor_task_id', type: 'uuid', nullable: true })
  predecessorTaskId?: string | null;

  @Column({ name: 'successor_task_id', type: 'uuid', nullable: true })
  successorTaskId?: string | null;

  @Column({ name: 'dependency_type', type: 'varchar', length: 2 })
  dependencyType: TaskDependencyType;

  @Column({ name: 'lag_days', type: 'int', default: 0 })
  lagDays: number;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'predecessor_project_id' })
  predecessorProject: Project;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'successor_project_id' })
  successorProject: Project;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'predecessor_task_id' })
  predecessorTask?: Task | null;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'successor_task_id' })
  successorTask?: Task | null;
}
