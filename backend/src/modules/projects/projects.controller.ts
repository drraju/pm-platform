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
import { TaskStatus } from '../../common/enums/task-status.enum';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Assumption } from '../raid/entities/assumption.entity';
import { Dependency } from '../raid/entities/dependency.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { ProjectTaskQueryDto } from './dto/project-task-query.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { Task } from '../tasks/entities/task.entity';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: Project })
  create(@Body() createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  @ApiOkResponse({ type: Project, isArray: true })
  findAll(): Promise<Project[]> {
    return this.projectsService.findAll();
  }

  @Post(':id/members')
  @RequirePermissions(PermissionKey.ProjectTeamManage)
  @ApiOperation({ summary: 'Add a project member' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ProjectMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Project or user not found' })
  @ApiConflictResponse({ description: 'User is already a project member' })
  addMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() createProjectMemberDto: CreateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectsService.addMember(
      id,
      createProjectMemberDto,
      request.user,
    );
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List project members' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findMembers(@Param('id') id: string): Promise<ProjectMemberResponseDto[]> {
    return this.projectsService.findMembers(id);
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions(PermissionKey.ProjectTeamManage)
  @ApiOperation({ summary: 'Update a project member role' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'memberId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Project, user, or membership not found' })
  updateMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateProjectMemberDto: UpdateProjectMemberDto,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectsService.updateMember(
      id,
      memberId,
      updateProjectMemberDto,
      request.user,
    );
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions(PermissionKey.ProjectTeamManage)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a project member' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'memberId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project member removed' })
  @ApiNotFoundResponse({ description: 'Project, user, or membership not found' })
  removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.projectsService.removeMember(id, memberId, request.user);
  }

  @Get(':projectId/tasks')
  @ApiOperation({ summary: 'List project tasks' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'assigneeId', format: 'uuid', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiOkResponse({ type: Task, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectTasks(
    @Param('projectId') projectId: string,
    @Query() query: ProjectTaskQueryDto,
  ): Promise<Task[]> {
    return this.projectsService.findProjectTasks(projectId, query);
  }

  @Post(':projectId/tasks')
  @RequirePermissions(PermissionKey.TaskCreate)
  @ApiOperation({ summary: 'Create a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiCreatedResponse({ type: Task })
  @ApiNotFoundResponse({ description: 'Project or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee must be a project member' })
  createProjectTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() createProjectTaskDto: CreateProjectTaskDto,
  ): Promise<Task> {
    return this.projectsService.createProjectTask(
      projectId,
      createProjectTaskDto,
      request.user,
    );
  }

  @Patch(':projectId/tasks/:taskId')
  @RequirePermissions(PermissionKey.TaskUpdate)
  @ApiOperation({ summary: 'Update a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: Task })
  @ApiNotFoundResponse({ description: 'Project, task, or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee must be a project member' })
  updateProjectTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateProjectTaskDto: UpdateProjectTaskDto,
  ): Promise<Task> {
    return this.projectsService.updateProjectTask(
      projectId,
      taskId,
      updateProjectTaskDto,
      request.user,
    );
  }

  @Delete(':projectId/tasks/:taskId')
  @RequirePermissions(PermissionKey.TaskDelete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project task deleted' })
  @ApiNotFoundResponse({ description: 'Project or task not found' })
  removeProjectTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<void> {
    return this.projectsService.removeProjectTask(
      projectId,
      taskId,
      request.user,
    );
  }

  @Get(':id/risks')
  @ApiOperation({ summary: 'List project risks' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Risk, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectRisks(@Param('id') id: string): Promise<Risk[]> {
    return this.projectsService.findProjectRisks(id);
  }

  @Get(':id/issues')
  @ApiOperation({ summary: 'List project issues' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Issue, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectIssues(@Param('id') id: string): Promise<Issue[]> {
    return this.projectsService.findProjectIssues(id);
  }

  @Get(':id/assumptions')
  @ApiOperation({ summary: 'List project assumptions' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Assumption, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectAssumptions(@Param('id') id: string): Promise<Assumption[]> {
    return this.projectsService.findProjectAssumptions(id);
  }

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'List project dependencies' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Dependency, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectDependencies(@Param('id') id: string): Promise<Dependency[]> {
    return this.projectsService.findProjectDependencies(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findOne(@Param('id') id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.projectsService.remove(id);
  }
}
