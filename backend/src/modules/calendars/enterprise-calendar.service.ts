import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { CalendarValidationService } from './calendar-validation.service';
import { EnterpriseCalendarException } from './entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from './entities/enterprise-calendar.entity';
import { CalendarExceptionType } from './enums/calendar-exception-type.enum';
import { CalendarStatus } from './enums/calendar-status.enum';

export type CreateEnterpriseCalendarInput = {
  defaultWorkingDays?: number[];
  description?: string | null;
  hoursPerDay?: number;
  name: string;
  status?: CalendarStatus;
  timezone?: string;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

export type UpdateEnterpriseCalendarInput = Partial<CreateEnterpriseCalendarInput>;

export type CreateEnterpriseCalendarExceptionInput = {
  date: string;
  exceptionType: CalendarExceptionType;
  hours?: number | null;
  name: string;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

@Injectable()
export class EnterpriseCalendarService {
  constructor(
    @InjectRepository(EnterpriseCalendar)
    private readonly enterpriseCalendarsRepository: Repository<EnterpriseCalendar>,
    @InjectRepository(EnterpriseCalendarException)
    private readonly enterpriseCalendarExceptionsRepository: Repository<EnterpriseCalendarException>,
    private readonly calendarValidationService: CalendarValidationService,
  ) {}

  async createEnterpriseCalendar(
    input: CreateEnterpriseCalendarInput,
    actor?: AuthorizationActor,
  ): Promise<EnterpriseCalendar> {
    this.calendarValidationService.validateEnterpriseCalendar(input);

    const calendar = this.enterpriseCalendarsRepository.create({
      defaultWorkingDays: input.defaultWorkingDays ?? [1, 2, 3, 4, 5],
      description: input.description,
      hoursPerDay: input.hoursPerDay ?? 8,
      name: input.name.trim(),
      status: input.status ?? CalendarStatus.Active,
      timezone: input.timezone?.trim() || 'UTC',
      workingDayEnd: input.workingDayEnd ?? '17:00:00',
      workingDayStart: input.workingDayStart ?? '09:00:00',
      createdById: actor?.userId,
      updatedById: actor?.userId,
    });

    return this.enterpriseCalendarsRepository.save(calendar);
  }

  async updateEnterpriseCalendar(
    calendarId: string,
    input: UpdateEnterpriseCalendarInput,
    actor?: AuthorizationActor,
  ): Promise<EnterpriseCalendar> {
    this.calendarValidationService.validateEnterpriseCalendar(input);

    const calendar = await this.findEnterpriseCalendar(calendarId);
    Object.assign(calendar, {
      ...input,
      name: input.name?.trim() ?? calendar.name,
      timezone: input.timezone?.trim() ?? calendar.timezone,
      updatedById: actor?.userId,
    });

    return this.enterpriseCalendarsRepository.save(calendar);
  }

  async archiveEnterpriseCalendar(
    calendarId: string,
    actor?: AuthorizationActor,
  ): Promise<EnterpriseCalendar> {
    const calendar = await this.findEnterpriseCalendar(calendarId);
    calendar.status = CalendarStatus.Archived;
    calendar.updatedById = actor?.userId;
    return this.enterpriseCalendarsRepository.save(calendar);
  }

  async createEnterpriseCalendarException(
    calendarId: string,
    input: CreateEnterpriseCalendarExceptionInput,
    actor?: AuthorizationActor,
  ): Promise<EnterpriseCalendarException> {
    await this.findEnterpriseCalendar(calendarId);
    this.calendarValidationService.validateEnterpriseCalendarException(input);

    const exception = this.enterpriseCalendarExceptionsRepository.create({
      ...input,
      enterpriseCalendarId: calendarId,
      name: input.name.trim(),
      createdById: actor?.userId,
      updatedById: actor?.userId,
    });

    return this.enterpriseCalendarExceptionsRepository.save(exception);
  }

  async findEnterpriseCalendar(calendarId: string): Promise<EnterpriseCalendar> {
    const calendar = await this.enterpriseCalendarsRepository.findOne({
      relations: { exceptions: true },
      where: { id: calendarId },
    });

    if (!calendar) {
      throw new NotFoundException(`Enterprise calendar ${calendarId} not found`);
    }

    return calendar;
  }
}
