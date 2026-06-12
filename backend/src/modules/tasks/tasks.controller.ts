import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { MyTasksSummaryDto } from './dto/my-tasks-summary.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @RequirePermissions(PermissionKey.TaskCreate)
  @ApiCreatedResponse({ type: Task })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasksService.create(createTaskDto, request.user);
  }

  @Get()
  @ApiOkResponse({ type: Task, isArray: true })
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'List tasks assigned to the authenticated user' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'projectId', format: 'uuid', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiOkResponse({ type: Task, isArray: true })
  findMyTasks(
    @Req() request: AuthenticatedRequest,
    @Query() query: MyTasksQueryDto,
  ): Promise<Task[]> {
    return this.tasksService.findMyTasks(request.user.userId, query);
  }

  @Get('my/summary')
  @ApiOperation({
    summary: 'Summarize tasks assigned to the authenticated user',
  })
  @ApiOkResponse({ type: MyTasksSummaryDto })
  getMyTasksSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<MyTasksSummaryDto> {
    return this.tasksService.getMyTasksSummary(request.user.userId);
  }

  @Get(':id')
  @ApiOkResponse({ type: Task })
  findOne(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.TaskUpdate)
  @ApiOkResponse({ type: Task })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.TaskDelete)
  @ApiOkResponse()
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.remove(id, request.user);
  }
}
