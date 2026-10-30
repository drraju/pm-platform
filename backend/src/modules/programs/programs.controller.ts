import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AcceptProjectRequestDto,
  AttachProgramProjectDto,
  CreateProgramDto,
  CreateProgramProjectDto,
  CreateProjectRequestDto,
  SearchQueryDto,
} from './dto/program.dto';
import { ProgramsService } from './programs.service';
import { SearchService } from './search.service';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: { email?: string; roleId: string; userId: string };
};

@ApiTags('programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest) {
    return this.programsService.list(request.user);
  }

  @Get('leads')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiOkResponse()
  leads(@Req() request: AuthenticatedRequest) {
    return this.programsService.leads(request.user);
  }

  @Get('requests')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiOkResponse()
  requests(@Req() request: AuthenticatedRequest) {
    return this.programsService.listOpenRequests(request.user);
  }

  @Post('requests/:requestId/accept')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiOkResponse()
  accept(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() body: AcceptProjectRequestDto,
  ) {
    return this.programsService.acceptRequest(request.user, requestId, body);
  }

  @Post()
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiCreatedResponse()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateProgramDto) {
    return this.programsService.create(request.user, body);
  }

  @Get(':id/available-projects')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiOkResponse()
  available(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.programsService.availableProjects(request.user, id);
  }

  @Post(':id/projects')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiCreatedResponse()
  attach(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: AttachProgramProjectDto,
  ) {
    return this.programsService.attachProject(request.user, id, body);
  }

  @Post(':id/projects/new')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiCreatedResponse()
  createProject(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateProgramProjectDto,
  ) {
    return this.programsService.createProject(request.user, id, body);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.ProgramView)
  @ApiOkResponse()
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.programsService.get(request.user, id);
  }
}

@ApiTags('project-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class ProjectRequestsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get(':id/project-requests')
  @RequirePermissions(PermissionKey.CustomerManage)
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.programsService.listCustomerRequests(request.user, id);
  }

  @Post(':id/project-requests')
  @RequirePermissions(PermissionKey.CustomerManage)
  @ApiCreatedResponse()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateProjectRequestDto,
  ) {
    return this.programsService.createRequest(request.user, id, body);
  }
}

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequireAnyPermissions(
    PermissionKey.CustomerRead,
    PermissionKey.ProjectRead,
    PermissionKey.WorkUpdate,
    PermissionKey.TaskUpdate,
  )
  @ApiOkResponse()
  search(@Req() request: AuthenticatedRequest, @Query() query: SearchQueryDto) {
    return this.searchService.search(request.user, query.q);
  }
}
