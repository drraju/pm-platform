import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { MilestoneQueryDto } from '../tasks/dto/milestone-query.dto';
import { MilestoneListResponseDto } from '../tasks/dto/milestone-response.dto';
import { MilestoneQueryService } from '../tasks/milestone-query.service';
import { MilestoneResponseMapper } from '../tasks/milestone-response.mapper';

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
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly milestoneQueryService: MilestoneQueryService,
    private readonly milestoneResponseMapper: MilestoneResponseMapper,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get portfolio health summary' })
  @ApiOkResponse({ type: PortfolioSummaryDto })
  getSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<PortfolioSummaryDto> {
    return this.portfolioService.getSummary(request.user);
  }

  @Get('milestones')
  @ApiOperation({ summary: 'List visible portfolio milestones' })
  @ApiOkResponse({ type: MilestoneListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid milestone query' })
  async findMilestones(
    @Req() request: AuthenticatedRequest,
    @Query() query: MilestoneQueryDto,
  ): Promise<MilestoneListResponseDto> {
    const result = await this.milestoneQueryService.findPortfolioMilestones(
      this.milestoneResponseMapper.toQuery(query),
      request.user,
    );
    return this.milestoneResponseMapper.toListResponse(result);
  }
}
