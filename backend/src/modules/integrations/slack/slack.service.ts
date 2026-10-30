import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationActor, AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';

export const SLACK_POSTER = 'SLACK_POSTER';

export type SlackTarget = {
  channelId: string | null;
  webhookUrl: string | null;
};

export type SlackPoster = (target: SlackTarget, text: string) => Promise<void>;

export type SlackSetting = {
  channelId: string | null;
  configured: boolean;
  webhookSaved: boolean;
};

type SlackRow = {
  channel_id: string | null;
  has_webhook: boolean;
  webhook_url?: string | null;
};

function isSaved(value: unknown) {
  return value === true || value === 't' || value === 'true';
}

const leadRoles = new Set<string>([ProjectRole.Owner, ProjectRole.Manager]);

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    @Optional() @Inject(SLACK_POSTER) private readonly poster?: SlackPoster,
  ) {}

  async read(actor: AuthorizationActor, projectId: string): Promise<SlackSetting> {
    await this.assertVisible(actor, projectId);
    const row = await this.loadRow(projectId, false);
    return present(row);
  }

  async save(
    actor: AuthorizationActor,
    projectId: string,
    input: { channelId?: string | null; webhookUrl?: string | null },
  ): Promise<SlackSetting> {
    await this.assertLead(actor, projectId);
    const channelId = input.channelId?.trim() || null;
    const webhookUrl = input.webhookUrl?.trim() || null;
    if (webhookUrl) {
      await this.projectsRepository.query(
        `UPDATE projects
         SET slack_channel_id = $2, slack_webhook_url = $3, updated_at = now()
         WHERE id = $1`,
        [projectId, channelId, webhookUrl],
      );
    } else {
      await this.projectsRepository.query(
        `UPDATE projects
         SET slack_channel_id = $2, updated_at = now()
         WHERE id = $1`,
        [projectId, channelId],
      );
    }

    return this.read(actor, projectId);
  }

  async disconnect(actor: AuthorizationActor, projectId: string): Promise<SlackSetting> {
    await this.assertLead(actor, projectId);
    await this.projectsRepository.query(
      `UPDATE projects
       SET slack_channel_id = NULL, slack_webhook_url = NULL, updated_at = now()
       WHERE id = $1`,
      [projectId],
    );
    return this.read(actor, projectId);
  }

  async deliver(projectId: string, text: string) {
    const row = await this.loadRow(projectId, true);
    if (!row?.webhook_url && !row?.channel_id) {
      return;
    }

    const send = this.poster ?? postToSlack;
    try {
      await send(
        { channelId: row.channel_id, webhookUrl: row.webhook_url ?? null },
        text,
      );
    } catch (error) {
      this.logger.warn(
        `Slack post failed for project ${projectId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async assertVisible(actor: AuthorizationActor, projectId: string) {
    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (await this.authorizationPolicyService.isPlatformAdministrator(actor)) {
      return;
    }
    const member = await this.projectMembersRepository.findOne({
      where: { projectId, userId: actor.userId },
    });
    if (!member) {
      throw new NotFoundException('Project not found');
    }
  }

  private async assertLead(actor: AuthorizationActor, projectId: string) {
    await this.assertVisible(actor, projectId);
    if (await this.authorizationPolicyService.isPlatformAdministrator(actor)) {
      return;
    }
    const member = await this.projectMembersRepository.findOne({
      where: { projectId, userId: actor.userId },
    });
    if (!member || !leadRoles.has(member.role)) {
      throw new ForbiddenException('Only a lead can change Slack for this project');
    }
  }

  private async loadRow(projectId: string, includeSecret: boolean): Promise<SlackRow | null> {
    const rows = (await this.projectsRepository.query(
      `SELECT slack_channel_id AS channel_id,
              (slack_webhook_url IS NOT NULL AND slack_webhook_url <> '') AS has_webhook
              ${includeSecret ? ', slack_webhook_url AS webhook_url' : ''}
       FROM projects
       WHERE id = $1 AND deleted_at IS NULL`,
      [projectId],
    )) as SlackRow[];

    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      ...row,
      has_webhook: isSaved(row.has_webhook),
    };
  }
}

function present(row: SlackRow | null): SlackSetting {
  const channelId = row?.channel_id?.trim() || null;
  const webhookSaved = Boolean(row?.has_webhook);
  return {
    channelId,
    configured: webhookSaved || Boolean(channelId),
    webhookSaved,
  };
}

export async function postToSlack(target: SlackTarget, text: string) {
  if (target.webhookUrl) {
    const response = await fetch(target.webhookUrl, {
      body: JSON.stringify({ text }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Slack webhook returned ${response.status}`);
    }
    return;
  }

  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token || !target.channelId) {
    return;
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    body: JSON.stringify({ channel: target.channelId, text }),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Slack API returned ${response.status}`);
  }
}
