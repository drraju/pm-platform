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
  CreateSkillDto,
  QuerySkillsDto,
  SkillResponseDto,
  UpdateSkillDto,
} from './dto/skill.dto';
import { SkillStatus } from './enums/skill-status.enum';
import { SkillApiService } from './skill-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('skills')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('skills')
export class SkillController {
  constructor(private readonly skillApiService: SkillApiService) {}

  @Post()
  @RequirePermissions(PermissionKey.SkillCreate)
  @ApiOperation({ summary: 'Create a skill' })
  @ApiCreatedResponse({ type: SkillResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid skill payload' })
  @ApiConflictResponse({ description: 'Skill name already exists' })
  createSkill(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateSkillDto,
  ): Promise<SkillResponseDto> {
    return this.skillApiService.createSkill(input, request.user);
  }

  @Get()
  @RequirePermissions(PermissionKey.SkillRead)
  @ApiOperation({ summary: 'List skills' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SkillStatus })
  @ApiOkResponse({ type: SkillResponseDto, isArray: true })
  listSkills(@Query() query: QuerySkillsDto): Promise<SkillResponseDto[]> {
    return this.skillApiService.listSkills(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.SkillRead)
  @ApiOperation({ summary: 'Get skill detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SkillResponseDto })
  @ApiNotFoundResponse({ description: 'Skill not found' })
  getSkill(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SkillResponseDto> {
    return this.skillApiService.getSkill(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.SkillUpdate)
  @ApiOperation({ summary: 'Update a skill' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SkillResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid skill payload' })
  @ApiConflictResponse({ description: 'Skill name already exists' })
  @ApiNotFoundResponse({ description: 'Skill not found' })
  updateSkill(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateSkillDto,
  ): Promise<SkillResponseDto> {
    return this.skillApiService.updateSkill(id, input, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.SkillArchive)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a skill' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Skill archived' })
  @ApiNotFoundResponse({ description: 'Skill not found' })
  deleteSkill(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.skillApiService.deleteSkill(id, request.user);
  }
}
