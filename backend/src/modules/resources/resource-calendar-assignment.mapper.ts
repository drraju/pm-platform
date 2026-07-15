import { EnterpriseCalendar } from '../calendars/entities/enterprise-calendar.entity';
import {
  AssignResourceCalendarDto,
  ClearResourceCalendarAssignmentDto,
  ReplaceResourceCalendarDto,
  ResourceCalendarAssignmentResponseDto,
  ResourceCalendarAssignmentState,
} from './dto/resource-calendar-assignment.dto';
import { Resource } from './entities/resource.entity';
import {
  AssignCalendarCommand,
  ClearCalendarAssignmentCommand,
  RetrieveCalendarAssignmentCommand,
} from './resource-calendar-assignment.commands';

export class ResourceCalendarAssignmentMapper {
  static toAssignCommand(
    resourceId: string,
    input: AssignResourceCalendarDto,
  ): AssignCalendarCommand {
    return {
      calendarId: input.calendarId,
      resourceId,
    };
  }

  static toReplaceCommand(
    resourceId: string,
    input: ReplaceResourceCalendarDto,
  ): AssignCalendarCommand {
    return {
      calendarId: input.calendarId,
      resourceId,
    };
  }

  static toClearCommand(
    resourceId: string,
    input: ClearResourceCalendarAssignmentDto,
  ): ClearCalendarAssignmentCommand {
    void input;
    return { resourceId };
  }

  static toRetrieveCommand(
    resourceId: string,
  ): RetrieveCalendarAssignmentCommand {
    return { resourceId };
  }

  static toResponse(
    resource: Resource,
    calendar: EnterpriseCalendar | null,
  ): ResourceCalendarAssignmentResponseDto {
    const assignedCalendarId = resource.calendarId ?? null;

    return {
      assignedCalendarId,
      assignmentState: assignedCalendarId
        ? ResourceCalendarAssignmentState.Assigned
        : ResourceCalendarAssignmentState.Unassigned,
      calendarName: calendar?.name ?? null,
      calendarStatus: calendar?.status ?? null,
      effectiveCalendarId: assignedCalendarId,
      resourceId: resource.id,
      updatedAt: resource.updatedAt,
      updatedBy: resource.updatedById ?? null,
    };
  }
}
