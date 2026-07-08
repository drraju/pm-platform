import { BadRequestException, Injectable } from '@nestjs/common';
import { CalendarExceptionType } from './enums/calendar-exception-type.enum';
import { CalendarStatus } from './enums/calendar-status.enum';

export type EnterpriseCalendarValidationInput = {
  defaultWorkingDays?: number[];
  hoursPerDay?: number | null;
  name?: string | null;
  status?: CalendarStatus | string | null;
  timezone?: string | null;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

export type EnterpriseCalendarExceptionValidationInput = {
  date?: string | null;
  exceptionType?: CalendarExceptionType | string | null;
  hours?: number | null;
  name?: string | null;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

@Injectable()
export class CalendarValidationService {
  validateEnterpriseCalendar(input: EnterpriseCalendarValidationInput) {
    if (input.name !== undefined && !input.name?.trim()) {
      throw new BadRequestException('Enterprise calendar name is required');
    }

    if (input.timezone !== undefined && !input.timezone?.trim()) {
      throw new BadRequestException('Enterprise calendar timezone is required');
    }

    if (input.status !== undefined && input.status !== null) {
      this.validateAllowedValue(input.status, Object.values(CalendarStatus), 'status');
    }

    if (input.defaultWorkingDays !== undefined) {
      this.validateWorkingDays(input.defaultWorkingDays);
    }

    this.validateWorkingHours(
      input.workingDayStart,
      input.workingDayEnd,
      input.hoursPerDay,
    );
  }

  validateEnterpriseCalendarException(
    input: EnterpriseCalendarExceptionValidationInput,
  ) {
    if (input.name !== undefined && !input.name?.trim()) {
      throw new BadRequestException('Calendar exception name is required');
    }

    if (input.date !== undefined && !this.isDateOnly(input.date)) {
      throw new BadRequestException('Calendar exception date must be YYYY-MM-DD');
    }

    if (input.exceptionType !== undefined && input.exceptionType !== null) {
      this.validateAllowedValue(
        input.exceptionType,
        Object.values(CalendarExceptionType),
        'exceptionType',
      );
    }

    this.validateWorkingHours(
      input.workingDayStart,
      input.workingDayEnd,
      input.hours,
    );
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(`Unsupported calendar ${fieldName}`);
    }
  }

  private validateWorkingDays(defaultWorkingDays: number[]) {
    if (!Array.isArray(defaultWorkingDays)) {
      throw new BadRequestException('Default working days must be an array');
    }

    const uniqueDays = new Set(defaultWorkingDays);
    if (uniqueDays.size !== defaultWorkingDays.length) {
      throw new BadRequestException('Default working days must be unique');
    }

    if (
      defaultWorkingDays.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6,
      )
    ) {
      throw new BadRequestException(
        'Default working days must be integers between 0 and 6',
      );
    }
  }

  private validateWorkingHours(
    workingDayStart?: string | null,
    workingDayEnd?: string | null,
    hours?: number | null,
  ) {
    if (workingDayStart !== undefined && workingDayStart !== null) {
      this.validateTime(workingDayStart, 'working day start');
    }

    if (workingDayEnd !== undefined && workingDayEnd !== null) {
      this.validateTime(workingDayEnd, 'working day end');
    }

    if (
      workingDayStart &&
      workingDayEnd &&
      this.timeToSeconds(workingDayEnd) <= this.timeToSeconds(workingDayStart)
    ) {
      throw new BadRequestException(
        'Calendar working day end must be after working day start',
      );
    }

    if (hours !== undefined && hours !== null && (hours <= 0 || hours > 24)) {
      throw new BadRequestException('Calendar hours must be greater than 0 and at most 24');
    }
  }

  private validateTime(value: string, fieldLabel: string) {
    if (!timePattern.test(value)) {
      throw new BadRequestException(`Calendar ${fieldLabel} must be HH:mm or HH:mm:ss`);
    }
  }

  private isDateOnly(value?: string | null) {
    return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  }

  private timeToSeconds(value: string) {
    const [hours, minutes, seconds = '0'] = value.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }
}
