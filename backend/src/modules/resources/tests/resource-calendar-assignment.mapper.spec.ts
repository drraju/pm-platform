import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { ResourceCalendarAssignmentState } from '../dto/resource-calendar-assignment.dto';
import { Resource } from '../entities/resource.entity';
import { ResourceCalendarAssignmentMapper } from '../resource-calendar-assignment.mapper';

const resourceId = '11111111-1111-4111-8111-111111111111';
const calendarId = '22222222-2222-4222-8222-222222222222';

describe('ResourceCalendarAssignmentMapper', () => {
  it('maps transport DTOs to domain commands', () => {
    expect(
      ResourceCalendarAssignmentMapper.toAssignCommand(resourceId, {
        calendarId,
      }),
    ).toEqual({ calendarId, resourceId });
    expect(
      ResourceCalendarAssignmentMapper.toReplaceCommand(resourceId, {
        calendarId,
      }),
    ).toEqual({ calendarId, resourceId });
    expect(
      ResourceCalendarAssignmentMapper.toClearCommand(resourceId, {}),
    ).toEqual({ resourceId });
    expect(
      ResourceCalendarAssignmentMapper.toRetrieveCommand(resourceId),
    ).toEqual({ resourceId });
  });

  it('maps assigned Calendar metadata to a response', () => {
    const updatedAt = new Date('2026-07-14T00:00:00.000Z');
    const resource = Object.assign(new Resource(), {
      calendarId,
      id: resourceId,
      updatedAt,
      updatedById: '33333333-3333-4333-8333-333333333333',
    });
    const calendar = Object.assign(new EnterpriseCalendar(), {
      id: calendarId,
      name: 'Enterprise Calendar',
      status: CalendarStatus.Active,
    });

    expect(
      ResourceCalendarAssignmentMapper.toResponse(resource, calendar),
    ).toEqual({
      assignedCalendarId: calendarId,
      assignmentState: ResourceCalendarAssignmentState.Assigned,
      calendarName: 'Enterprise Calendar',
      calendarStatus: CalendarStatus.Active,
      effectiveCalendarId: calendarId,
      resourceId,
      updatedAt,
      updatedBy: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('maps a null assignment without Calendar definition data', () => {
    const updatedAt = new Date('2026-07-14T00:00:00.000Z');
    const resource = Object.assign(new Resource(), {
      calendarId: null,
      id: resourceId,
      updatedAt,
      updatedById: null,
    });

    expect(ResourceCalendarAssignmentMapper.toResponse(resource, null)).toEqual(
      {
        assignedCalendarId: null,
        assignmentState: ResourceCalendarAssignmentState.Unassigned,
        calendarName: null,
        calendarStatus: null,
        effectiveCalendarId: null,
        resourceId,
        updatedAt,
        updatedBy: null,
      },
    );
  });
});
