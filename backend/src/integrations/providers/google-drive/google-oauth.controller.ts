import { Controller, Get, Query } from '@nestjs/common';
import { IntegrationProviderRegistry } from '../../application';
import { ProviderType } from '../../domain';
import { GoogleOAuthCallbackDto } from './dto';
import { GoogleDriveIntegrationProvider } from './google-drive.integration-provider';

@Controller('oauth/google')
export class GoogleOAuthController {
  constructor(private readonly registry: IntegrationProviderRegistry) {}

  @Get('callback')
  callback(@Query() query: GoogleOAuthCallbackDto) {
    return this.provider().completeGoogleOAuth(query);
  }

  private provider(): GoogleDriveIntegrationProvider {
    return this.registry.resolve(
      ProviderType.GOOGLE_DRIVE,
    ) as GoogleDriveIntegrationProvider;
  }
}
