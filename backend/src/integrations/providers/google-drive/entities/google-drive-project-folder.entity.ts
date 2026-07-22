import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';

@Entity({ name: 'google_drive_project_folders' })
@Index(['projectId'], { unique: true, where: 'deleted_at IS NULL' })
export class GoogleDriveProjectFolder extends BaseEntity {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'connection_id', type: 'uuid' })
  connectionId: string;

  @Column({ name: 'project_name', type: 'varchar' })
  projectName: string;

  @Column({ name: 'folder_id', type: 'varchar' })
  folderId: string;

  @Column({ name: 'folder_url', type: 'text' })
  folderUrl: string;

  @Column({ name: 'root_folder_id', type: 'varchar' })
  rootFolderId: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;
}
