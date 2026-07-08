import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CalendarValidationService } from '../calendars/calendar-validation.service';
import { EnterpriseCalendarException } from '../calendars/entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../calendars/entities/enterprise-calendar.entity';
import { CalendarExceptionType } from '../calendars/enums/calendar-exception-type.enum';
import { CalendarStatus } from '../calendars/enums/calendar-status.enum';
import { CalendarMapper } from './calendar.mapper';
import {
  CalendarResponseDto,
  CalendarType,
  CreateCalendarDto,
  UpdateCalendarDto,
} from './dto/calendar.dto';
import {
  CreateExceptionDayDto,
  ExceptionDayResponseDto,
  UpdateExceptionDayDto,
} from './dto/exception-day.dto';
import {
  CreateHolidayDto,
  HolidayResponseDto,
  UpdateHolidayDto,
} from './dto/holiday.dto';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
  WorkingHoursResponseDto,
} from './dto/working-hours.dto';

export const DEFAULT_ORGANIZATION_ID = 'default';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(EnterpriseCalendar)
    private readonly calendarsRepository: Repository<EnterpriseCalendar>,
    @InjectRepository(EnterpriseCalendarException)
    private readonly exceptionsRepository: Repository<EnterpriseCalendarException>,
    private readonly calendarValidationService: CalendarValidationService,
  ) {}

  async createCalendar(
    organizationId: string,
    input: CreateCalendarDto,
  ): Promise<CalendarResponseDto> {
    this.ensureSupportedOrganization(organizationId);
    this.validateCalendarType(input.type);
    this.validateTimezone(input.timezone ?? 'UTC');
    await this.ensureUniqueName(input.name);
    await this.ensureDefaultCalendarAllowed(Boolean(input.isDefault));
    this.calendarValidationService.validateEnterpriseCalendar(input);

    const calendar = await this.calendarsRepository.save(
      this.calendarsRepository.create({
        defaultWorkingDays: input.defaultWorkingDays ?? [1, 2, 3, 4, 5],
        description: input.description ?? null,
        hoursPerDay: input.hoursPerDay ?? 8,
        name: input.name.trim(),
        status: input.status ?? CalendarStatus.Active,
        timezone: input.timezone?.trim() || 'UTC',
        workingDayEnd: input.workingDayEnd ?? '17:00:00',
        workingDayStart: input.workingDayStart ?? '09:00:00',
      }),
    );

    return CalendarMapper.toCalendarResponse(
      calendar,
      organizationId,
      await this.getDefaultCalendarId(),
    );
  }

  async listCalendars(organizationId: string): Promise<CalendarResponseDto[]> {
    if (!this.isSupportedOrganization(organizationId)) {
      return [];
    }

    const [calendars, defaultCalendarId] = await Promise.all([
      this.calendarsRepository.find({ order: { createdAt: 'ASC', name: 'ASC' } }),
      this.getDefaultCalendarId(),
    ]);

    return calendars.map((calendar) =>
      CalendarMapper.toCalendarResponse(calendar, organizationId, defaultCalendarId),
    );
  }

  async getCalendar(
    organizationId: string,
    calendarId: string,
  ): Promise<CalendarResponseDto> {
    const calendar = await this.findCalendar(organizationId, calendarId);
    return CalendarMapper.toCalendarResponse(
      calendar,
      organizationId,
      await this.getDefaultCalendarId(),
    );
  }

  async replaceCalendar(
    organizationId: string,
    calendarId: string,
    input: CreateCalendarDto,
  ): Promise<CalendarResponseDto> {
    return this.updateCalendar(organizationId, calendarId, input);
  }

  async updateCalendar(
    organizationId: string,
    calendarId: string,
    input: UpdateCalendarDto,
  ): Promise<CalendarResponseDto> {
    this.ensureSupportedOrganization(organizationId);
    if (input.type !== undefined) {
      this.validateCalendarType(input.type);
    }
    if (input.timezone !== undefined) {
      this.validateTimezone(input.timezone);
    }
    if (input.name !== undefined) {
      await this.ensureUniqueName(input.name, calendarId);
    }
    await this.ensureDefaultCalendarAllowed(Boolean(input.isDefault), calendarId);
    this.calendarValidationService.validateEnterpriseCalendar(input);

    const calendar = await this.findCalendar(organizationId, calendarId);
    Object.assign(calendar, {
      ...input,
      name: input.name?.trim() ?? calendar.name,
      timezone: input.timezone?.trim() ?? calendar.timezone,
    });
    const savedCalendar = await this.calendarsRepository.save(calendar);

    return CalendarMapper.toCalendarResponse(
      savedCalendar,
      organizationId,
      await this.getDefaultCalendarId(),
    );
  }

  async deleteCalendar(organizationId: string, calendarId: string): Promise<void> {
    const calendar = await this.findCalendar(organizationId, calendarId);
    calendar.status = CalendarStatus.Archived;
    await this.calendarsRepository.save(calendar);
  }

  async listWorkingHours(
    organizationId: string,
    calendarId: string,
  ): Promise<WorkingHoursResponseDto[]> {
    return CalendarMapper.toWorkingHoursResponses(
      await this.findCalendar(organizationId, calendarId),
    );
  }

  async createWorkingHours(
    organizationId: string,
    calendarId: string,
    input: CreateWorkingHoursDto,
  ): Promise<WorkingHoursResponseDto> {
    const calendar = await this.findCalendar(organizationId, calendarId);
    this.validateWorkingInterval(input.start, input.end);

    const days = new Set(calendar.defaultWorkingDays ?? []);
    days.add(input.dayOfWeek);
    calendar.defaultWorkingDays = [...days].sort((left, right) => left - right);
    calendar.workingDayStart = input.start;
    calendar.workingDayEnd = input.end;
    calendar.hoursPerDay = input.hours ?? calendar.hoursPerDay ?? 8;
    await this.calendarsRepository.save(calendar);

    return CalendarMapper.toWorkingHoursResponses(calendar).find(
      (workingHours) => workingHours.dayOfWeek === input.dayOfWeek,
    ) as WorkingHoursResponseDto;
  }

  async updateWorkingHours(
    organizationId: string,
    calendarId: string,
    workingHourId: string,
    input: UpdateWorkingHoursDto,
  ): Promise<WorkingHoursResponseDto> {
    const dayOfWeek = this.parseWorkingHourId(workingHourId);
    const calendar = await this.findCalendar(organizationId, calendarId);
    this.validateWorkingInterval(input.start, input.end);
    this.ensureWorkingDayExists(calendar, dayOfWeek);

    calendar.workingDayStart = input.start;
    calendar.workingDayEnd = input.end;
    calendar.hoursPerDay = input.hours ?? calendar.hoursPerDay ?? 8;
    await this.calendarsRepository.save(calendar);

    return CalendarMapper.toWorkingHoursResponses(calendar).find(
      (workingHours) => workingHours.dayOfWeek === dayOfWeek,
    ) as WorkingHoursResponseDto;
  }

  async deleteWorkingHours(
    organizationId: string,
    calendarId: string,
    workingHourId: string,
  ): Promise<void> {
    const dayOfWeek = this.parseWorkingHourId(workingHourId);
    const calendar = await this.findCalendar(organizationId, calendarId);
    this.ensureWorkingDayExists(calendar, dayOfWeek);
    calendar.defaultWorkingDays = (calendar.defaultWorkingDays ?? []).filter(
      (day) => day !== dayOfWeek,
    );
    await this.calendarsRepository.save(calendar);
  }

  async listHolidays(
    organizationId: string,
    calendarId: string,
  ): Promise<HolidayResponseDto[]> {
    await this.findCalendar(organizationId, calendarId);
    const holidays = await this.exceptionsRepository.find({
      order: { date: 'ASC', createdAt: 'ASC' },
      where: {
        enterpriseCalendarId: calendarId,
        exceptionType: CalendarExceptionType.Holiday,
      },
    });
    return holidays.map(CalendarMapper.toHolidayResponse);
  }

  async createHoliday(
    organizationId: string,
    calendarId: string,
    input: CreateHolidayDto,
  ): Promise<HolidayResponseDto> {
    await this.findCalendar(organizationId, calendarId);
    this.validateDateOnly(input.date, 'Holiday date');
    await this.ensureUniqueExceptionDate(calendarId, input.date);

    const holiday = await this.exceptionsRepository.save(
      this.exceptionsRepository.create({
        date: input.date,
        enterpriseCalendarId: calendarId,
        exceptionType: CalendarExceptionType.Holiday,
        name: input.name.trim(),
      }),
    );
    return CalendarMapper.toHolidayResponse(holiday);
  }

  async updateHoliday(
    organizationId: string,
    calendarId: string,
    holidayId: string,
    input: UpdateHolidayDto,
  ): Promise<HolidayResponseDto> {
    const holiday = await this.findException(
      organizationId,
      calendarId,
      holidayId,
      CalendarExceptionType.Holiday,
    );
    this.validateDateOnly(input.date, 'Holiday date');
    await this.ensureUniqueExceptionDate(calendarId, input.date, holidayId);

    holiday.date = input.date;
    holiday.name = input.name.trim();
    return CalendarMapper.toHolidayResponse(
      await this.exceptionsRepository.save(holiday),
    );
  }

  async deleteHoliday(
    organizationId: string,
    calendarId: string,
    holidayId: string,
  ): Promise<void> {
    const holiday = await this.findException(
      organizationId,
      calendarId,
      holidayId,
      CalendarExceptionType.Holiday,
    );
    await this.exceptionsRepository.softRemove(holiday);
  }

  async listExceptionDays(
    organizationId: string,
    calendarId: string,
  ): Promise<ExceptionDayResponseDto[]> {
    await this.findCalendar(organizationId, calendarId);
    const exceptions = await this.exceptionsRepository.find({
      order: { date: 'ASC', createdAt: 'ASC' },
      where: [
        {
          enterpriseCalendarId: calendarId,
          exceptionType: CalendarExceptionType.NonWorking,
        },
        {
          enterpriseCalendarId: calendarId,
          exceptionType: CalendarExceptionType.WorkingOverride,
        },
      ],
    });
    return exceptions.map(CalendarMapper.toExceptionDayResponse);
  }

  async createExceptionDay(
    organizationId: string,
    calendarId: string,
    input: CreateExceptionDayDto,
  ): Promise<ExceptionDayResponseDto> {
    await this.findCalendar(organizationId, calendarId);
    this.validateExceptionDay(input);
    const exceptionType = this.toExceptionType(input);
    await this.ensureUniqueExceptionDate(calendarId, input.date);
    const exception = await this.exceptionsRepository.save(
      this.exceptionsRepository.create({
        date: input.date,
        enterpriseCalendarId: calendarId,
        exceptionType,
        hours: input.closed ? null : input.hours,
        name: input.name.trim(),
        workingDayEnd: input.closed ? null : input.workingDayEnd,
        workingDayStart: input.closed ? null : input.workingDayStart,
      }),
    );
    return CalendarMapper.toExceptionDayResponse(exception);
  }

  async updateExceptionDay(
    organizationId: string,
    calendarId: string,
    exceptionId: string,
    input: UpdateExceptionDayDto,
  ): Promise<ExceptionDayResponseDto> {
    const exception = await this.findCalendarExceptionDay(
      organizationId,
      calendarId,
      exceptionId,
    );
    this.validateExceptionDay(input);
    const exceptionType = this.toExceptionType(input);
    await this.ensureUniqueExceptionDate(
      calendarId,
      input.date,
      exceptionId,
    );

    Object.assign(exception, {
      date: input.date,
      exceptionType,
      hours: input.closed ? null : input.hours,
      name: input.name.trim(),
      workingDayEnd: input.closed ? null : input.workingDayEnd,
      workingDayStart: input.closed ? null : input.workingDayStart,
    });
    return CalendarMapper.toExceptionDayResponse(
      await this.exceptionsRepository.save(exception),
    );
  }

  async deleteExceptionDay(
    organizationId: string,
    calendarId: string,
    exceptionId: string,
  ): Promise<void> {
    const exception = await this.findCalendarExceptionDay(
      organizationId,
      calendarId,
      exceptionId,
    );
    await this.exceptionsRepository.softRemove(exception);
  }

  private async findCalendar(
    organizationId: string,
    calendarId: string,
  ): Promise<EnterpriseCalendar> {
    this.ensureSupportedOrganization(organizationId);
    const calendar = await this.calendarsRepository.findOne({
      where: { id: calendarId },
    });
    if (!calendar) {
      throw new NotFoundException(`Calendar ${calendarId} not found`);
    }
    return calendar;
  }

  private async findException(
    organizationId: string,
    calendarId: string,
    exceptionId: string,
    exceptionType: CalendarExceptionType,
  ) {
    await this.findCalendar(organizationId, calendarId);
    const exception = await this.exceptionsRepository.findOne({
      where: { enterpriseCalendarId: calendarId, exceptionType, id: exceptionId },
    });
    if (!exception) {
      throw new NotFoundException(`Calendar exception ${exceptionId} not found`);
    }
    return exception;
  }

  private async findCalendarExceptionDay(
    organizationId: string,
    calendarId: string,
    exceptionId: string,
  ) {
    await this.findCalendar(organizationId, calendarId);
    const exception = await this.exceptionsRepository.findOne({
      where: [
        {
          enterpriseCalendarId: calendarId,
          exceptionType: CalendarExceptionType.NonWorking,
          id: exceptionId,
        },
        {
          enterpriseCalendarId: calendarId,
          exceptionType: CalendarExceptionType.WorkingOverride,
          id: exceptionId,
        },
      ],
    });
    if (!exception) {
      throw new NotFoundException(`Calendar exception ${exceptionId} not found`);
    }
    return exception;
  }

  private async ensureUniqueName(name: string, calendarId?: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Calendar name is required');
    }
    const existingCalendar = await this.calendarsRepository.findOne({
      where: calendarId ? { id: Not(calendarId), name: trimmedName } : { name: trimmedName },
    });
    if (existingCalendar) {
      throw new ConflictException('Calendar name already exists');
    }
  }

  private async ensureUniqueExceptionDate(
    calendarId: string,
    date: string,
    exceptionId?: string,
  ) {
    const existingException = await this.exceptionsRepository.findOne({
      where: exceptionId
        ? {
            date,
            enterpriseCalendarId: calendarId,
            id: Not(exceptionId),
          }
        : { date, enterpriseCalendarId: calendarId },
    });
    if (existingException) {
      throw new ConflictException('Calendar exception date already exists');
    }
  }

  private async ensureDefaultCalendarAllowed(
    isDefault: boolean,
    calendarId?: string,
  ) {
    if (!isDefault) {
      return;
    }
    const defaultCalendarId = await this.getDefaultCalendarId();
    if (defaultCalendarId && defaultCalendarId !== calendarId) {
      throw new ConflictException('Only one default calendar is supported');
    }
  }

  private async getDefaultCalendarId() {
    const defaultCalendar = await this.calendarsRepository.findOne({
      order: { createdAt: 'ASC' },
      select: { id: true },
      where: { status: CalendarStatus.Active },
    });
    return defaultCalendar?.id ?? null;
  }

  private ensureSupportedOrganization(organizationId: string) {
    if (!this.isSupportedOrganization(organizationId)) {
      throw new NotFoundException('Organization calendar scope not found');
    }
  }

  private isSupportedOrganization(organizationId: string) {
    return organizationId === DEFAULT_ORGANIZATION_ID;
  }

  private validateCalendarType(type?: CalendarType | string | null) {
    if (type !== CalendarType.Enterprise) {
      throw new UnprocessableEntityException('Unsupported calendar type');
    }
  }

  private validateTimezone(timezone?: string | null) {
    if (!timezone?.trim()) {
      throw new BadRequestException('Calendar timezone is required');
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      throw new UnprocessableEntityException('Invalid calendar timezone');
    }
  }

  private validateWorkingInterval(start: string, end: string) {
    this.calendarValidationService.validateEnterpriseCalendar({
      hoursPerDay: 8,
      workingDayEnd: end,
      workingDayStart: start,
    });
  }

  private validateDateOnly(value: string, label: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${label} must be YYYY-MM-DD`);
    }
    const [year, month, day] = value.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));
    if (
      parsedDate.getUTCFullYear() !== year ||
      parsedDate.getUTCMonth() !== month - 1 ||
      parsedDate.getUTCDate() !== day
    ) {
      throw new BadRequestException(`${label} must be a valid date`);
    }
  }

  private validateExceptionDay(input: CreateExceptionDayDto) {
    this.validateDateOnly(input.date, 'Exception date');
    if (input.closed) {
      return;
    }
    if (!input.workingDayStart || !input.workingDayEnd) {
      throw new UnprocessableEntityException(
        'Working exception days require working intervals',
      );
    }
    this.validateWorkingInterval(input.workingDayStart, input.workingDayEnd);
  }

  private toExceptionType(input: CreateExceptionDayDto) {
    return input.closed
      ? CalendarExceptionType.NonWorking
      : CalendarExceptionType.WorkingOverride;
  }

  private parseWorkingHourId(workingHourId: string) {
    const dayOfWeek = Number(workingHourId);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new NotFoundException(`Working hours ${workingHourId} not found`);
    }
    return dayOfWeek;
  }

  private ensureWorkingDayExists(calendar: EnterpriseCalendar, dayOfWeek: number) {
    if (!(calendar.defaultWorkingDays ?? []).includes(dayOfWeek)) {
      throw new NotFoundException(`Working hours ${dayOfWeek} not found`);
    }
  }
}
