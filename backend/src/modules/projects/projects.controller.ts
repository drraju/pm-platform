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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Assumption } from '../raid/entities/assumption.entity';
import { Dependency } from '../raid/entities/dependency.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { CreateProjectBaselineDto } from './dto/create-project-baseline.dto';
import { SetActiveProjectBaselineDto } from './dto/set-active-project-baseline.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { ProjectTaskQueryDto } from './dto/project-task-query.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { CreateTaskDependencyDto } from '../tasks/dto/create-task-dependency.dto';
import { CreateTaskExecutionUpdateDto } from '../tasks/dto/task-execution-update.dto';
import { UpdateTaskDependencyDto } from '../tasks/dto/update-task-dependency.dto';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { Task } from '../tasks/entities/task.entity';
import { Project } from './entities/project.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { ProjectsService } from './projects.service';
import { Request } from 'express';
import { MilestoneQueryDto } from '../tasks/dto/milestone-query.dto';
import {
  MilestoneListResponseDto,
  MilestoneResponseDto,
} from '../tasks/dto/milestone-response.dto';
import { MilestoneQueryService } from '../tasks/milestone-query.service';
import { MilestoneResponseMapper } from '../tasks/milestone-response.mapper';

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
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly milestoneQueryService: MilestoneQueryService,
    private readonly milestoneResponseMapper: MilestoneResponseMapper,
  ) {}

  @Post()
  @RequirePermissions(PermissionKey.ProjectCreate)
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: Project })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    return this.projectsService.create(createProjectDto, request.user);
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  @ApiQuery({ name: 'archived', required: false })
  @ApiQuery({ name: 'includeArchived', required: false })
  @ApiOkResponse({ type: Project, isArray: true })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('archived') archived?: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<Project[]> {
    return this.projectsService.findAll(request.user, {
      lifecycle:
        archived === 'true'
          ? 'archived'
          : includeArchived === 'true'
            ? 'all'
            : 'active',
    });
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
  @RequireAnyPermissions(
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
  )
  @ApiOperation({ summary: 'List project members' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findMembers(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<ProjectMemberResponseDto[]> {
    return this.projectsService.findMembers(id, request.user);
  }

  @Patch(':id/members/:memberId')
  @RequirePermissions(PermissionKey.ProjectTeamManage)
  @ApiOperation({ summary: 'Update a project member role' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'memberId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto })
  @ApiNotFoundResponse({
    description: 'Project, user, or membership not found',
  })
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
  @ApiNotFoundResponse({
    description: 'Project, user, or membership not found',
  })
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
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Query() query: ProjectTaskQueryDto,
  ): Promise<Task[]> {
    return this.projectsService.findProjectTasks(
      projectId,
      query,
      request.user,
    );
  }

  @Get(':projectId/milestones')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOperation({ summary: 'List project milestones' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: MilestoneListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid milestone query' })
  @ApiForbiddenResponse({ description: 'Project access is required' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async findProjectMilestones(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Query() query: MilestoneQueryDto,
  ): Promise<MilestoneListResponseDto> {
    const result = await this.milestoneQueryService.findProjectMilestones(
      projectId,
      this.milestoneResponseMapper.toQuery(query),
      request.user,
    );
    return this.milestoneResponseMapper.toListResponse(result);
  }

  @Get(':projectId/milestones/:taskId')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOperation({ summary: 'Get a project milestone' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: MilestoneResponseDto })
  @ApiForbiddenResponse({ description: 'Project access is required' })
  @ApiNotFoundResponse({ description: 'Milestone not found' })
  async findProjectMilestone(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<MilestoneResponseDto> {
    const result = await this.milestoneQueryService.findProjectMilestone(
      projectId,
      taskId,
      request.user,
    );
    return this.milestoneResponseMapper.toResponse(result);
  }

  @Post(':projectId/tasks')
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

  @Post(':projectId/tasks/:taskId/execution-updates')
  @ApiOperation({ summary: 'Record a project task execution update' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiCreatedResponse({ type: Task })
  @ApiNotFoundResponse({ description: 'Project, task, or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee must be a project member' })
  recordProjectTaskExecutionUpdate(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() input: CreateTaskExecutionUpdateDto,
  ): Promise<Task> {
    return this.projectsService.recordProjectTaskExecutionUpdate(
      projectId,
      taskId,
      input,
      request.user,
    );
  }

  @Delete(':projectId/tasks/:taskId')
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

  @Get(':projectId/tasks/:taskId/dependencies/predecessors')
  @ApiOperation({ summary: 'List dependency predecessors for a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: TaskDependency, isArray: true })
  @ApiNotFoundResponse({ description: 'Project or task not found' })
  findProjectTaskPredecessors(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<TaskDependency[]> {
    return this.projectsService.findProjectTaskPredecessors(
      projectId,
      taskId,
      request.user,
    );
  }

  @Get(':projectId/tasks/:taskId/dependencies/successors')
  @ApiOperation({ summary: 'List dependency successors for a project task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: TaskDependency, isArray: true })
  @ApiNotFoundResponse({ description: 'Project or task not found' })
  findProjectTaskSuccessors(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ): Promise<TaskDependency[]> {
    return this.projectsService.findProjectTaskSuccessors(
      projectId,
      taskId,
      request.user,
    );
  }

  @Post(':projectId/baselines')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Capture a project baseline' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiCreatedResponse({ type: ProjectBaseline })
  @ApiNotFoundResponse({ description: 'Project not found' })
  captureProjectBaseline(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() createProjectBaselineDto: CreateProjectBaselineDto,
  ): Promise<ProjectBaseline> {
    return this.projectsService.captureProjectBaseline(
      projectId,
      createProjectBaselineDto,
      request.user,
    );
  }

  @Put(':projectId/active-baseline')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Set the active project baseline' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectBaseline })
  @ApiBadRequestResponse({ description: 'Draft baseline cannot be active' })
  @ApiForbiddenResponse({ description: 'Project manager access is required' })
  @ApiNotFoundResponse({ description: 'Project or baseline not found' })
  setActiveProjectBaseline(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: SetActiveProjectBaselineDto,
  ): Promise<ProjectBaseline> {
    return this.projectsService.setActiveProjectBaseline(
      projectId,
      input.baselineId,
      request.user,
    );
  }

  @Get(':projectId/baselines')
  @ApiOperation({ summary: 'List project baselines' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectBaseline, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectBaselines(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<ProjectBaseline[]> {
    return this.projectsService.findProjectBaselines(projectId, request.user);
  }

  @Get(':projectId/baselines/:baselineId')
  @ApiOperation({ summary: 'Get a project baseline with snapshot rows' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'baselineId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectBaseline })
  @ApiNotFoundResponse({ description: 'Project or baseline not found' })
  findProjectBaseline(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('baselineId') baselineId: string,
  ): Promise<ProjectBaseline> {
    return this.projectsService.findProjectBaseline(
      projectId,
      baselineId,
      request.user,
    );
  }

  @Get(':projectId/task-dependencies')
  @ApiOperation({ summary: 'List project task dependencies' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiOkResponse({ type: TaskDependency, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectTaskDependencies(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<TaskDependency[]> {
    return this.projectsService.findProjectTaskDependencies(
      projectId,
      request.user,
    );
  }

  @Get(':projectId/task-dependencies/:dependencyId')
  @ApiOperation({ summary: 'Get a project task dependency' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'dependencyId', format: 'uuid' })
  @ApiOkResponse({ type: TaskDependency })
  @ApiNotFoundResponse({ description: 'Project or task dependency not found' })
  findProjectTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('dependencyId') dependencyId: string,
  ): Promise<TaskDependency> {
    return this.projectsService.findProjectTaskDependency(
      projectId,
      dependencyId,
      request.user,
    );
  }

  @Post(':projectId/task-dependencies')
  @ApiOperation({ summary: 'Create a project task dependency' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiCreatedResponse({ type: TaskDependency })
  @ApiNotFoundResponse({ description: 'Project or task not found' })
  @ApiConflictResponse({ description: 'Dependency already exists' })
  createProjectTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() createTaskDependencyDto: CreateTaskDependencyDto,
  ): Promise<TaskDependency> {
    return this.projectsService.createProjectTaskDependency(
      projectId,
      createTaskDependencyDto,
      request.user,
    );
  }

  @Patch(':projectId/task-dependencies/:dependencyId')
  @ApiOperation({ summary: 'Update a project task dependency' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'dependencyId', format: 'uuid' })
  @ApiOkResponse({ type: TaskDependency })
  @ApiNotFoundResponse({ description: 'Project or task dependency not found' })
  @ApiConflictResponse({ description: 'Dependency already exists' })
  updateProjectTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('dependencyId') dependencyId: string,
    @Body() updateTaskDependencyDto: UpdateTaskDependencyDto,
  ): Promise<TaskDependency> {
    return this.projectsService.updateProjectTaskDependency(
      projectId,
      dependencyId,
      updateTaskDependencyDto,
      request.user,
    );
  }

  @Delete(':projectId/task-dependencies/:dependencyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project task dependency' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'dependencyId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project task dependency deleted' })
  @ApiNotFoundResponse({ description: 'Project or task dependency not found' })
  removeProjectTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('dependencyId') dependencyId: string,
  ): Promise<void> {
    return this.projectsService.removeProjectTaskDependency(
      projectId,
      dependencyId,
      request.user,
    );
  }

  @Get(':id/risks')
  @ApiOperation({ summary: 'List project risks' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Risk, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectRisks(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Risk[]> {
    return this.projectsService.findProjectRisks(id, request.user);
  }

  @Get(':id/issues')
  @ApiOperation({ summary: 'List project issues' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Issue, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectIssues(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Issue[]> {
    return this.projectsService.findProjectIssues(id, request.user);
  }

  @Get(':id/assumptions')
  @ApiOperation({ summary: 'List project assumptions' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Assumption, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectAssumptions(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Assumption[]> {
    return this.projectsService.findProjectAssumptions(id, request.user);
  }

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'List project dependencies' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Dependency, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findProjectDependencies(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Dependency[]> {
    return this.projectsService.findProjectDependencies(id, request.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.findOne(id, request.user);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(id, updateProjectDto, request.user);
  }

  @Post(':id/archive')
  @RequirePermissions(PermissionKey.ProjectDelete)
  @ApiOperation({ summary: 'Archive a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.archive(id, request.user);
  }

  @Post(':id/restore')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Restore an archived project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: Project })
  @ApiNotFoundResponse({ description: 'Project not found' })
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.restore(id, request.user);
  }

  @Delete(':id/purge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently purge a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project permanently purged' })
  @ApiForbiddenResponse({
    description: 'Platform administrator access is required',
  })
  @ApiNotFoundResponse({ description: 'Project not found' })
  purge(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.projectsService.purge(id, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.ProjectDelete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a project' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project archived' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.projectsService.remove(id, request.user);
  }
}
