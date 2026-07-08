import { EnterpriseCalendarException } from '../calendars/entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../calendars/entities/enterprise-calendar.entity';
import { CalendarExceptionType } from '../calendars/enums/calendar-exception-type.enum';
import { CalendarType, CalendarResponseDto } from './dto/calendar.dto';
import { ExceptionDayResponseDto } from './dto/exception-day.dto';
import { HolidayResponseDto } from './dto/holiday.dto';
import { WorkingHoursResponseDto } from './dto/working-hours.dto';

export class CalendarMapper {
  static toCalendarResponse(
    calendar: EnterpriseCalendar,
    organizationId: string,
    defaultCalendarId?: string | null,
  ): CalendarResponseDto {
    return {
      createdAt: calendar.createdAt,
      defaultWorkingDays: calendar.defaultWorkingDays ?? [],
      description: calendar.description ?? null,
      hoursPerDay: Number(calendar.hoursPerDay ?? 0),
      id: calendar.id,
      isDefault: calendar.id === defaultCalendarId,
      name: calendar.name,
      organizationId,
      status: calendar.status,
      timezone: calendar.timezone,
      type: CalendarType.Enterprise,
      updatedAt: calendar.updatedAt,
      workingDayEnd: calendar.workingDayEnd ?? null,
      workingDayStart: calendar.workingDayStart ?? null,
    };
  }

  static toWorkingHoursResponses(
    calendar: EnterpriseCalendar,
  ): WorkingHoursResponseDto[] {
    return [...(calendar.defaultWorkingDays ?? [])]
      .sort((left, right) => left - right)
      .map((dayOfWeek) => ({
        calendarId: calendar.id,
        dayOfWeek,
        end: calendar.workingDayEnd ?? '17:00:00',
        hours: Number(calendar.hoursPerDay ?? 8),
        id: String(dayOfWeek),
        start: calendar.workingDayStart ?? '09:00:00',
      }));
  }

  static toHolidayResponse(
    exception: EnterpriseCalendarException,
  ): HolidayResponseDto {
    return {
      calendarId: exception.enterpriseCalendarId,
      createdAt: exception.createdAt,
      date: exception.date,
      id: exception.id,
      name: exception.name,
      updatedAt: exception.updatedAt,
    };
  }

  static toExceptionDayResponse(
    exception: EnterpriseCalendarException,
  ): ExceptionDayResponseDto {
    return {
      calendarId: exception.enterpriseCalendarId,
      closed: exception.exceptionType === CalendarExceptionType.NonWorking,
      createdAt: exception.createdAt,
      date: exception.date,
      hours: exception.hours === undefined ? null : exception.hours,
      id: exception.id,
      name: exception.name,
      updatedAt: exception.updatedAt,
      workingDayEnd: exception.workingDayEnd ?? null,
      workingDayStart: exception.workingDayStart ?? null,
    };
  }
}
