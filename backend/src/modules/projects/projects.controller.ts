import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedPrincipal } from '../authorization/authorization.service';
import { ProjectAccess } from '../authorization/decorators/project-access.decorator';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { ProjectAccessGuard } from '../authorization/guards/project-access.guard';
import { PermissionKey } from '../authorization/permissions';
import { Assumption } from '../raid/entities/assumption.entity';
import { Dependency } from '../raid/entities/dependency.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { ProjectTaskQueryDto } from './dto/project-task-query.dto';
import { ProjectTimelineDto } from './dto/project-timeline.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { Task } from '../tasks/entities/task.entity';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.ProjectsCreate)
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: Project })
  create(@Body() createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(
    PermissionKey.ProjectsReadAll,
    PermissionKey.ProjectsReadAssigned,
  )
  @ApiOperation({ summary: 'List projects' })
  @ApiOkResponse({ type: Project, isArray: true })
  findAll(@Req() request: AuthenticatedRequest): Promise<Project[]> {
    return this.projectsService.findAllForUser(request.user);
  }

  @Post(':id/members')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'owner' })
  @ApiOperation({ summary: 'Add a project member' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ProjectMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Project or user not found' })
  @ApiConflictResponse({ description: 'User is already a project member' })
  addMember(
    @Param('id') id: string,
    @Body() createProjectMemberDto: CreateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectsService.addMember(id, createProjectMemberDto);
  }

  @Get(':id/members')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'List project members' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findMembers(@Param('id') id: string): Promise<ProjectMemberResponseDto[]> {
    return this.projectsService.findMembers(id);
  }

  @Patch(':id/members/:userId')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'owner' })
  @ApiOperation({ summary: 'Update a project member role' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto })
  @ApiNotFoundResponse({
    description: 'Project, user, or membership not found',
  })
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateProjectMemberDto: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectsService.updateMember(
      id,
      userId,
      updateProjectMemberDto,
    );
  }

  @Delete(':id/members/:userId')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'owner' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a project member' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project member removed' })
  @ApiNotFoundResponse({
    description: 'Project, user, or membership not found',
  })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.projectsService.removeMember(id, userId);
  }

  @Get(':projectId/tasks')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'read', param: 'projectId' })
  @ApiOperation({ summary: 'List project tasks' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'assigneeId', format: 'uuid', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiOkResponse({ type: Task, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectTasks(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Query() query: ProjectTaskQueryDto,
  ): Promise<Task[]> {
    return this.projectsService.findProjectTasksForUser(
      request.user,
      projectId,
      query,
    );
  }

  @Post(':projectId/tasks')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.ProjectTasksCreate)
  @ProjectAccess({ mode: 'manage', param: 'projectId' })
  @ApiOperation({ summary: 'Create a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiCreatedResponse({ type: Task })
  @ApiNotFoundResponse({ description: 'Project or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee must be a project member' })
  createProjectTask(
    @Param('projectId') projectId: string,
    @Body() createProjectTaskDto: CreateProjectTaskDto,
  ): Promise<Task> {
    return this.projectsService.createProjectTask(
      projectId,
      createProjectTaskDto,
    );
  }

  @Patch(':projectId/tasks/:taskId')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.ProjectTasksUpdateAny)
  @ProjectAccess({ mode: 'manage', param: 'projectId' })
  @ApiOperation({ summary: 'Update a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: Task })
  @ApiNotFoundResponse({ description: 'Project, task, or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee must be a project member' })
  updateProjectTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateProjectTaskDto: UpdateProjectTaskDto,
  ): Promise<Task> {
    return this.projectsService.updateProjectTask(
      projectId,
      taskId,
      updateProjectTaskDto,
    );
  }

  @Delete(':projectId/tasks/:taskId')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.ProjectTasksDelete)
  @ProjectAccess({ mode: 'manage', param: 'projectId' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project task deleted' })
  @ApiNotFoundResponse({ description: 'Project or task not found' })
  removeProjectTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<void> {
    return this.projectsService.removeProjectTask(projectId, taskId);
  }

  @Get(':id/risks')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.RaidReadAll, PermissionKey.RaidReadAssigned)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'List project risks' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Risk, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectRisks(@Param('id') id: string): Promise<Risk[]> {
    return this.projectsService.findProjectRisks(id);
  }

  @Get(':id/issues')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.RaidReadAll, PermissionKey.RaidReadAssigned)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'List project issues' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Issue, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectIssues(@Param('id') id: string): Promise<Issue[]> {
    return this.projectsService.findProjectIssues(id);
  }

  @Get(':id/assumptions')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.RaidReadAll, PermissionKey.RaidReadAssigned)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'List project assumptions' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Assumption, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectAssumptions(@Param('id') id: string): Promise<Assumption[]> {
    return this.projectsService.findProjectAssumptions(id);
  }

  @Get(':id/dependencies')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.RaidReadAll, PermissionKey.RaidReadAssigned)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'List project dependencies' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Dependency, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectDependencies(@Param('id') id: string): Promise<Dependency[]> {
    return this.projectsService.findProjectDependencies(id);
  }

  @Get(':id/timeline')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'Get project timeline foundation data' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProjectTimelineDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findTimeline(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ProjectTimelineDto> {
    return this.projectsService.findTimelineForUser(request.user, id);
  }

  @Get(':id')
  @UseGuards(ProjectAccessGuard)
  @ProjectAccess({ mode: 'read' })
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.findOneForUser(request.user, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.ProjectsUpdate)
  @ProjectAccess({ mode: 'owner' })
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard, ProjectAccessGuard)
  @RequirePermissions(PermissionKey.ProjectsDelete)
  @ProjectAccess({ mode: 'owner' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.projectsService.remove(id);
  }
}
