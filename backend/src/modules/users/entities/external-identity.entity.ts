import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity';
import { ExternalIdentityProvider } from '../../../common/enums/external-identity-provider.enum';
import { User } from './user.entity';

@Entity({ name: 'external_identities' })
@Check(
  'chk_external_identities_provider',
  `"provider" IN ('${ExternalIdentityProvider.Google}')`,
)
@Unique('uq_external_identities_issuer_subject', ['issuer', 'subject'])
@Unique('uq_external_identities_user_provider', ['userId', 'provider'])
export class ExternalIdentity extends TimestampedEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 50, type: 'varchar' })
  provider: ExternalIdentityProvider;

  @Column({ length: 255, type: 'varchar' })
  issuer: string;

  @Column({ length: 255, type: 'varchar' })
  subject: string;

  @Column({
    length: 255,
    name: 'email_at_last_authentication',
    type: 'varchar',
  })
  emailAtLastAuthentication: string;

  @Column({
    default: () => 'now()',
    name: 'last_authenticated_at',
    type: 'timestamptz',
  })
  lastAuthenticatedAt: Date;

  @ManyToOne(() => User, (user) => user.externalIdentities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
