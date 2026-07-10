import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateResourceDto,
  QueryResourcesDto,
  ResourceResponseDto,
  UpdateResourceDto,
} from './dto/resource.dto';
import { ResourceStatus } from './enums/resource-status.enum';
import { ResourceType } from './enums/resource-type.enum';
import { ResourceApiService } from './resource-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('resources')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceApiService: ResourceApiService) {}

  @Post()
  @RequirePermissions(PermissionKey.ResourceCreate)
  @ApiOperation({ summary: 'Create a resource' })
  @ApiCreatedResponse({ type: ResourceResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid resource payload' })
  @ApiConflictResponse({ description: 'Resource name already exists' })
  createResource(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateResourceDto,
  ): Promise<ResourceResponseDto> {
    return this.resourceApiService.createResource(input, request.user);
  }

  @Get()
  @RequirePermissions(PermissionKey.ResourceRead)
  @ApiOperation({ summary: 'List resources' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'resourceType', required: false, enum: ResourceType })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ResourceStatus })
  @ApiOkResponse({ type: ResourceResponseDto, isArray: true })
  listResources(
    @Query() query: QueryResourcesDto,
  ): Promise<ResourceResponseDto[]> {
    return this.resourceApiService.listResources(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.ResourceRead)
  @ApiOperation({ summary: 'Get resource detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResourceResponseDto })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  getResource(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ResourceResponseDto> {
    return this.resourceApiService.getResource(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.ResourceUpdate)
  @ApiOperation({ summary: 'Update a resource' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResourceResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid resource payload' })
  @ApiConflictResponse({ description: 'Resource name already exists' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  updateResource(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    return this.resourceApiService.updateResource(id, input, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.ResourceArchive)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a resource' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource archived' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  deleteResource(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.resourceApiService.deleteResource(id, request.user);
  }
}
