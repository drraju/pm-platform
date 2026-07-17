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
  CreateResourceSkillDto,
  QueryResourceSkillsDto,
  ResourceSkillResponseDto,
  UpdateResourceSkillDto,
} from './dto/resource-skill.dto';
import { ResourceSkillStatus } from './enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from './enums/skill-proficiency-level.enum';
import { ResourceSkillApiService } from './resource-skill-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('resource-skills')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resource-skills')
export class ResourceSkillController {
  constructor(
    private readonly resourceSkillApiService: ResourceSkillApiService,
  ) {}

  @Post()
  @RequirePermissions(PermissionKey.ResourceSkillCreate)
  @ApiOperation({ summary: 'Create a resource skill association' })
  @ApiCreatedResponse({ type: ResourceSkillResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid resource skill payload' })
  @ApiConflictResponse({ description: 'Resource skill already exists' })
  @ApiNotFoundResponse({ description: 'Resource or skill not found' })
  createResourceSkill(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateResourceSkillDto,
  ): Promise<ResourceSkillResponseDto> {
    return this.resourceSkillApiService.createResourceSkill(
      input,
      request.user,
    );
  }

  @Get()
  @RequirePermissions(PermissionKey.ResourceSkillRead)
  @ApiOperation({ summary: 'List resource skills' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'resourceId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'skillId', required: false, format: 'uuid' })
  @ApiQuery({
    name: 'proficiencyLevel',
    required: false,
    enum: SkillProficiencyLevel,
  })
  @ApiQuery({ name: 'status', required: false, enum: ResourceSkillStatus })
  @ApiOkResponse({ type: ResourceSkillResponseDto, isArray: true })
  listResourceSkills(
    @Query() query: QueryResourceSkillsDto,
  ): Promise<ResourceSkillResponseDto[]> {
    return this.resourceSkillApiService.listResourceSkills(query);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.ResourceSkillUpdate)
  @ApiOperation({ summary: 'Update a resource skill association' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResourceSkillResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid resource skill payload' })
  @ApiConflictResponse({ description: 'Resource skill already exists' })
  @ApiNotFoundResponse({
    description: 'Resource skill, resource, or skill not found',
  })
  updateResourceSkill(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateResourceSkillDto,
  ): Promise<ResourceSkillResponseDto> {
    return this.resourceSkillApiService.updateResourceSkill(
      id,
      input,
      request.user,
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.ResourceSkillArchive)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a resource skill association' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Resource skill archived' })
  @ApiNotFoundResponse({ description: 'Resource skill not found' })
  deleteResourceSkill(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.resourceSkillApiService.deleteResourceSkill(id, request.user);
  }

  @Get('resource/:resourceId')
  @RequirePermissions(PermissionKey.ResourceSkillRead)
  @ApiOperation({ summary: 'List resource skills by resource' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceSkillResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  listResourceSkillsByResource(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceSkillResponseDto[]> {
    return this.resourceSkillApiService.listResourceSkillsByResource(
      resourceId,
    );
  }

  @Get('skill/:skillId')
  @RequirePermissions(PermissionKey.ResourceSkillRead)
  @ApiOperation({ summary: 'List resource skills by skill' })
  @ApiParam({ name: 'skillId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceSkillResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Skill not found' })
  listResourceSkillsBySkill(
    @Param('skillId', new ParseUUIDPipe()) skillId: string,
  ): Promise<ResourceSkillResponseDto[]> {
    return this.resourceSkillApiService.listResourceSkillsBySkill(skillId);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.ResourceSkillRead)
  @ApiOperation({ summary: 'Get resource skill detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResourceSkillResponseDto })
  @ApiNotFoundResponse({ description: 'Resource skill not found' })
  getResourceSkill(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ResourceSkillResponseDto> {
    return this.resourceSkillApiService.getResourceSkill(id);
  }
}
