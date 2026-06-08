import { Column, Entity, ManyToMany } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Role } from './role.entity';

@Entity({ name: 'permissions' })
export class Permission extends AuditableEntity {
  @Column({ unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ default: 'Administration' })
  category: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
