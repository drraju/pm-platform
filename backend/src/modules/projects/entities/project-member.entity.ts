import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { ProjectVisibilityLevel } from '../../../common/enums/project-visibility-level.enum';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

@Entity({ name: 'project_members' })
@Unique(['projectId', 'userId'])
export class ProjectMember extends AuditableEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.Contributor })
  role: ProjectRole;

  @Column({
    name: 'visibility_level',
    type: 'enum',
    enum: ProjectVisibilityLevel,
    default: ProjectVisibilityLevel.Internal,
  })
  visibilityLevel: ProjectVisibilityLevel;

  @ManyToOne(() => Project, (project) => project.members)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, (user) => user.projectMemberships)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
