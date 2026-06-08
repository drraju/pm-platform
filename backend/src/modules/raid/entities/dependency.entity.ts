import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { DependencyType } from '../../../common/enums/dependency-type.enum';
import { RaidType } from '../../../common/enums/raid-type.enum';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { RaidItem } from './raid-item.entity';

@Entity({ name: 'dependencies' })
export class Dependency extends RaidItem {
  type = RaidType.Dependency;

  @Column({ name: 'depends_on', type: 'text', nullable: true })
  dependsOn?: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'source_task_id', type: 'uuid', nullable: true })
  sourceTaskId?: string | null;

  @Column({ name: 'target_task_id', type: 'uuid', nullable: true })
  targetTaskId?: string | null;

  @Column({
    name: 'dependency_type',
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.FinishToStart,
  })
  dependencyType: DependencyType;

  @ManyToOne(() => Project, (project) => project.dependencies)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'source_task_id' })
  sourceTask?: Task | null;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'target_task_id' })
  targetTask?: Task | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;
}
