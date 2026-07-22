import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'document_categories' })
@Index(['name'], { unique: true })
export class DocumentCategory extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ default: true, name: 'is_active', type: 'boolean' })
  isActive: boolean;
}
