import { BadRequestException } from '@nestjs/common';
import { CalendarValidationService } from '../calendar-validation.service';
import { CalendarExceptionType } from '../enums/calendar-exception-type.enum';
import { CalendarStatus } from '../enums/calendar-status.enum';

describe('CalendarValidationService', () => {
  let service: CalendarValidationService;

  beforeEach(() => {
    service = new CalendarValidationService();
  });

  it('accepts valid enterprise calendar defaults', () => {
    expect(() =>
      service.validateEnterpriseCalendar({
        defaultWorkingDays: [1, 2, 3, 4, 5],
        hoursPerDay: 8,
        name: 'Corporate Calendar',
        status: CalendarStatus.Active,
        timezone: 'UTC',
        workingDayEnd: '17:00',
        workingDayStart: '09:00',
      }),
    ).not.toThrow();
  });

  it('rejects duplicate or out-of-range working days', () => {
    expect(() =>
      service.validateEnterpriseCalendar({
        defaultWorkingDays: [1, 1, 7],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects inverted working hours', () => {
    expect(() =>
      service.validateEnterpriseCalendar({
        workingDayEnd: '09:00',
        workingDayStart: '17:00',
      }),
    ).toThrow(BadRequestException);
  });

  it('validates enterprise calendar exceptions', () => {
    expect(() =>
      service.validateEnterpriseCalendarException({
        date: '2026-12-25',
        exceptionType: CalendarExceptionType.Holiday,
        name: 'Christmas',
      }),
    ).not.toThrow();
  });
});
