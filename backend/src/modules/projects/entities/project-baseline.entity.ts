import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

@Entity({ name: 'project_baselines' })
export class ProjectBaseline extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column()
  name: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ default: 'approved' })
  status: string;

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;

  @Column({ name: 'captured_by_id', type: 'uuid' })
  capturedById: string;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'captured_by_id' })
  capturedBy?: User;
}
