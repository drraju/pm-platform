import {
  Controller,
  Get,
  NotFoundException,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DependencyQueryDto } from './dto/dependency-query.dto';
import {
  DependencyCollectionResponseDto,
  DependencyResponseDto,
} from './dto/dependency-response.dto';
import { DependencyQueryService } from './dependency-query.service';
import { DependencyResponseMapper } from './dependency-response.mapper';

type AuthenticatedRequest = Request & {
  user: { email: string; roleId: string; userId: string };
};

@ApiTags('dependencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.ProjectRead)
@Controller('dependencies')
export class DependenciesController {
  constructor(
    private readonly dependencyQueryService: DependencyQueryService,
    private readonly dependencyResponseMapper: DependencyResponseMapper,
  ) {}

  @Get(':dependencyId')
  @ApiOperation({ summary: 'Get a visible task dependency' })
  @ApiParam({ name: 'dependencyId', format: 'uuid' })
  @ApiOkResponse({ type: DependencyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid dependency identifier' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Project read permission required' })
  @ApiNotFoundResponse({ description: 'Visible dependency not found' })
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param('dependencyId', new ParseUUIDPipe()) dependencyId: string,
  ): Promise<DependencyResponseDto> {
    const page = await this.dependencyQueryService.findDependencies(
      { dependencyIds: [dependencyId], pageSize: 1 },
      request.user,
    );
    const dependency = page.items[0];
    if (!dependency) {
      throw new NotFoundException(`Dependency ${dependencyId} not found`);
    }
    return this.dependencyResponseMapper.toResponse(dependency);
  }
}

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.ProjectRead)
@Controller('projects/:projectId/dependencies')
export class ProjectDependenciesController {
  constructor(
    private readonly dependencyQueryService: DependencyQueryService,
    private readonly dependencyResponseMapper: DependencyResponseMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List enterprise dependencies for a project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: DependencyCollectionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid project or query parameters' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Project read permission required' })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Query() query: DependencyQueryDto,
  ): Promise<DependencyCollectionResponseDto> {
    const result = await this.dependencyQueryService.findProjectDependencies(
      projectId,
      this.dependencyResponseMapper.toQuery(query),
      request.user,
    );
    return this.dependencyResponseMapper.toCollectionResponse(result);
  }
}
