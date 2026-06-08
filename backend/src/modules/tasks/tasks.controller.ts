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
import { TaskStatus } from '../../common/enums/task-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedPrincipal } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { PermissionKey } from '../authorization/permissions';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { MyTasksSummaryDto } from './dto/my-tasks-summary.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.ProjectTasksCreate)
  @ApiCreatedResponse({ type: Task })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasksService.createForUser(request.user, createTaskDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.ProjectTasksRead)
  @ApiOkResponse({ type: Task, isArray: true })
  findAll(@Req() request: AuthenticatedRequest): Promise<Task[]> {
    return this.tasksService.findAllForUser(request.user);
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
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Task> {
    return this.tasksService.findOneForUser(request.user, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(
    PermissionKey.ProjectTasksUpdateAny,
    PermissionKey.ProjectTasksUpdateOwn,
  )
  @ApiOkResponse({ type: Task })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.updateForUser(request.user, id, updateTaskDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.ProjectTasksDelete)
  @ApiOkResponse()
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.removeForUser(request.user, id);
  }
}
