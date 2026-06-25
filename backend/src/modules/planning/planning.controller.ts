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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { CreatePlanningDependencyDto } from './dto/create-planning-dependency.dto';
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { PlanningWorkspaceDto } from './dto/planning-workspace.dto';
import { UpdatePlanningTaskScheduleDto } from './dto/update-planning-task-schedule.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { PlanningTaskSchedule } from './entities/planning-task-schedule.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { PlanningService } from './planning.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('projects/:projectId/workspace')
  @ApiOperation({ summary: 'Load the project planning workspace' })
  @ApiOkResponse({ type: PlanningWorkspaceDto })
  getWorkspace(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<PlanningWorkspaceDto> {
    return this.planningService.getWorkspace(projectId, request.user);
  }

  @Patch('projects/:projectId/task-schedules/:taskId')
  @RequirePermissions(PermissionKey.TaskUpdate)
  @ApiOperation({ summary: 'Update a planning schedule row' })
  @ApiOkResponse({ type: PlanningTaskSchedule })
  updateTaskSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() input: UpdatePlanningTaskScheduleDto,
  ): Promise<PlanningTaskSchedule> {
    return this.planningService.updateTaskSchedule(
      projectId,
      taskId,
      input,
      request.user,
    );
  }

  @Post('projects/:projectId/dependencies')
  @RequirePermissions(PermissionKey.TaskCreate)
  @ApiOperation({ summary: 'Create a planning dependency' })
  @ApiCreatedResponse({ type: TaskDependency })
  createDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: CreatePlanningDependencyDto,
  ): Promise<TaskDependency> {
    return this.planningService.createDependency(
      projectId,
      input,
      request.user,
    );
  }

  @Delete('projects/:projectId/dependencies/:dependencyId')
  @RequirePermissions(PermissionKey.TaskDelete)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a planning dependency' })
  @ApiNoContentResponse({ description: 'Planning dependency deleted' })
  deleteDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('dependencyId') dependencyId: string,
  ): Promise<void> {
    return this.planningService.deleteDependency(
      projectId,
      dependencyId,
      request.user,
    );
  }

  @Get('projects/:projectId/critical-path')
  @ApiOperation({ summary: 'Get critical path task IDs' })
  getCriticalPath(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<{ criticalPathTaskIds: string[] }> {
    return this.planningService.getCriticalPath(projectId, request.user);
  }

  @Post('projects/:projectId/resource-allocations')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiCreatedResponse({ type: ResourceAllocation })
  createResourceAllocation(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: CreateResourceAllocationDto,
  ): Promise<ResourceAllocation> {
    return this.planningService.createResourceAllocation(
      projectId,
      input,
      request.user,
    );
  }

  @Patch('projects/:projectId/resource-allocations/:allocationId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOkResponse({ type: ResourceAllocation })
  updateResourceAllocation(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('allocationId') allocationId: string,
    @Body() input: UpdateResourceAllocationDto,
  ): Promise<ResourceAllocation> {
    return this.planningService.updateResourceAllocation(
      projectId,
      allocationId,
      input,
      request.user,
    );
  }

  @Delete('projects/:projectId/resource-allocations/:allocationId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Resource allocation deleted' })
  deleteResourceAllocation(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('allocationId') allocationId: string,
  ): Promise<void> {
    return this.planningService.deleteResourceAllocation(
      projectId,
      allocationId,
      request.user,
    );
  }
}
