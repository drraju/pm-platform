import { Controller } from '@nestjs/common';
import { SlackService } from './slack.service';

@Controller('integrations/slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}
}
