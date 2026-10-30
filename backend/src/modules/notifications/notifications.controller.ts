import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = Request & {
  user: {
    roleId: string;
    userId: string;
  };
};

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(PermissionKey.NotificationRead)
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.list(request.user.userId);
  }

  @Get('unread-count')
  @RequirePermissions(PermissionKey.NotificationRead)
  @ApiOkResponse()
  unreadCount(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.unreadCount(request.user.userId);
  }

  @Post('read')
  @RequirePermissions(PermissionKey.NotificationRead)
  @ApiOkResponse()
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(request.user.userId);
  }

  @Post(':id/read')
  @RequirePermissions(PermissionKey.NotificationRead)
  @ApiOkResponse()
  markRead(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.notificationsService.markRead(request.user.userId, id);
  }
}
