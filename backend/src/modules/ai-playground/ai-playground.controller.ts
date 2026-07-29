import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AiPlaygroundService } from '../../ai';
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

@ApiTags('ai-playground')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ai-playground')
export class AiPlaygroundController {
  constructor(private readonly playground: AiPlaygroundService) {}

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
