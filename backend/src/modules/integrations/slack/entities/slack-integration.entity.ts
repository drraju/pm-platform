import { BaseEntity } from '../../../../common/entities/base.entity';

export class SlackIntegration extends BaseEntity {
  workspaceId: string;
  teamName: string;
  connectedByUserId: string;
}
