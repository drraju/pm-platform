import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

@Entity({ name: 'project_members' })
@Index('idx_project_members_active_project_user_unique', ['projectId', 'userId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class ProjectMember extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.Contributor })
  role: ProjectRole;

  @ManyToOne(() => Project, (project) => project.members)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (user) => user.projectMemberships)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
