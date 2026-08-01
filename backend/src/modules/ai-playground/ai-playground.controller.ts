import {
  Body,
  Controller,
  Get,
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

type CapabilityExecutionBody = {
  contextSourceData?: unknown;
  input: unknown;
  projectIds?: readonly string[];
  requestId?: string;
  workspaceId?: string;
};

type AuthenticatedRequest = Request & {
  user: { userId: string };
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
  executeCapability(
    @Param('capabilityId') capabilityId: string,
    @Body() body: CapabilityExecutionBody,
    @Req() request: AuthenticatedRequest,
  ) {
    const executionRequest: CapabilityExecutionRequest = {
      actorId: request.user.userId,
      capabilityId,
      contextSourceData: body.contextSourceData,
      correlationId: `${body.requestId ?? Date.now()}:correlation`,
      input: body.input,
      permissions: [PermissionKey.ProjectRead],
      projectIds: body.projectIds,
      requestId: body.requestId ?? `capability-${Date.now()}`,
      roles: [],
      workspaceId: body.workspaceId,
    };
    return this.capabilityExecution.execute(executionRequest);
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
