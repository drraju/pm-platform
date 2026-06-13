import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { MeDashboardDto } from './dto/me-dashboard.dto';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get dashboard for the authenticated user' })
  @ApiOkResponse({ type: MeDashboardDto })
  getMyDashboard(
    @Req() request: AuthenticatedRequest,
  ): Promise<MeDashboardDto> {
    return this.dashboardService.getMyDashboard(
      request.user.userId,
      request.user,
    );
  }
}
