import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { User } from '../../users/entities/user.entity';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';

@Entity({ name: 'enterprise_resources' })
export class Resource extends AuditableEntity {
  @Column()
  name: string;

  @Column({ name: 'resource_type', type: 'varchar' })
  resourceType: ResourceType;

  @Column({ type: 'varchar', default: ResourceStatus.Draft })
  status: ResourceStatus;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'role_name', type: 'varchar', nullable: true })
  roleName?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;
}
