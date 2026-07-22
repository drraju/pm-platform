import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationProviderRegistry } from './application';
import { INTEGRATION_PROVIDER_ADAPTERS } from './infrastructure/integration.tokens';
import {
  GoogleDriveConnection,
  GoogleDriveDocumentMetadata,
  GoogleDriveIntegrationController,
  GoogleDriveIntegrationProvider,
  GoogleDriveProjectFolder,
  GoogleDriveOAuthService,
  GoogleTokenVault,
} from './providers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoogleDriveConnection,
      GoogleDriveProjectFolder,
      GoogleDriveDocumentMetadata,
    ]),
  ],
  controllers: [GoogleDriveIntegrationController],
  providers: [
    GoogleDriveOAuthService,
    GoogleTokenVault,
    GoogleDriveIntegrationProvider,
    {
      inject: [GoogleDriveIntegrationProvider],
      provide: INTEGRATION_PROVIDER_ADAPTERS,
      useFactory: (googleDriveProvider: GoogleDriveIntegrationProvider) => [
        googleDriveProvider,
      ],
    },
    IntegrationProviderRegistry,
  ],
  exports: [IntegrationProviderRegistry],
})
export class IntegrationPlatformModule {}
