import { ForbiddenException } from '@nestjs/common';
import { SlackService } from '../slack.service';

describe('SlackService', () => {
  const store = { channel: null as string | null, webhook: null as string | null };
  const poster = jest.fn(async () => undefined);
  const projectsRepository = {
    findOne: jest.fn(async () => ({ id: 'project-1' })),
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('slack_webhook_url = NULL')) {
        store.channel = null;
        store.webhook = null;
        return [];
      }
      if (sql.includes('slack_webhook_url = $3')) {
        store.channel = (params[1] as string | null) ?? null;
        store.webhook = params[2] as string;
        return [];
      }
      if (sql.includes('SET slack_channel_id = $2')) {
        store.channel = (params[1] as string | null) ?? null;
        return [];
      }
      return [
        {
          channel_id: store.channel,
          has_webhook: Boolean(store.webhook),
          ...(sql.includes('webhook_url') ? { webhook_url: store.webhook } : {}),
        },
      ];
    }),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const authorization = {
    isPlatformAdministrator: jest.fn(async () => false),
  };
  const service = new SlackService(
    projectsRepository as never,
    membersRepository as never,
    authorization as never,
    poster,
  );
  const lead = { roleId: 'role', userId: 'lead' };
  const contributor = { roleId: 'role', userId: 'contributor' };

  beforeEach(() => {
    store.channel = null;
    store.webhook = null;
    poster.mockReset();
    poster.mockResolvedValue(undefined);
    authorization.isPlatformAdministrator.mockResolvedValue(false);
    membersRepository.findOne.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      if (where.userId === 'lead') return { role: 'owner', userId: 'lead' };
      if (where.userId === 'contributor') return { role: 'contributor', userId: 'contributor' };
      return null;
    });
  });

  it('stores the webhook as write-only and posts a blocked event once', async () => {
    const saved = await service.save(lead, 'project-1', {
      channelId: 'C123',
      webhookUrl: 'https://hooks.slack.com/services/T/B/secret',
    });

    expect(saved).toEqual({
      channelId: 'C123',
      configured: true,
      webhookSaved: true,
    });
    expect(JSON.stringify(saved)).not.toContain('secret');

    await service.deliver('project-1', 'Blocked: Test2');

    expect(poster).toHaveBeenCalledTimes(1);
    expect(poster).toHaveBeenCalledWith(
      {
        channelId: 'C123',
        webhookUrl: 'https://hooks.slack.com/services/T/B/secret',
      },
      'Blocked: Test2',
    );
  });

  it('posts nothing and raises nothing when Slack is off', async () => {
    await expect(service.deliver('project-1', 'Blocked: Test2')).resolves.toBeUndefined();
    expect(poster).not.toHaveBeenCalled();

    poster.mockRejectedValueOnce(new Error('down'));
    store.webhook = 'https://hooks.slack.com/services/T/B/secret';
    await expect(service.deliver('project-1', 'Blocked: Test2')).resolves.toBeUndefined();
  });

  it('disconnects and refuses a contributor edit', async () => {
    await service.save(lead, 'project-1', {
      webhookUrl: 'https://hooks.slack.com/services/T/B/secret',
    });
    const disconnected = await service.disconnect(lead, 'project-1');
    expect(disconnected).toEqual({
      channelId: null,
      configured: false,
      webhookSaved: false,
    });

    await expect(
      service.save(contributor, 'project-1', {
        webhookUrl: 'https://hooks.slack.com/services/T/B/other',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
