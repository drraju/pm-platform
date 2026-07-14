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
  CreateResourceAvailabilityOverrideDto,
  ResourceAvailabilityOverrideResponseDto,
  UpdateResourceAvailabilityOverrideDto,
} from './dto/resource-availability-override.dto';
import { ResourceAvailabilityOverrideApiService } from './resource-availability-override-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('resource-availability-overrides')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resources/:resourceId/availability-overrides')
export class ResourceAvailabilityOverrideController {
  constructor(
    private readonly resourceAvailabilityOverrideApiService: ResourceAvailabilityOverrideApiService,
  ) {}

  @Post()
  @RequirePermissions(PermissionKey.ResourceAvailabilityCreate)
  @ApiOperation({ summary: 'Create a resource availability override' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiCreatedResponse({ type: ResourceAvailabilityOverrideResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid availability override payload',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  createAvailabilityOverride(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() input: CreateResourceAvailabilityOverrideDto,
  ): Promise<ResourceAvailabilityOverrideResponseDto> {
    return this.resourceAvailabilityOverrideApiService.createAvailabilityOverride(
      resourceId,
      input,
      request.user,
    );
  }

  @Get()
  @RequirePermissions(PermissionKey.ResourceAvailabilityRead)
  @ApiOperation({ summary: 'List resource availability overrides' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({
    type: ResourceAvailabilityOverrideResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  listAvailabilityOverrides(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceAvailabilityOverrideResponseDto[]> {
    return this.resourceAvailabilityOverrideApiService.listAvailabilityOverrides(
      resourceId,
    );
  }

  @Get(':overrideId')
  @RequirePermissions(PermissionKey.ResourceAvailabilityRead)
  @ApiOperation({ summary: 'Get resource availability override detail' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiParam({ name: 'overrideId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceAvailabilityOverrideResponseDto })
  @ApiNotFoundResponse({
    description: 'Resource availability override not found for resource',
  })
  getAvailabilityOverride(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Param('overrideId', new ParseUUIDPipe()) overrideId: string,
  ): Promise<ResourceAvailabilityOverrideResponseDto> {
    return this.resourceAvailabilityOverrideApiService.getAvailabilityOverride(
      resourceId,
      overrideId,
    );
  }

  @Patch(':overrideId')
  @RequirePermissions(PermissionKey.ResourceAvailabilityUpdate)
  @ApiOperation({ summary: 'Update a resource availability override' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiParam({ name: 'overrideId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceAvailabilityOverrideResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid availability override payload',
  })
  @ApiNotFoundResponse({
    description: 'Resource availability override or resource not found',
  })
  updateAvailabilityOverride(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Param('overrideId', new ParseUUIDPipe()) overrideId: string,
    @Body() input: UpdateResourceAvailabilityOverrideDto,
  ): Promise<ResourceAvailabilityOverrideResponseDto> {
    return this.resourceAvailabilityOverrideApiService.updateAvailabilityOverride(
      resourceId,
      overrideId,
      input,
      request.user,
    );
  }

  @Delete(':overrideId')
  @RequirePermissions(PermissionKey.ResourceAvailabilityArchive)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a resource availability override' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiParam({ name: 'overrideId', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Resource availability override archived',
  })
  @ApiNotFoundResponse({
    description: 'Resource availability override not found for resource',
  })
  deleteAvailabilityOverride(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Param('overrideId', new ParseUUIDPipe()) overrideId: string,
  ): Promise<void> {
    return this.resourceAvailabilityOverrideApiService.deleteAvailabilityOverride(
      resourceId,
      overrideId,
      request.user,
    );
  }
}
