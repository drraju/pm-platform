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
  CreateResourceCapacityPolicyDto,
  ResourceCapacityPolicyResponseDto,
  UpdateResourceCapacityPolicyDto,
} from './dto/resource-capacity-policy.dto';
import { ResourceCapacityPolicyApiService } from './resource-capacity-policy-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('resource-capacity-policies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resources/:resourceId/capacity-policies')
export class ResourceCapacityPolicyController {
  constructor(
    private readonly resourceCapacityPolicyApiService: ResourceCapacityPolicyApiService,
  ) {}

  @Post()
  @RequirePermissions(PermissionKey.ResourceCapacityCreate)
  @ApiOperation({ summary: 'Create a resource capacity policy' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiCreatedResponse({ type: ResourceCapacityPolicyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid capacity policy payload' })
  @ApiConflictResponse({
    description: 'Resource capacity policy overlaps an existing active policy',
  })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  createCapacityPolicy(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() input: CreateResourceCapacityPolicyDto,
  ): Promise<ResourceCapacityPolicyResponseDto> {
    return this.resourceCapacityPolicyApiService.createCapacityPolicy(
      resourceId,
      input,
      request.user,
    );
  }

  @Get()
  @RequirePermissions(PermissionKey.ResourceCapacityRead)
  @ApiOperation({ summary: 'List resource capacity policies' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceCapacityPolicyResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  listCapacityPolicies(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceCapacityPolicyResponseDto[]> {
    return this.resourceCapacityPolicyApiService.listCapacityPolicies(
      resourceId,
    );
  }

  @Get(':policyId')
  @RequirePermissions(PermissionKey.ResourceCapacityRead)
  @ApiOperation({ summary: 'Get resource capacity policy detail' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiParam({ name: 'policyId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceCapacityPolicyResponseDto })
  @ApiNotFoundResponse({
    description: 'Resource capacity policy not found for resource',
  })
  getCapacityPolicy(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Param('policyId', new ParseUUIDPipe()) policyId: string,
  ): Promise<ResourceCapacityPolicyResponseDto> {
    return this.resourceCapacityPolicyApiService.getCapacityPolicy(
      resourceId,
      policyId,
    );
  }

  @Patch(':policyId')
  @RequirePermissions(PermissionKey.ResourceCapacityUpdate)
  @ApiOperation({ summary: 'Update a resource capacity policy' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiParam({ name: 'policyId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceCapacityPolicyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid capacity policy payload' })
  @ApiConflictResponse({
    description: 'Resource capacity policy overlaps an existing active policy',
  })
  @ApiNotFoundResponse({
    description: 'Resource capacity policy or resource not found',
  })
  updateCapacityPolicy(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Param('policyId', new ParseUUIDPipe()) policyId: string,
    @Body() input: UpdateResourceCapacityPolicyDto,
  ): Promise<ResourceCapacityPolicyResponseDto> {
    return this.resourceCapacityPolicyApiService.updateCapacityPolicy(
      resourceId,
      policyId,
      input,
      request.user,
    );
  }

  @Delete(':policyId')
  @RequirePermissions(PermissionKey.ResourceCapacityArchive)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a resource capacity policy' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiParam({ name: 'policyId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource capacity policy archived' })
  @ApiNotFoundResponse({
    description: 'Resource capacity policy not found for resource',
  })
  deleteCapacityPolicy(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Param('policyId', new ParseUUIDPipe()) policyId: string,
  ): Promise<void> {
    return this.resourceCapacityPolicyApiService.deleteCapacityPolicy(
      resourceId,
      policyId,
      request.user,
    );
  }
}
