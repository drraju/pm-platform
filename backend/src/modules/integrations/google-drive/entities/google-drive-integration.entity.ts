import { BaseEntity } from '../../../../common/entities/base.entity';

export class GoogleDriveIntegration extends BaseEntity {
  accountEmail: string;
  connectedByUserId: string;
}
