import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AssignResourceCalendarDto,
  ClearResourceCalendarAssignmentDto,
  ResourceCalendarAssignmentResponseDto,
} from './dto/resource-calendar-assignment.dto';
import { ResourceCalendarAssignmentApiService } from './resource-calendar-assignment-api.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
    roleId: string;
  };
};

@ApiTags('resource-calendar-assignment')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient permissions' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('resources/:resourceId/calendar')
export class ResourceCalendarAssignmentController {
  constructor(
    private readonly resourceCalendarAssignmentApiService: ResourceCalendarAssignmentApiService,
  ) {}

  @Get()
  @RequirePermissions(PermissionKey.ResourceRead)
  @ApiOperation({ summary: 'Get the assigned Resource Calendar' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiOkResponse({ type: ResourceCalendarAssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid Resource identifier' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  getCalendarAssignment(
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
  ): Promise<ResourceCalendarAssignmentResponseDto> {
    return this.resourceCalendarAssignmentApiService.getCalendarAssignment(
      resourceId,
    );
  }

  @Put()
  @RequirePermissions(PermissionKey.ResourceUpdate)
  @ApiOperation({ summary: 'Assign or replace the Resource Calendar' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiBody({ type: AssignResourceCalendarDto })
  @ApiOkResponse({ type: ResourceCalendarAssignmentResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid assignment payload or Calendar is not assignable',
  })
  @ApiNotFoundResponse({ description: 'Resource or Calendar not found' })
  putCalendarAssignment(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() input: AssignResourceCalendarDto,
  ): Promise<ResourceCalendarAssignmentResponseDto> {
    return this.resourceCalendarAssignmentApiService.assignCalendar(
      resourceId,
      input,
      request.user,
    );
  }

  @Delete()
  @RequirePermissions(PermissionKey.ResourceUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the Resource Calendar assignment' })
  @ApiParam({ name: 'resourceId', format: 'uuid' })
  @ApiBody({ type: ClearResourceCalendarAssignmentDto, required: false })
  @ApiNoContentResponse({ description: 'Calendar assignment cleared' })
  @ApiBadRequestResponse({ description: 'Invalid Resource identifier' })
  @ApiNotFoundResponse({ description: 'Resource not found' })
  async clearCalendarAssignment(
    @Req() request: AuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() input: ClearResourceCalendarAssignmentDto,
  ): Promise<void> {
    await this.resourceCalendarAssignmentApiService.clearCalendarAssignment(
      resourceId,
      input,
      request.user,
    );
  }
}
