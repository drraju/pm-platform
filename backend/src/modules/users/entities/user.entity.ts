import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { Notification } from '../../notifications/entities/notification.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Role } from './role.entity';

@Entity({ name: 'users' })
export class User extends TimestampedEntity {
  @Column({ unique: true })
  email: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt?: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Column({
    default: UserIdentityType.Human,
    enum: UserIdentityType,
    enumName: 'user_identity_type',
    name: 'identity_type',
    type: 'enum',
  })
  identityType: UserIdentityType;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ default: 'active' })
  status: string;

  @Column({
    default: () => "'[]'::jsonb",
    name: 'account_history',
    type: 'jsonb',
  })
  accountHistory: UserAccountHistoryEntry[];

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToMany(() => ProjectMember, (member) => member.user)
  projectMemberships: ProjectMember[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}

export type UserAccountHistoryEntry = {
  action: string;
  administratorId: string;
  timestamp: string;
};
