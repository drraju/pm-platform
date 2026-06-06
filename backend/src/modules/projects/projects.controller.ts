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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'List project members' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findMembers(@Param('id') id: string): Promise<ProjectMemberResponseDto[]> {
    return this.projectsService.findMembers(id);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update a project member role' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiOkResponse({ type: ProjectMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Project, user, or membership not found' })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a project member' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Project member removed' })
  @ApiNotFoundResponse({ description: 'Project, user, or membership not found' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.projectsService.removeMember(id, userId);
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
