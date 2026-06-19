import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import { PortfolioService } from './portfolio.service';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.PortfolioView)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get portfolio health summary' })
  @ApiOkResponse({ type: PortfolioSummaryDto })
  getSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<PortfolioSummaryDto> {
    return this.portfolioService.getSummary(request.user);
  }
}
