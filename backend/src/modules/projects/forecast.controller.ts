import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForecastHistoryQueryDto } from './dto/forecast-history-query.dto';
import {
  ForecastHistoryResponseDto,
  ForecastOverviewDto,
  ForecastSnapshotDetailDto,
} from './dto/forecast-read.dto';
import { ForecastQueryService } from './forecast-query.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ForecastController {
  constructor(private readonly forecastQueryService: ForecastQueryService) {}

  @Get(':projectId/forecast')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOperation({ summary: 'Get the project Forecast overview' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: ForecastOverviewDto })
  @ApiForbiddenResponse({ description: 'Project access is required' })
  @ApiNotFoundResponse({ description: 'Project or Forecast not found' })
  getOverview(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<ForecastOverviewDto> {
    return this.forecastQueryService.getOverview(projectId, request.user);
  }

  @Get(':projectId/forecast/history')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOperation({ summary: 'List official project Forecast history' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: ForecastHistoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid Forecast history query' })
  @ApiForbiddenResponse({ description: 'Project access is required' })
  @ApiNotFoundResponse({ description: 'Project or Forecast not found' })
  getHistory(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Query() query: ForecastHistoryQueryDto,
  ): Promise<ForecastHistoryResponseDto> {
    return this.forecastQueryService.getHistory(projectId, query, request.user);
  }

  @Get(':projectId/forecast/history/:snapshotId')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOperation({ summary: 'Get one official project Forecast snapshot' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'snapshotId', format: 'uuid' })
  @ApiOkResponse({ type: ForecastSnapshotDetailDto })
  @ApiForbiddenResponse({ description: 'Project access is required' })
  @ApiNotFoundResponse({ description: 'Project or Forecast not found' })
  getSnapshotDetail(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('snapshotId', new ParseUUIDPipe()) snapshotId: string,
  ): Promise<ForecastSnapshotDetailDto> {
    return this.forecastQueryService.getSnapshotDetail(
      projectId,
      snapshotId,
      request.user,
    );
  }
}
