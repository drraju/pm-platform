import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Dependency } from '../../raid/entities/dependency.entity';
import { Issue } from '../../raid/entities/issue.entity';
import { Risk } from '../../raid/entities/risk.entity';
import { Assumption } from '../../raid/entities/assumption.entity';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from './project-member.entity';

@Entity({ name: 'projects' })
export class Project extends AuditableEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'target_end_date', type: 'date', nullable: true })
  targetEndDate?: string | null;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner?: User | null;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @OneToMany(() => Risk, (risk) => risk.project)
  risks: Risk[];

  @OneToMany(() => Issue, (issue) => issue.project)
  issues: Issue[];

  @OneToMany(() => Assumption, (assumption) => assumption.project)
  assumptions: Assumption[];

  @OneToMany(() => Dependency, (dependency) => dependency.project)
  dependencies: Dependency[];
}
