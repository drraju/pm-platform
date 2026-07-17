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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateResourceAssignmentDto,
  ResourceAssignmentResponseDto,
  UpdateResourceAssignmentDto,
} from './dto/resource-assignment.dto';
import { ResourceAssignmentApiService } from './resource-assignment-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('resource-assignments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resource-assignments')
export class ResourceAssignmentController {
  constructor(
    private readonly resourceAssignmentApiService: ResourceAssignmentApiService,
  ) {}

  @Post()
  @RequirePermissions(PermissionKey.ResourceAssignmentCreate)
  @ApiOperation({ summary: 'Create a resource assignment' })
  @ApiCreatedResponse({ type: ResourceAssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid resource assignment payload' })
  @ApiConflictResponse({ description: 'Resource assignment already exists' })
  @ApiNotFoundResponse({
    description: 'Resource, project, or task was not found',
  })
  createAssignment(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateResourceAssignmentDto,
  ): Promise<ResourceAssignmentResponseDto> {
    return this.resourceAssignmentApiService.createAssignment(
      input,
      request.user,
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.ResourceAssignmentUpdate)
  @ApiOperation({ summary: 'Update a resource assignment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResourceAssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid resource assignment payload' })
  @ApiConflictResponse({ description: 'Resource assignment already exists' })
  @ApiNotFoundResponse({
    description: 'Resource assignment, resource, project, or task not found',
  })
  updateAssignment(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateResourceAssignmentDto,
  ): Promise<ResourceAssignmentResponseDto> {
    return this.resourceAssignmentApiService.updateAssignment(
      id,
      input,
      request.user,
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.ResourceAssignmentArchive)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a resource assignment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource assignment archived' })
  @ApiNotFoundResponse({ description: 'Resource assignment not found' })
  deleteAssignment(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.resourceAssignmentApiService.deleteAssignment(id, request.user);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.ResourceAssignmentRead)
  @ApiOperation({ summary: 'Get resource assignment detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResourceAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Resource assignment not found' })
  getAssignmentById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ResourceAssignmentResponseDto> {
    return this.resourceAssignmentApiService.getAssignmentById(id);
  }

  @Get('project/:projectId')
  @RequirePermissions(PermissionKey.ResourceAssignmentRead)
  @ApiOperation({ summary: 'List resource assignments by project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceAssignmentResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  listAssignmentsByProject(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ): Promise<ResourceAssignmentResponseDto[]> {
    return this.resourceAssignmentApiService.listAssignmentsByProject(
      projectId,
    );
  }

  @Get('resource/:resourceId')
  @RequirePermissions(PermissionKey.ResourceAssignmentRead)
  @ApiOperation({ summary: 'List resource assignments by resource' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceAssignmentResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  listAssignmentsByResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceAssignmentResponseDto[]> {
    return this.resourceAssignmentApiService.listAssignmentsByResource(
      resourceId,
    );
  }
}
