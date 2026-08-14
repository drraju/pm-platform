import {
  Body,
  Controller,
  Get,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AiPlaygroundService,
  CapabilityExecutionRequest,
  CapabilityExecutionService,
  EnterpriseCapabilityRegistryService,
} from '../../ai';
import type {
  EnterpriseContextSourceData,
  PlaygroundExecutionHistoryItem,
  PlaygroundExecutionTrace,
  PlaygroundRegistrySnapshot,
  PlaygroundRequest,
  PlaygroundResponse,
} from '../../ai';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { ProjectVisibilityService } from '../projects/project-visibility.service';
import { ProjectsService } from '../projects/projects.service';

type CapabilityExecutionBody = {
  contextSourceData?: unknown;
  input: unknown;
  projectIds?: readonly string[];
  requestId?: string;
  workspaceId?: string;
};

type AuthenticatedRequest = Request & {
  user: { email?: string; roleId: string; userId: string };
};

@ApiTags('ai-playground')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-playground')
export class AiPlaygroundController {
  constructor(
    private readonly playground: AiPlaygroundService,
    private readonly enterpriseCapabilities: EnterpriseCapabilityRegistryService,
    private readonly capabilityExecution: CapabilityExecutionService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly projectVisibilityService: ProjectVisibilityService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get('capabilities')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ description: 'List available enterprise AI capabilities.' })
  capabilities() {
    return this.enterpriseCapabilities.getCapabilities();
  }

  @Post('capabilities/:capabilityId/execute')
  @RequirePermissions(PermissionKey.ProjectRead)
  @ApiOkResponse({ description: 'Execute an enterprise AI capability.' })
  async executeCapability(
    @Param('capabilityId') capabilityId: string,
    @Body() body: CapabilityExecutionBody,
    @Req() request: AuthenticatedRequest,
  ) {
    const actor = request.user;
    const requestedProjectIds = [...new Set(body.projectIds ?? [])];
    const projectAccess = await Promise.all(
      requestedProjectIds.map((projectId) =>
        this.projectVisibilityService.canViewProject(projectId, actor),
      ),
    );
    if (projectAccess.some((canView) => !canView)) {
      throw new ForbiddenException('AI project scope is restricted');
    }
    const [grantedPermissions, roleName, isExternal] = await Promise.all([
      this.authorizationPolicyService.getGrantedPermissionKeys(actor),
      this.authorizationPolicyService.getActorRoleName(actor),
      this.authorizationPolicyService.isExternalActor(actor),
    ]);
    const contextSourceData = await this.assembleServerContext(
      requestedProjectIds,
      actor,
      roleName,
    );
    const executionRequest: CapabilityExecutionRequest = {
      actorId: actor.userId,
      capabilityId,
      contextAuthorization: {
        allowedProjectIds: requestedProjectIds,
        allowSensitiveContext: !isExternal,
      },
      contextSourceData,
      correlationId: `${body.requestId ?? Date.now()}:correlation`,
      input: body.input,
      permissions: [...grantedPermissions],
      projectIds: requestedProjectIds,
      requestId: body.requestId ?? `capability-${Date.now()}`,
      roles: roleName ? [roleName] : [],
    };
    return this.capabilityExecution.execute(executionRequest);
  }

  private async assembleServerContext(
    projectIds: string[],
    actor: AuthenticatedRequest['user'],
    roleName: string | null,
  ): Promise<EnterpriseContextSourceData> {
    const scopes = await Promise.all(
      projectIds.map(async (projectId) => {
        const [project, tasks, members] = await Promise.all([
          this.projectsService.findOne(projectId, actor),
          this.projectsService.findProjectTasks(projectId, {}, actor),
          this.projectsService.findMembers(projectId, actor),
        ]);
        return { members, project, tasks };
      }),
    );

    return {
      execution: scopes.flatMap(({ tasks }) =>
        tasks.flatMap((task) => {
          const update = task.latestExecutionUpdate;
          return update
            ? [
                {
                  id: update.id,
                  nextStep: update.nextStep,
                  projectId: task.projectId,
                  status: update.status,
                  taskId: task.id,
                  updateNotes: update.updateNotes,
                  updatedOn:
                    update.updatedOn instanceof Date
                      ? update.updatedOn.toISOString()
                      : update.updatedOn,
                },
              ]
            : [];
        }),
      ),
      project: scopes.map(({ project }) => ({
        description: project.description,
        id: project.id,
        name: project.name,
        ownerId: project.ownerId,
        status: project.status,
      })),
      raid: scopes.flatMap(({ project }) =>
        [
          ...(project.risks ?? []),
          ...(project.issues ?? []),
          ...(project.assumptions ?? []),
          ...(project.dependencies ?? []),
        ].map((item) => ({
          id: item.id,
          projectId: project.id,
          status: item.status,
          title: item.title,
          type: item.type,
        })),
      ),
      task: scopes.flatMap(({ tasks }) =>
        tasks.map((task) => ({
          assigneeId: task.assigneeId,
          dueDate: task.dueDate,
          id: task.id,
          percentComplete: task.percentComplete,
          priority: task.priority,
          projectId: task.projectId,
          status: task.status,
          title: task.title,
        })),
      ),
      team: scopes.flatMap(({ members }) =>
        members.map((member) => ({
          id: member.id,
          projectId: member.projectId,
          role: member.role,
          userId: member.userId,
        })),
      ),
      user: [
        {
          email: actor.email,
          id: actor.userId,
          role: roleName,
        },
      ],
    };
  }

  @Post('execute')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ description: 'Execute an internal AI Playground request.' })
  execute(@Body() request: PlaygroundRequest): Promise<PlaygroundResponse> {
    return this.playground.execute(request);
  }

  @Get('history')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ description: 'List recent AI Playground executions.' })
  history(): readonly PlaygroundExecutionHistoryItem[] {
    return this.playground.getExecutionHistory();
  }

  @Get('history/:executionId')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({
    description: 'Read a stored AI Playground execution trace.',
  })
  trace(@Param('executionId') executionId: string): PlaygroundExecutionTrace {
    const trace = this.playground.findExecutionTrace(executionId);

    if (!trace) {
      throw new NotFoundException('AI Playground execution trace not found');
    }

    return trace;
  }

  @Post('history/:executionId/replay')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ description: 'Replay an AI Playground execution trace.' })
  replay(
    @Param('executionId') executionId: string,
  ): Promise<PlaygroundResponse> {
    return this.playground.replayByExecutionId(executionId);
  }

  @Get('registries')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ description: 'Inspect AI Playground registry metadata.' })
  registries(): PlaygroundRegistrySnapshot {
    return this.playground.inspectRegistries();
  }
}
