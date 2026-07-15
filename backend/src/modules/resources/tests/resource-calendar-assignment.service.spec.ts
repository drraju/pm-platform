import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { Resource } from '../entities/resource.entity';
import { ResourceCalendarAssignmentService } from '../resource-calendar-assignment.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  manager: {
    save: jest.Mock;
    transaction: jest.Mock;
  };
};

const resourceId = '11111111-1111-4111-8111-111111111111';
const calendarId = '22222222-2222-4222-8222-222222222222';
const replacementCalendarId = '33333333-3333-4333-8333-333333333333';
const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '44444444-4444-4444-8444-444444444444',
};

describe('ResourceCalendarAssignmentService', () => {
  let service: ResourceCalendarAssignmentService;
  let resourcesRepository: MockRepository<Resource>;
  let validationService: {
    validateAssignment: jest.Mock;
    validateResourceCommand: jest.Mock;
  };
  let calendarLookupService: { findCalendarReference: jest.Mock };
  let resource: Resource;
  let calendar: EnterpriseCalendar;

  beforeEach(() => {
    resource = Object.assign(new Resource(), {
      calendarId: null,
      id: resourceId,
    });
    calendar = Object.assign(new EnterpriseCalendar(), {
      id: calendarId,
      status: CalendarStatus.Active,
    });
    resourcesRepository = {
      manager: {
        save: jest.fn((_entity: typeof Resource, input: Resource) =>
          Promise.resolve(input),
        ),
        transaction: jest.fn(
          (
            callback: (
              manager: MockRepository<Resource>['manager'],
            ) => Promise<Resource>,
          ) => callback(resourcesRepository.manager),
        ),
      },
    };
    validationService = {
      validateAssignment: jest.fn().mockResolvedValue({ calendar, resource }),
      validateResourceCommand: jest.fn().mockResolvedValue(resource),
    };
    calendarLookupService = {
      findCalendarReference: jest.fn().mockResolvedValue(calendar),
    };
    service = new ResourceCalendarAssignmentService(
      resourcesRepository as Repository<Resource>,
      validationService as never,
      calendarLookupService as never,
    );
  });

  it('assigns a Calendar transactionally and updates Resource audit metadata', async () => {
    const assigned = await service.assignCalendar(
      { calendarId, resourceId },
      actor,
    );

    expect(resourcesRepository.manager.transaction).toHaveBeenCalled();
    expect(validationService.validateAssignment).toHaveBeenCalledWith(
      { calendarId, resourceId },
      resourcesRepository.manager,
    );
    expect(resourcesRepository.manager.save).toHaveBeenCalledWith(
      Resource,
      resource,
    );
    expect(assigned).toEqual(
      expect.objectContaining({
        calendarId,
        updatedById: actor.userId,
      }),
    );
  });

  it('replaces an existing Calendar through the same aggregate boundary', async () => {
    resource.calendarId = calendarId;

    const replaced = await service.replaceCalendar(
      { calendarId: replacementCalendarId, resourceId },
      actor,
    );

    expect(replaced.calendarId).toBe(replacementCalendarId);
    expect(replaced.updatedById).toBe(actor.userId);
    expect(resourcesRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(validationService.validateAssignment).toHaveBeenCalledWith(
      { calendarId: replacementCalendarId, resourceId },
      resourcesRepository.manager,
    );
    expect(resourcesRepository.manager.save).toHaveBeenCalledWith(
      Resource,
      resource,
    );
    expect(resourcesRepository.manager.save).toHaveBeenCalledTimes(1);
  });

  it('clears an assignment transactionally and updates Resource audit metadata', async () => {
    resource.calendarId = calendarId;
    resource.calendar = calendar;

    const cleared = await service.clearCalendarAssignment(
      { resourceId },
      actor,
    );

    expect(resourcesRepository.manager.transaction).toHaveBeenCalled();
    expect(validationService.validateResourceCommand).toHaveBeenCalledWith(
      { resourceId },
      resourcesRepository.manager,
    );
    expect(cleared.calendarId).toBeNull();
    expect(cleared.calendar).toBeNull();
    expect(cleared.updatedById).toBe(actor.userId);
    expect(resourcesRepository.manager.save).toHaveBeenCalledTimes(1);
  });

  it('retrieves assigned Calendar metadata through the Calendar lookup boundary', async () => {
    resource.calendarId = calendarId;

    await expect(service.getAssignedCalendar({ resourceId })).resolves.toBe(
      calendar,
    );

    expect(calendarLookupService.findCalendarReference).toHaveBeenCalledWith(
      calendarId,
    );
  });

  it('returns no Calendar when the Resource is unassigned', async () => {
    await expect(
      service.getAssignedCalendar({ resourceId }),
    ).resolves.toBeNull();

    expect(calendarLookupService.findCalendarReference).not.toHaveBeenCalled();
  });

  it('returns archived Calendar metadata for an existing assignment', async () => {
    resource.calendarId = calendarId;
    calendar.status = CalendarStatus.Archived;

    await expect(service.getAssignedCalendar({ resourceId })).resolves.toEqual(
      expect.objectContaining({ status: CalendarStatus.Archived }),
    );
  });

  it('throws when an assigned Calendar disappears after Resource validation', async () => {
    resource.calendarId = calendarId;
    calendarLookupService.findCalendarReference.mockResolvedValue(null);

    await expect(service.getAssignedCalendar({ resourceId })).rejects.toThrow(
      NotFoundException,
    );

    expect(validationService.validateResourceCommand).toHaveBeenCalledWith({
      resourceId,
    });
    expect(calendarLookupService.findCalendarReference).toHaveBeenCalledWith(
      calendarId,
    );
  });

  it('does not persist when assignment validation fails', async () => {
    validationService.validateAssignment.mockRejectedValue(
      new BadRequestException('Calendar is not assignable'),
    );

    await expect(
      service.assignCalendar({ calendarId, resourceId }),
    ).rejects.toThrow(BadRequestException);

    expect(resourcesRepository.manager.save).not.toHaveBeenCalled();
  });

  it('does not persist when clear validation fails', async () => {
    validationService.validateResourceCommand.mockRejectedValue(
      new BadRequestException('Resource cannot be cleared'),
    );

    await expect(
      service.clearCalendarAssignment({ resourceId }, actor),
    ).rejects.toThrow(BadRequestException);

    expect(validationService.validateResourceCommand).toHaveBeenCalledWith(
      { resourceId },
      resourcesRepository.manager,
    );
    expect(resourcesRepository.manager.save).not.toHaveBeenCalled();
  });

  it('does not persist an idempotent assignment or clear operation', async () => {
    resource.calendarId = calendarId;

    await service.assignCalendar({ calendarId, resourceId }, actor);
    resource.calendarId = null;
    await service.clearCalendarAssignment({ resourceId }, actor);

    expect(resourcesRepository.manager.save).not.toHaveBeenCalled();
  });
});
