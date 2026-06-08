import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedPrincipal } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { PermissionKey } from '../authorization/permissions';
import { DashboardService } from './dashboard.service';
import { MeDashboardDto } from './dto/me-dashboard.dto';

type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  @RequirePermissions(PermissionKey.DashboardReadSelf)
  @ApiOperation({ summary: 'Get dashboard for the authenticated user' })
  @ApiOkResponse({ type: MeDashboardDto })
  getMyDashboard(
    @Req() request: AuthenticatedRequest,
  ): Promise<MeDashboardDto> {
    return this.dashboardService.getMyDashboard(request.user.userId);
  }
}
