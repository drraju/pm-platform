import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CalendarValidationService } from '../../calendars/calendar-validation.service';
import { EnterpriseCalendarException } from '../../calendars/entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarExceptionType } from '../../calendars/enums/calendar-exception-type.enum';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { CalendarService, DEFAULT_ORGANIZATION_ID } from '../calendar.service';
import { CalendarType } from '../dto/calendar.dto';

type MockRepository<T extends object = object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const now = new Date('2026-07-08T00:00:00.000Z');

describe('CalendarService', () => {
  let service: CalendarService;
  let calendarsRepository: MockRepository<EnterpriseCalendar>;
  let exceptionsRepository: MockRepository<EnterpriseCalendarException>;

  beforeEach(() => {
    calendarsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((input) =>
        Promise.resolve({
          createdAt: now,
          id: 'calendar-id',
          updatedAt: now,
          ...input,
        }),
      ),
    };
    exceptionsRepository = {
      create: jest.fn((input) => input),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((input) =>
        Promise.resolve({
          createdAt: now,
          id: 'exception-id',
          updatedAt: now,
          ...input,
        }),
      ),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };

    service = new CalendarService(
      calendarsRepository as Repository<EnterpriseCalendar>,
      exceptionsRepository as Repository<EnterpriseCalendarException>,
      new CalendarValidationService(),
    );
  });

  it('creates a calendar response DTO with default enterprise metadata', async () => {
    const result = await service.createCalendar(DEFAULT_ORGANIZATION_ID, {
      name: ' Corporate Calendar ',
      type: CalendarType.Enterprise,
    });

    expect(calendarsRepository.create).toHaveBeenCalledWith({
      defaultWorkingDays: [1, 2, 3, 4, 5],
      description: null,
      hoursPerDay: 8,
      name: 'Corporate Calendar',
      status: CalendarStatus.Active,
      timezone: 'UTC',
      workingDayEnd: '17:00:00',
      workingDayStart: '09:00:00',
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'calendar-id',
        name: 'Corporate Calendar',
        organizationId: DEFAULT_ORGANIZATION_ID,
        type: CalendarType.Enterprise,
      }),
    );
  });

  it('rejects duplicate calendar names', async () => {
    calendarsRepository.findOne?.mockResolvedValueOnce({ id: 'existing-id' });

    await expect(
      service.createCalendar(DEFAULT_ORGANIZATION_ID, {
        name: 'Corporate Calendar',
        type: CalendarType.Enterprise,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects unsupported calendar type and invalid timezone values', async () => {
    await expect(
      service.createCalendar(DEFAULT_ORGANIZATION_ID, {
        name: 'Corporate Calendar',
        type: 'resource' as CalendarType,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    await expect(
      service.createCalendar(DEFAULT_ORGANIZATION_ID, {
        name: 'Corporate Calendar',
        timezone: 'Not/A_Timezone',
        type: CalendarType.Enterprise,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('applies organization isolation at the service boundary', async () => {
    await expect(service.listCalendars('other-org')).resolves.toEqual([]);
    await expect(service.getCalendar('other-org', 'calendar-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('validates working hours intervals', async () => {
    calendarsRepository.findOne?.mockResolvedValue({
      defaultWorkingDays: [1],
      hoursPerDay: 8,
      id: 'calendar-id',
      workingDayEnd: '17:00:00',
      workingDayStart: '09:00:00',
    });

    await expect(
      service.createWorkingHours(DEFAULT_ORGANIZATION_ID, 'calendar-id', {
        dayOfWeek: 2,
        end: '09:00',
        start: '17:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents duplicate override dates across holidays and exception days', async () => {
    calendarsRepository.findOne?.mockResolvedValue({ id: 'calendar-id' });
    exceptionsRepository.findOne?.mockResolvedValue({
      date: '2026-12-25',
      enterpriseCalendarId: 'calendar-id',
      exceptionType: CalendarExceptionType.Holiday,
      id: 'holiday-id',
    });

    await expect(
      service.createExceptionDay(DEFAULT_ORGANIZATION_ID, 'calendar-id', {
        closed: true,
        date: '2026-12-25',
        name: 'Closure',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects impossible holiday dates', async () => {
    calendarsRepository.findOne?.mockResolvedValue({ id: 'calendar-id' });

    await expect(
      service.createHoliday(DEFAULT_ORGANIZATION_ID, 'calendar-id', {
        date: '2026-02-31',
        name: 'Invalid Date',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
