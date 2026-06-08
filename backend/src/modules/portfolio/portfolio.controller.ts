import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { PermissionKey } from '../authorization/permissions';
import { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  @RequirePermissions(PermissionKey.PortfolioSummaryRead)
  @ApiOperation({ summary: 'Get portfolio health summary' })
  @ApiOkResponse({ type: PortfolioSummaryDto })
  getSummary(): Promise<PortfolioSummaryDto> {
    return this.portfolioService.getSummary();
  }
}
