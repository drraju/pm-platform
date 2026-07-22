import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IntegrationProviderRegistry } from '../../application';
import { ProviderType } from '../../domain';
import { GoogleOAuthCallbackDto } from './dto';
import { GoogleDriveIntegrationProvider } from './google-drive.integration-provider';

@Controller('oauth/google')
export class GoogleOAuthController {
  constructor(private readonly registry: IntegrationProviderRegistry) {}

@Get('callback')
async callback(
  @Query() query: GoogleOAuthCallbackDto,
  @Res() res: Response,
) {
  try {
    await this.provider().completeGoogleOAuth(query);

    return res.redirect(
      'http://localhost:3000/settings/integrations?google=connected',
    );
  } catch {
    return res.redirect(
      'http://localhost:3000/settings/integrations?google=failed',
    );
  }
}

  private provider(): GoogleDriveIntegrationProvider {
    return this.registry.resolve(
      ProviderType.GOOGLE_DRIVE,
    ) as GoogleDriveIntegrationProvider;
  }
}
