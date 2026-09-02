import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExternalApiGuard } from './auth/external-api.guard';
import { ExternalApiResource } from './auth/external-api-resource';
import { RequireExternalApiResource } from './auth/external-api-resource.decorator';
import { ExternalIssueDto } from './contracts/external-issue.dto';
import {
  ExternalPageDto,
  ExternalPageRequestDto,
} from './contracts/external-page.dto';
import { ExternalProjectDto } from './contracts/external-project.dto';
import { ExternalRiskDto } from './contracts/external-risk.dto';
import { ExternalTaskDto } from './contracts/external-task.dto';
import { EXTERNAL_V1_BASE_PATH } from './external.constants';
import { ExternalReadQueryService } from './external-read-query.service';
import { ExternalScope } from './scope/external-data-scope';
import type { ResolvedExternalDataScope } from './scope/external-data-scope';

@ApiTags('external-v1')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ExternalApiGuard)
@Controller(EXTERNAL_V1_BASE_PATH)
export class ExternalV1Controller {
  constructor(private readonly queryService: ExternalReadQueryService) {}

  @Get('projects')
  @RequireExternalApiResource(ExternalApiResource.Projects)
  @ApiOperation({ summary: 'Extract projects for external analytics' })
  @ApiOkResponse({ type: ExternalPageDto })
  findProjects(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalProjectDto>> {
    return this.queryService.findProjects(scope, query);
  }

  @Get('tasks')
  @RequireExternalApiResource(ExternalApiResource.Tasks)
  @ApiOperation({ summary: 'Extract tasks for external analytics' })
  @ApiOkResponse({ type: ExternalPageDto })
  findTasks(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalTaskDto>> {
    return this.queryService.findTasks(scope, query);
  }

  @Get('risks')
  @RequireExternalApiResource(ExternalApiResource.Risks)
  @ApiOperation({ summary: 'Extract risks for external analytics' })
  @ApiOkResponse({ type: ExternalPageDto })
  findRisks(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalRiskDto>> {
    return this.queryService.findRisks(scope, query);
  }

  @Get('issues')
  @RequireExternalApiResource(ExternalApiResource.Issues)
  @ApiOperation({ summary: 'Extract issues for external analytics' })
  @ApiOkResponse({ type: ExternalPageDto })
  findIssues(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalIssueDto>> {
    return this.queryService.findIssues(scope, query);
  }
}
