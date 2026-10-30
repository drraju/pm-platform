import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity';
import { User } from '../../users/entities/user.entity';
@Entity({ name: 'customers' })
export class Customer extends TimestampedEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ default: 'active', length: 32 })
  status: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ length: 200, nullable: true, type: 'varchar' })
  domain: string | null;

  @Column({ name: 'renewal_date', nullable: true, type: 'date' })
  renewalDate: string | null;

  @Column({ name: 'last_touch', nullable: true, type: 'date' })
  lastTouch: string | null;

  @Column({ name: 'commercial_note', nullable: true, type: 'text' })
  commercialNote: string | null;

  @Column({ name: 'success_note', nullable: true, type: 'text' })
  successNote: string | null;
}
