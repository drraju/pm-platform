import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CalendarValidationService } from '../calendar-validation.service';
import { EnterpriseCalendarException } from '../entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../entities/enterprise-calendar.entity';
import { CalendarExceptionType } from '../enums/calendar-exception-type.enum';
import { CalendarStatus } from '../enums/calendar-status.enum';
import { EnterpriseCalendarService } from '../enterprise-calendar.service';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const actor = {
  email: 'admin@example.com',
  roleId: 'admin-role-id',
  userId: '4d136f2c-f4b2-4d33-b351-397de2a93dc3',
};

describe('EnterpriseCalendarService', () => {
  let service: EnterpriseCalendarService;
  let calendarsRepository: MockRepository<EnterpriseCalendar>;
  let exceptionsRepository: MockRepository<EnterpriseCalendarException>;

  beforeEach(() => {
    calendarsRepository = {
      create: jest.fn((input) => input),
      findOne: jest.fn(),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'calendar-id', ...input }),
      ),
    };
    exceptionsRepository = {
      create: jest.fn((input) => input),
      save: jest.fn((input) =>
        Promise.resolve({ id: 'exception-id', ...input }),
      ),
    };

    service = new EnterpriseCalendarService(
      calendarsRepository as Repository<EnterpriseCalendar>,
      exceptionsRepository as Repository<EnterpriseCalendarException>,
      new CalendarValidationService(),
    );
  });

  it('creates an enterprise calendar with default working metadata', async () => {
    await expect(
      service.createEnterpriseCalendar({ name: ' Corporate Calendar ' }, actor),
    ).resolves.toEqual(
      expect.objectContaining({
        createdById: actor.userId,
        defaultWorkingDays: [1, 2, 3, 4, 5],
        hoursPerDay: 8,
        name: 'Corporate Calendar',
        status: CalendarStatus.Active,
        timezone: 'UTC',
        updatedById: actor.userId,
        workingDayEnd: '17:00:00',
        workingDayStart: '09:00:00',
      }),
    );
  });

  it('archives an enterprise calendar without deleting it', async () => {
    calendarsRepository.findOne?.mockResolvedValue({
      id: 'calendar-id',
      status: CalendarStatus.Active,
    });

    await expect(
      service.archiveEnterpriseCalendar('calendar-id', actor),
    ).resolves.toEqual(
      expect.objectContaining({
        status: CalendarStatus.Archived,
        updatedById: actor.userId,
      }),
    );
  });

  it('creates an exception only for an existing enterprise calendar', async () => {
    calendarsRepository.findOne?.mockResolvedValue({ id: 'calendar-id' });

    await expect(
      service.createEnterpriseCalendarException(
        'calendar-id',
        {
          date: '2026-12-25',
          exceptionType: CalendarExceptionType.Holiday,
          name: ' Christmas ',
        },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        createdById: actor.userId,
        enterpriseCalendarId: 'calendar-id',
        name: 'Christmas',
        updatedById: actor.userId,
      }),
    );
  });

  it('throws when the enterprise calendar is missing', async () => {
    calendarsRepository.findOne?.mockResolvedValue(null);

    await expect(service.findEnterpriseCalendar('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
