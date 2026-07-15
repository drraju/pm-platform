import { BadRequestException } from '@nestjs/common';
import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { ResourceCalendarAssignmentState } from '../dto/resource-calendar-assignment.dto';
import { Resource } from '../entities/resource.entity';
import { ResourceCalendarAssignmentApiService } from '../resource-calendar-assignment-api.service';
import { ResourceCalendarAssignmentMapper } from '../resource-calendar-assignment.mapper';
import { ResourceCalendarAssignmentService } from '../resource-calendar-assignment.service';
import { ResourceService } from '../resource.service';

const resourceId = '11111111-1111-4111-8111-111111111111';
const calendarId = '22222222-2222-4222-8222-222222222222';
const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '33333333-3333-4333-8333-333333333333',
};

describe('ResourceCalendarAssignmentApiService', () => {
  let service: ResourceCalendarAssignmentApiService;
  let calendarAssignmentService: Record<
    keyof ResourceCalendarAssignmentService,
    jest.Mock
  >;
  let resourceService: Pick<ResourceService, 'findResource'>;
  let resource: Resource;
  let calendar: EnterpriseCalendar;

  beforeEach(() => {
    resource = Object.assign(new Resource(), {
      calendarId,
      id: resourceId,
      updatedAt: new Date('2026-07-14T00:00:00.000Z'),
      updatedById: actor.userId,
    });
    calendar = Object.assign(new EnterpriseCalendar(), {
      id: calendarId,
      name: 'Enterprise Calendar',
      status: CalendarStatus.Active,
    });
    calendarAssignmentService = {
      assignCalendar: jest.fn().mockResolvedValue(resource),
      clearCalendarAssignment: jest.fn().mockResolvedValue(resource),
      getAssignedCalendar: jest.fn().mockResolvedValue(calendar),
      replaceCalendar: jest.fn().mockResolvedValue(resource),
      setCalendar: jest.fn(),
    };
    resourceService = {
      findResource: jest.fn().mockResolvedValue(resource),
    };
    service = new ResourceCalendarAssignmentApiService(
      calendarAssignmentService as unknown as ResourceCalendarAssignmentService,
      resourceService as ResourceService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps and delegates assignment without business logic', async () => {
    const commandMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toAssignCommand',
    );
    const responseMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toResponse',
    );

    const result = await service.assignCalendar(
      resourceId,
      { calendarId },
      actor,
    );

    expect(commandMapper).toHaveBeenCalledWith(resourceId, { calendarId });
    expect(calendarAssignmentService.assignCalendar).toHaveBeenCalledWith(
      { calendarId, resourceId },
      actor,
    );
    expect(responseMapper).toHaveBeenCalledWith(resource, calendar);
    expect(result.assignmentState).toBe(
      ResourceCalendarAssignmentState.Assigned,
    );
  });

  it('maps and delegates replacement', async () => {
    const commandMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toReplaceCommand',
    );
    const retrieveMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toRetrieveCommand',
    );
    const responseMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toResponse',
    );

    const result = await service.replaceCalendar(
      resourceId,
      { calendarId },
      actor,
    );

    expect(commandMapper).toHaveBeenCalledWith(resourceId, { calendarId });
    expect(calendarAssignmentService.replaceCalendar).toHaveBeenCalledWith(
      { calendarId, resourceId },
      actor,
    );
    expect(retrieveMapper).toHaveBeenCalledWith(resourceId);
    expect(calendarAssignmentService.getAssignedCalendar).toHaveBeenCalledWith({
      resourceId,
    });
    expect(responseMapper).toHaveBeenCalledWith(resource, calendar);
    expect(result.assignmentState).toBe(
      ResourceCalendarAssignmentState.Assigned,
    );
  });

  it('maps and delegates clear without Calendar lookup', async () => {
    resource.calendarId = null;

    const result = await service.clearCalendarAssignment(resourceId, {}, actor);

    expect(
      calendarAssignmentService.clearCalendarAssignment,
    ).toHaveBeenCalledWith({ resourceId }, actor);
    expect(
      calendarAssignmentService.getAssignedCalendar,
    ).not.toHaveBeenCalled();
    expect(result.assignmentState).toBe(
      ResourceCalendarAssignmentState.Unassigned,
    );
  });

  it('retrieves Resource and Calendar metadata through domain services', async () => {
    const retrieveMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toRetrieveCommand',
    );
    const responseMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toResponse',
    );

    const result = await service.getCalendarAssignment(resourceId);

    expect(resourceService.findResource).toHaveBeenCalledWith(resourceId);
    expect(retrieveMapper).toHaveBeenCalledWith(resourceId);
    expect(calendarAssignmentService.getAssignedCalendar).toHaveBeenCalledWith({
      resourceId,
    });
    expect(responseMapper).toHaveBeenCalledWith(resource, calendar);
    expect(result.assignmentState).toBe(
      ResourceCalendarAssignmentState.Assigned,
    );
  });

  it('propagates domain failures unchanged', async () => {
    calendarAssignmentService.assignCalendar.mockRejectedValue(
      new BadRequestException('Calendar is not assignable'),
    );

    await expect(
      service.assignCalendar(resourceId, { calendarId }, actor),
    ).rejects.toThrow(BadRequestException);

    expect(
      calendarAssignmentService.getAssignedCalendar,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['replace', 'replaceCalendar'],
    ['clear', 'clearCalendarAssignment'],
  ] as const)(
    'propagates %s failures unchanged',
    async (_operation, method) => {
      const failure = new BadRequestException(`${_operation} failed`);
      calendarAssignmentService[method].mockRejectedValue(failure);

      const operation =
        method === 'replaceCalendar'
          ? service.replaceCalendar(resourceId, { calendarId }, actor)
          : service.clearCalendarAssignment(resourceId, {}, actor);

      await expect(operation).rejects.toBe(failure);
      expect(
        calendarAssignmentService.getAssignedCalendar,
      ).not.toHaveBeenCalled();
    },
  );

  it('propagates retrieve failures without composing a response', async () => {
    const failure = new BadRequestException('retrieve failed');
    const responseMapper = jest.spyOn(
      ResourceCalendarAssignmentMapper,
      'toResponse',
    );
    calendarAssignmentService.getAssignedCalendar.mockRejectedValue(failure);

    await expect(service.getCalendarAssignment(resourceId)).rejects.toBe(
      failure,
    );

    expect(responseMapper).not.toHaveBeenCalled();
  });
});
