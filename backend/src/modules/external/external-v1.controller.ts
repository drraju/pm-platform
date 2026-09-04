import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExternalApiGuard } from './auth/external-api.guard';
import { ExternalApiResource } from './auth/external-api-resource';
import { RequireExternalApiResource } from './auth/external-api-resource.decorator';
import {
  ExternalBadRequestErrorDto,
  ExternalForbiddenErrorDto,
  ExternalUnauthorizedErrorDto,
} from './contracts/external-error.dto';
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
import { ExternalApiAccessLoggingGuard } from './logging/external-api-access-logging.guard';
import { ExternalScope } from './scope/external-data-scope';
import type { ResolvedExternalDataScope } from './scope/external-data-scope';

@ApiTags('external-v1')
@ApiBearerAuth()
@ApiExtraModels(
  ExternalPageDto,
  ExternalProjectDto,
  ExternalTaskDto,
  ExternalRiskDto,
  ExternalIssueDto,
  ExternalBadRequestErrorDto,
  ExternalUnauthorizedErrorDto,
  ExternalForbiddenErrorDto,
)
@ApiBadRequestResponse({
  description: 'Invalid external extraction request',
  type: ExternalBadRequestErrorDto,
})
@ApiUnauthorizedResponse({
  description: 'Missing, invalid, or expired bearer token',
  type: ExternalUnauthorizedErrorDto,
})
@ApiForbiddenResponse({
  description: 'External API access denied',
  type: ExternalForbiddenErrorDto,
})
@UseGuards(ExternalApiAccessLoggingGuard, JwtAuthGuard, ExternalApiGuard)
@Controller(EXTERNAL_V1_BASE_PATH)
export class ExternalV1Controller {
  constructor(private readonly queryService: ExternalReadQueryService) {}

  @Get('projects')
  @RequireExternalApiResource(ExternalApiResource.Projects)
  @ApiOperation({ summary: 'Extract projects for external analytics' })
  @ApiOkResponse({ schema: externalPageSchema(ExternalProjectDto) })
  findProjects(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalProjectDto>> {
    return this.queryService.findProjects(scope, query);
  }

  @Get('tasks')
  @RequireExternalApiResource(ExternalApiResource.Tasks)
  @ApiOperation({ summary: 'Extract tasks for external analytics' })
  @ApiOkResponse({ schema: externalPageSchema(ExternalTaskDto) })
  findTasks(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalTaskDto>> {
    return this.queryService.findTasks(scope, query);
  }

  @Get('risks')
  @RequireExternalApiResource(ExternalApiResource.Risks)
  @ApiOperation({ summary: 'Extract risks for external analytics' })
  @ApiOkResponse({ schema: externalPageSchema(ExternalRiskDto) })
  findRisks(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalRiskDto>> {
    return this.queryService.findRisks(scope, query);
  }

  @Get('issues')
  @RequireExternalApiResource(ExternalApiResource.Issues)
  @ApiOperation({ summary: 'Extract issues for external analytics' })
  @ApiOkResponse({ schema: externalPageSchema(ExternalIssueDto) })
  findIssues(
    @ExternalScope() scope: ResolvedExternalDataScope,
    @Query() query: ExternalPageRequestDto,
  ): Promise<ExternalPageDto<ExternalIssueDto>> {
    return this.queryService.findIssues(scope, query);
  }
}

function externalPageSchema(
  itemType:
    | typeof ExternalProjectDto
    | typeof ExternalTaskDto
    | typeof ExternalRiskDto
    | typeof ExternalIssueDto,
) {
  return {
    allOf: [
      { $ref: getSchemaPath(ExternalPageDto) },
      {
        properties: {
          data: {
            items: { $ref: getSchemaPath(itemType) },
            type: 'array' as const,
          },
        },
        type: 'object' as const,
      },
    ],
  };
}
