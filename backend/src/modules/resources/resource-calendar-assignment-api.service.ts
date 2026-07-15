import { Injectable } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import {
  AssignResourceCalendarDto,
  ClearResourceCalendarAssignmentDto,
  ReplaceResourceCalendarDto,
  ResourceCalendarAssignmentResponseDto,
} from './dto/resource-calendar-assignment.dto';
import { ResourceCalendarAssignmentMapper } from './resource-calendar-assignment.mapper';
import { ResourceCalendarAssignmentService } from './resource-calendar-assignment.service';
import { ResourceService } from './resource.service';

@Injectable()
export class ResourceCalendarAssignmentApiService {
  constructor(
    private readonly calendarAssignmentService: ResourceCalendarAssignmentService,
    private readonly resourceService: ResourceService,
  ) {}

  async assignCalendar(
    resourceId: string,
    input: AssignResourceCalendarDto,
    actor: AuthorizationActor,
  ): Promise<ResourceCalendarAssignmentResponseDto> {
    const resource = await this.calendarAssignmentService.assignCalendar(
      ResourceCalendarAssignmentMapper.toAssignCommand(resourceId, input),
      actor,
    );
    const calendar = await this.calendarAssignmentService.getAssignedCalendar(
      ResourceCalendarAssignmentMapper.toRetrieveCommand(resourceId),
    );

    return ResourceCalendarAssignmentMapper.toResponse(resource, calendar);
  }

  async replaceCalendar(
    resourceId: string,
    input: ReplaceResourceCalendarDto,
    actor: AuthorizationActor,
  ): Promise<ResourceCalendarAssignmentResponseDto> {
    const resource = await this.calendarAssignmentService.replaceCalendar(
      ResourceCalendarAssignmentMapper.toReplaceCommand(resourceId, input),
      actor,
    );
    const calendar = await this.calendarAssignmentService.getAssignedCalendar(
      ResourceCalendarAssignmentMapper.toRetrieveCommand(resourceId),
    );

    return ResourceCalendarAssignmentMapper.toResponse(resource, calendar);
  }

  async clearCalendarAssignment(
    resourceId: string,
    input: ClearResourceCalendarAssignmentDto,
    actor: AuthorizationActor,
  ): Promise<ResourceCalendarAssignmentResponseDto> {
    const resource =
      await this.calendarAssignmentService.clearCalendarAssignment(
        ResourceCalendarAssignmentMapper.toClearCommand(resourceId, input),
        actor,
      );

    return ResourceCalendarAssignmentMapper.toResponse(resource, null);
  }

  async getCalendarAssignment(
    resourceId: string,
  ): Promise<ResourceCalendarAssignmentResponseDto> {
    const resource = await this.resourceService.findResource(resourceId);
    const calendar = await this.calendarAssignmentService.getAssignedCalendar(
      ResourceCalendarAssignmentMapper.toRetrieveCommand(resourceId),
    );

    return ResourceCalendarAssignmentMapper.toResponse(resource, calendar);
  }
}
