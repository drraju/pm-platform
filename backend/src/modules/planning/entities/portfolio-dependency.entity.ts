import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { Project } from '../../projects/entities/project.entity';

@Entity({ name: 'portfolio_dependencies' })
export class PortfolioDependency extends AuditableEntity {
  @Column({ name: 'predecessor_project_id', type: 'uuid' })
  predecessorProjectId: string;

  @Column({ name: 'successor_project_id', type: 'uuid' })
  successorProjectId: string;

  @Column({ name: 'dependency_type', type: 'varchar', length: 2 })
  dependencyType: TaskDependencyType;

  @Column({ name: 'lag_days', type: 'int', default: 0 })
  lagDays: number;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'predecessor_project_id' })
  predecessorProject: Project;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'successor_project_id' })
  successorProject: Project;
}
