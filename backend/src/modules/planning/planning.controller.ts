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
import { CreateProjectBaselineDto } from '../projects/dto/create-project-baseline.dto';
import { ProjectBaseline } from '../projects/entities/project-baseline.entity';
import { CreateTaskDependencyDto } from '../tasks/dto/create-task-dependency.dto';
import { UpdateTaskDependencyDto } from '../tasks/dto/update-task-dependency.dto';
import { TaskDependency } from '../tasks/entities/task-dependency.entity';
import { CriticalPathDto } from './dto/critical-path.dto';
import { CreatePortfolioDependencyDto } from './dto/create-portfolio-dependency.dto';
import { CreatePlanningTaskDto } from './dto/create-planning-task.dto';
import { CreateResourceAllocationDto } from './dto/create-resource-allocation.dto';
import { CreateResourceCapacityDto } from './dto/create-resource-capacity.dto';
import {
  DuplicateWorkPackageDto,
  DuplicateWorkPackageResultDto,
} from './dto/duplicate-work-package.dto';
import {
  PlanningWorkspaceDto,
  PlanningWorkspaceScheduleDto,
} from './dto/planning-workspace.dto';
import { UpdatePlanningTaskScheduleDto } from './dto/update-planning-task-schedule.dto';
import { UpdatePortfolioDependencyDto } from './dto/update-portfolio-dependency.dto';
import { UpdateResourceAllocationDto } from './dto/update-resource-allocation.dto';
import { UpdateResourceCapacityDto } from './dto/update-resource-capacity.dto';
import { PlanningScheduleSnapshot } from './entities/planning-schedule-snapshot.entity';
import { PortfolioDependency } from './entities/portfolio-dependency.entity';
import { ResourceAllocation } from './entities/resource-allocation.entity';
import { ResourceCapacity } from './entities/resource-capacity.entity';
import { ResourceWorkloadSnapshot } from './entities/resource-workload-snapshot.entity';
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
  @ApiOperation({ summary: 'Get the project planning workspace payload' })
  @ApiOkResponse({ type: PlanningWorkspaceDto })
  getWorkspace(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<PlanningWorkspaceDto> {
    return this.planningService.getWorkspace(projectId, request.user);
  }

  @Post('projects/:projectId/workspace/regenerate')
  @ApiOperation({
    summary: 'Regenerate the project planning workspace snapshot',
  })
  @ApiCreatedResponse({ type: PlanningWorkspaceDto })
  regenerateWorkspace(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<PlanningWorkspaceDto> {
    return this.planningService.regenerateWorkspace(projectId, request.user);
  }

  @Get('projects/:projectId/schedule')
  @ApiOperation({ summary: 'Get the latest project schedule snapshot' })
  @ApiOkResponse({ type: PlanningScheduleSnapshot })
  getLatestSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<PlanningScheduleSnapshot | null> {
    return this.planningService.getLatestSchedule(projectId, request.user);
  }

  @Post('projects/:projectId/schedule/recalculate')
  @ApiOperation({ summary: 'Request a project schedule recalculation' })
  @ApiCreatedResponse({ type: PlanningScheduleSnapshot })
  requestScheduleRecalculation(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<PlanningScheduleSnapshot> {
    return this.planningService.requestScheduleRecalculation(
      projectId,
      request.user,
    );
  }

  @Patch('projects/:projectId/task-schedules/:scheduleId')
  @ApiOperation({ summary: 'Update a planning task schedule row' })
  @ApiOkResponse({ type: PlanningWorkspaceScheduleDto })
  updatePlanningTaskSchedule(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() input: UpdatePlanningTaskScheduleDto,
  ): Promise<PlanningWorkspaceScheduleDto> {
    return this.planningService.updatePlanningTaskSchedule(
      projectId,
      scheduleId,
      input,
      request.user,
    );
  }

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a task from the planning workspace' })
  @ApiCreatedResponse({ type: PlanningWorkspaceScheduleDto })
  createPlanningTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: CreatePlanningTaskDto,
  ): Promise<PlanningWorkspaceScheduleDto> {
    return this.planningService.createPlanningTask(
      projectId,
      input,
      request.user,
    );
  }

  @Post('projects/:projectId/tasks/:taskId/duplicate-work-package')
  @ApiOperation({ summary: 'Duplicate a Summary Task work package' })
  @ApiCreatedResponse({ type: DuplicateWorkPackageResultDto })
  duplicateWorkPackage(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() input: DuplicateWorkPackageDto,
  ): Promise<DuplicateWorkPackageResultDto> {
    return this.planningService.duplicateWorkPackage(
      projectId,
      taskId,
      input,
      request.user,
    );
  }

  @Delete('projects/:projectId/work-packages/:summaryTaskId')
  @ApiOperation({ summary: 'Remove a duplicated work package for undo' })
  @ApiOkResponse({ type: PlanningWorkspaceDto })
  removeDuplicatedWorkPackage(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('summaryTaskId') summaryTaskId: string,
  ): Promise<PlanningWorkspaceDto> {
    return this.planningService.removeDuplicatedWorkPackage(
      projectId,
      summaryTaskId,
      request.user,
    );
  }

  @Get('projects/:projectId/critical-path')
  @ApiOperation({ summary: 'Get the latest critical path task IDs' })
  @ApiOkResponse({ type: CriticalPathDto })
  getCriticalPath(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<CriticalPathDto> {
    return this.planningService.getCriticalPath(projectId, request.user);
  }

  @Post('projects/:projectId/baselines')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Capture a planning baseline' })
  @ApiCreatedResponse({ type: ProjectBaseline })
  captureBaseline(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: CreateProjectBaselineDto,
  ): Promise<ProjectBaseline> {
    return this.planningService.captureBaseline(projectId, input, request.user);
  }

  @Get('projects/:projectId/baselines')
  @ApiOperation({ summary: 'List planning baselines' })
  @ApiOkResponse({ type: ProjectBaseline, isArray: true })
  listBaselines(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<ProjectBaseline[]> {
    return this.planningService.listBaselines(projectId, request.user);
  }

  @Post('projects/:projectId/dependencies')
  @ApiOperation({ summary: 'Create a planning task dependency' })
  @ApiCreatedResponse({ type: TaskDependency })
  createTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: CreateTaskDependencyDto,
  ): Promise<TaskDependency> {
    return this.planningService.createTaskDependency(
      projectId,
      input,
      request.user,
    );
  }

  @Get('projects/:projectId/dependencies')
  @ApiOperation({ summary: 'List planning task dependencies' })
  @ApiOkResponse({ type: TaskDependency, isArray: true })
  listTaskDependencies(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<TaskDependency[]> {
    return this.planningService.listTaskDependencies(projectId, request.user);
  }

  @Patch('projects/:projectId/dependencies/:dependencyId')
  @ApiOperation({ summary: 'Update a planning task dependency' })
  @ApiOkResponse({ type: TaskDependency })
  updateTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('dependencyId') dependencyId: string,
    @Body() input: UpdateTaskDependencyDto,
  ): Promise<TaskDependency> {
    return this.planningService.updateTaskDependency(
      projectId,
      dependencyId,
      input,
      request.user,
    );
  }

  @Delete('projects/:projectId/dependencies/:dependencyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a planning task dependency' })
  @ApiNoContentResponse({ description: 'Planning task dependency deleted' })
  removeTaskDependency(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('dependencyId') dependencyId: string,
  ): Promise<void> {
    return this.planningService.removeTaskDependency(
      projectId,
      dependencyId,
      request.user,
    );
  }

  @Post('projects/:projectId/resource-capacities')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiCreatedResponse({ type: ResourceCapacity })
  createResourceCapacity(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() input: CreateResourceCapacityDto,
  ): Promise<ResourceCapacity> {
    return this.planningService.createResourceCapacity(
      projectId,
      input,
      request.user,
    );
  }

  @Get('projects/:projectId/resource-capacities')
  @ApiOkResponse({ type: ResourceCapacity, isArray: true })
  listResourceCapacities(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<ResourceCapacity[]> {
    return this.planningService.listResourceCapacities(projectId, request.user);
  }

  @Patch('projects/:projectId/resource-capacities/:capacityId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOkResponse({ type: ResourceCapacity })
  updateResourceCapacity(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('capacityId') capacityId: string,
    @Body() input: UpdateResourceCapacityDto,
  ): Promise<ResourceCapacity> {
    return this.planningService.updateResourceCapacity(
      projectId,
      capacityId,
      input,
      request.user,
    );
  }

  @Delete('projects/:projectId/resource-capacities/:capacityId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Resource capacity deleted' })
  removeResourceCapacity(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('capacityId') capacityId: string,
  ): Promise<void> {
    return this.planningService.removeResourceCapacity(
      projectId,
      capacityId,
      request.user,
    );
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

  @Get('projects/:projectId/resource-allocations')
  @ApiOkResponse({ type: ResourceAllocation, isArray: true })
  listResourceAllocations(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<ResourceAllocation[]> {
    return this.planningService.listResourceAllocations(
      projectId,
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
  removeResourceAllocation(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('allocationId') allocationId: string,
  ): Promise<void> {
    return this.planningService.removeResourceAllocation(
      projectId,
      allocationId,
      request.user,
    );
  }

  @Get('projects/:projectId/resource-heat-map')
  @ApiOkResponse({ type: ResourceWorkloadSnapshot, isArray: true })
  listResourceHeatMap(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ): Promise<ResourceWorkloadSnapshot[]> {
    return this.planningService.listResourceHeatMap(projectId, request.user);
  }

  @Get('portfolio/timeline')
  @ApiOperation({ summary: 'Get portfolio roadmap schedules and dependencies' })
  getPortfolioTimeline(@Req() request: AuthenticatedRequest) {
    return this.planningService.getPortfolioTimeline(request.user);
  }

  @Post('portfolio/dependencies')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiCreatedResponse({ type: PortfolioDependency })
  createPortfolioDependency(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreatePortfolioDependencyDto,
  ): Promise<PortfolioDependency> {
    return this.planningService.createPortfolioDependency(input, request.user);
  }

  @Patch('portfolio/dependencies/:dependencyId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOkResponse({ type: PortfolioDependency })
  updatePortfolioDependency(
    @Req() request: AuthenticatedRequest,
    @Param('dependencyId') dependencyId: string,
    @Body() input: UpdatePortfolioDependencyDto,
  ): Promise<PortfolioDependency> {
    return this.planningService.updatePortfolioDependency(
      dependencyId,
      input,
      request.user,
    );
  }

  @Delete('portfolio/dependencies/:dependencyId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Portfolio dependency deleted' })
  removePortfolioDependency(
    @Req() request: AuthenticatedRequest,
    @Param('dependencyId') dependencyId: string,
  ): Promise<void> {
    return this.planningService.removePortfolioDependency(
      dependencyId,
      request.user,
    );
  }
}
