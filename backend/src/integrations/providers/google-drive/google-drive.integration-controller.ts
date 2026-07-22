import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IntegrationProviderRegistry } from '../../application';
import { IntegrationConnection, ProviderType } from '../../domain';
import {
  GoogleConnectDto,
  GoogleDocumentsQueryDto,
  GoogleProjectFolderDto,
} from './dto';
import { GoogleDriveIntegrationProvider } from './google-drive.integration-provider';

@Controller('integrations/google')
export class GoogleDriveIntegrationController {
  constructor(private readonly registry: IntegrationProviderRegistry) {}

  @Post('connect')
  connect(@Body() input: GoogleConnectDto) {
    return this.provider().connectGoogleDrive(input);
  }

  @Get('drives')
  drives(@Query('connectionId') connectionId?: string) {
    return this.provider().listDrives(connectionId);
  }

  @Post('project-folder')
  createProjectFolder(@Body() input: GoogleProjectFolderDto) {
    return this.provider().createProjectFolder(input);
  }

  @Get('project-folder/:projectId')
  getProjectFolder(@Param('projectId') projectId: string) {
    return this.provider().getProjectFolder(projectId);
  }

  @Get('workspace/:projectId')
  workspace(@Param('projectId') projectId: string) {
    return this.provider().getProjectWorkspace(projectId);
  }

  @Get('documents')
  documents(@Query() query: GoogleDocumentsQueryDto) {
    return this.provider().listDocuments(query);
  }

  @Get('health')
  health(@Query('connectionId') connectionId?: string) {
    return this.provider().health({
      connection: connectionId
        ? ({ id: connectionId } as IntegrationConnection)
        : undefined,
    });
  }

  private provider(): GoogleDriveIntegrationProvider {
    return this.registry.resolve(
      ProviderType.GOOGLE_DRIVE,
    ) as GoogleDriveIntegrationProvider;
  }
}
