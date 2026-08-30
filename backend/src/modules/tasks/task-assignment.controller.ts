import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangeTaskAssignmentDto } from './dto/change-task-assignment.dto';
import { Task } from './entities/task.entity';
import { TaskAssignmentService } from './task-assignment.service';

type AuthenticatedRequest = Request & {
  user: {
    email: string;
    roleId: string;
    userId: string;
  };
};

@ApiTags('projects')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Task assignment capability required' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/tasks/:taskId')
export class TaskAssignmentController {
  constructor(private readonly taskAssignmentService: TaskAssignmentService) {}

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a task assignment' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: Task })
  @ApiBadRequestResponse({
    description: 'Invalid project, task, or assignee identifier',
  })
  @ApiNotFoundResponse({ description: 'Project, task, or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee is inactive or ineligible' })
  assign(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() input: ChangeTaskAssignmentDto,
  ): Promise<Task> {
    return this.taskAssignmentService.changeTaskAssignment(
      projectId,
      taskId,
      input.assigneeId,
      request.user,
    );
  }

  @Post('reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change an existing task assignment' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: Task })
  @ApiBadRequestResponse({
    description: 'Invalid project, task, or assignee identifier',
  })
  @ApiNotFoundResponse({ description: 'Project, task, or assignee not found' })
  @ApiConflictResponse({ description: 'Assignee is inactive or ineligible' })
  reassign(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() input: ChangeTaskAssignmentDto,
  ): Promise<Task> {
    return this.taskAssignmentService.changeTaskAssignment(
      projectId,
      taskId,
      input.assigneeId,
      request.user,
    );
  }
}
