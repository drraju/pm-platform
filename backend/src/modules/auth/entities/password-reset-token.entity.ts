import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'password_reset_tokens' })
@Unique('UQ_password_reset_tokens_token_hash', ['tokenHash'])
@Index('IDX_password_reset_tokens_user_active', ['userId', 'expiresAt'])
export class PasswordResetToken extends TimestampedEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 64, name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @Column({ length: 64, name: 'created_ip', nullable: true })
  createdIp?: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
