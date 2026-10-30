import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { RequireAnyPermissions } from '../../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SaveSlackDto } from './dto/save-slack.dto';
import { SlackService } from './slack.service';

type AuthenticatedRequest = Request & {
  user: {
    email?: string;
    roleId: string;
    userId: string;
  };
};

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Get()
  @RequireAnyPermissions(
    PermissionKey.ProjectRead,
    PermissionKey.WorkUpdate,
    PermissionKey.ProjectLead,
  )
  @ApiOkResponse()
  read(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.slackService.read(request.user, projectId);
  }

  @Put()
  @RequireAnyPermissions(
    PermissionKey.ProjectLead,
    PermissionKey.ProjectUpdate,
    PermissionKey.WorkUpdate,
  )
  @ApiOkResponse()
  save(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() body: SaveSlackDto,
  ) {
    return this.slackService.save(request.user, projectId, body);
  }

  @Delete()
  @RequireAnyPermissions(
    PermissionKey.ProjectLead,
    PermissionKey.ProjectUpdate,
    PermissionKey.WorkUpdate,
  )
  @ApiOkResponse()
  disconnect(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.slackService.disconnect(request.user, projectId);
  }
}
