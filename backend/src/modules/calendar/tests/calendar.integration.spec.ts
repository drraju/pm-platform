import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { CalendarValidationService } from '../../calendars/calendar-validation.service';
import { EnterpriseCalendarException } from '../../calendars/entities/enterprise-calendar-exception.entity';
import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarExceptionType } from '../../calendars/enums/calendar-exception-type.enum';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { CalendarController } from '../calendar.controller';
import { CalendarService, DEFAULT_ORGANIZATION_ID } from '../calendar.service';
import { CalendarType } from '../dto/calendar.dto';

type Persisted<T> = T & {
  createdAt: Date;
  deletedAt?: Date | null;
  id: string;
  updatedAt: Date;
};

class InMemoryRepository<T extends { id?: string; deletedAt?: Date | null }> {
  private sequence = 1;

  constructor(
    private readonly prefix: string,
    private readonly rows: Persisted<T>[] = [],
  ) {}

  create(input: Partial<T>): T {
    return input as T;
  }

  async save(input: T): Promise<Persisted<T>> {
    const now = new Date('2026-07-08T00:00:00.000Z');
    const existingIndex = input.id
      ? this.rows.findIndex((row) => row.id === input.id)
      : -1;

    if (existingIndex >= 0) {
      this.rows[existingIndex] = {
        ...this.rows[existingIndex],
        ...input,
        updatedAt: now,
      };
      return this.rows[existingIndex];
    }

    const persisted = {
      createdAt: now,
      id: `${this.prefix}-${this.sequence++}`,
      updatedAt: now,
      ...input,
    } as Persisted<T>;
    this.rows.push(persisted);
    return persisted;
  }

  async find(options?: {
    order?: Record<string, 'ASC' | 'DESC'>;
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }): Promise<Persisted<T>[]> {
    return this.applyOrder(this.filter(options?.where), options?.order);
  }

  async findOne(options?: {
    order?: Record<string, 'ASC' | 'DESC'>;
    select?: Record<string, boolean>;
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  }): Promise<Persisted<T> | null> {
    return (
      this.applyOrder(this.filter(options?.where), options?.order)[0] ?? null
    );
  }

  async softRemove(input: Persisted<T>): Promise<Persisted<T>> {
    input.deletedAt = new Date('2026-07-08T00:00:00.000Z');
    return input;
  }

  private filter(where?: FindOptionsWhere<T> | FindOptionsWhere<T>[]) {
    return this.rows.filter((row) => {
      if (row.deletedAt) {
        return false;
      }
      if (!where) {
        return true;
      }
      const clauses = Array.isArray(where) ? where : [where];
      return clauses.some((clause) => this.matches(row, clause));
    });
  }

  private matches(row: Persisted<T>, clause: FindOptionsWhere<T>) {
    return Object.entries(clause).every(([key, expected]) => {
      const actual = row[key as keyof Persisted<T>];
      if (
        expected &&
        typeof expected === 'object' &&
        '_type' in expected &&
        expected._type === 'not'
      ) {
        return actual !== expected._value;
      }
      return actual === expected;
    });
  }

  private applyOrder(
    rows: Persisted<T>[],
    order?: Record<string, 'ASC' | 'DESC'>,
  ) {
    if (!order) {
      return rows;
    }
    return [...rows].sort((left, right) => {
      for (const [key, direction] of Object.entries(order)) {
        const leftValue = left[key as keyof Persisted<T>];
        const rightValue = right[key as keyof Persisted<T>];
        if (leftValue === rightValue) {
          continue;
        }
        const comparison = leftValue < rightValue ? -1 : 1;
        return direction === 'ASC' ? comparison : -comparison;
      }
      return 0;
    });
  }
}

describe('Calendar API integration', () => {
  let controller: CalendarController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        CalendarService,
        CalendarValidationService,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: getRepositoryToken(EnterpriseCalendar),
          useValue: new InMemoryRepository<EnterpriseCalendar>('calendar'),
        },
        {
          provide: getRepositoryToken(EnterpriseCalendarException),
          useValue: new InMemoryRepository<EnterpriseCalendarException>(
            'exception',
          ),
        },
      ],
    }).compile();

    controller = moduleRef.get(CalendarController);
  });

  it('creates, updates, lists, reads, and archives calendars', async () => {
    const calendar = await controller.createCalendar(undefined, {
      isDefault: true,
      name: 'Corporate Calendar',
      timezone: 'UTC',
      type: CalendarType.Enterprise,
    });

    expect(calendar).toEqual(
      expect.objectContaining({
        isDefault: true,
        name: 'Corporate Calendar',
        organizationId: DEFAULT_ORGANIZATION_ID,
        type: CalendarType.Enterprise,
      }),
    );

    await expect(
      controller.createCalendar(undefined, {
        name: 'Corporate Calendar',
        type: CalendarType.Enterprise,
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      controller.createCalendar(undefined, {
        isDefault: true,
        name: 'Second Calendar',
        type: CalendarType.Enterprise,
      }),
    ).rejects.toThrow(ConflictException);

    const updated = await controller.updateCalendar(undefined, calendar.id, {
      name: 'Corporate Calendar Updated',
    });

    expect(updated.name).toBe('Corporate Calendar Updated');
    await expect(controller.listCalendars(undefined)).resolves.toHaveLength(1);
    await expect(
      controller.getCalendar(undefined, calendar.id),
    ).resolves.toEqual(expect.objectContaining({ id: calendar.id }));

    await controller.deleteCalendar(undefined, calendar.id);
    await expect(
      controller.getCalendar(undefined, calendar.id),
    ).resolves.toEqual(
      expect.objectContaining({ status: CalendarStatus.Archived }),
    );
  });

  it('manages working hours through calendar defaults', async () => {
    const calendar = await createCalendar(controller);

    const created = await controller.createWorkingHours(
      undefined,
      calendar.id,
      {
        dayOfWeek: 6,
        end: '13:00',
        hours: 4,
        start: '09:00',
      },
    );
    expect(created).toEqual(
      expect.objectContaining({
        calendarId: calendar.id,
        dayOfWeek: 6,
        end: '13:00',
        hours: 4,
        id: '6',
        start: '09:00',
      }),
    );

    const updated = await controller.updateWorkingHours(
      undefined,
      calendar.id,
      '6',
      {
        end: '14:00',
        hours: 5,
        start: '09:00',
      },
    );
    expect(updated.end).toBe('14:00');

    await expect(
      controller.createWorkingHours(undefined, calendar.id, {
        dayOfWeek: 0,
        end: '09:00',
        start: '17:00',
      }),
    ).rejects.toThrow(BadRequestException);

    await controller.deleteWorkingHours(undefined, calendar.id, '6');
    await expect(
      controller.listWorkingHours(undefined, calendar.id),
    ).resolves.toHaveLength(5);
  });

  it('supports holiday CRUD and duplicate-date validation', async () => {
    const calendar = await createCalendar(controller);

    const holiday = await controller.createHoliday(undefined, calendar.id, {
      date: '2026-12-25',
      name: 'Christmas',
    });
    expect(holiday).toEqual(
      expect.objectContaining({
        calendarId: calendar.id,
        date: '2026-12-25',
        name: 'Christmas',
      }),
    );

    await expect(
      controller.createHoliday(undefined, calendar.id, {
        date: '2026-12-25',
        name: 'Duplicate Christmas',
      }),
    ).rejects.toThrow(ConflictException);

    const updated = await controller.updateHoliday(
      undefined,
      calendar.id,
      holiday.id,
      {
        date: '2026-12-24',
        name: 'Christmas Eve',
      },
    );
    expect(updated.date).toBe('2026-12-24');
    await expect(
      controller.listHolidays(undefined, calendar.id),
    ).resolves.toHaveLength(1);

    await controller.deleteHoliday(undefined, calendar.id, holiday.id);
    await expect(
      controller.listHolidays(undefined, calendar.id),
    ).resolves.toEqual([]);
  });

  it('supports exception day CRUD and semantic validation', async () => {
    const calendar = await createCalendar(controller);

    await expect(
      controller.createExceptionDay(undefined, calendar.id, {
        closed: false,
        date: '2026-11-27',
        name: 'Missing Interval',
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    const exception = await controller.createExceptionDay(
      undefined,
      calendar.id,
      {
        closed: true,
        date: '2026-11-27',
        name: 'Closure',
      },
    );
    expect(exception.closed).toBe(true);

    const updated = await controller.updateExceptionDay(
      undefined,
      calendar.id,
      exception.id,
      {
        closed: false,
        date: '2026-11-27',
        hours: 4,
        name: 'Short Day',
        workingDayEnd: '14:00',
        workingDayStart: '10:00',
      },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        closed: false,
        hours: 4,
        workingDayEnd: '14:00',
        workingDayStart: '10:00',
      }),
    );
    await expect(
      controller.listExceptionDays(undefined, calendar.id),
    ).resolves.toHaveLength(1);

    await controller.deleteExceptionDay(undefined, calendar.id, exception.id);
    await expect(
      controller.listExceptionDays(undefined, calendar.id),
    ).resolves.toEqual([]);
  });

  it('isolates calendar data by organization scope', async () => {
    const calendar = await createCalendar(controller);

    await expect(controller.listCalendars('other-org')).resolves.toEqual([]);
    await expect(
      controller.getCalendar('other-org', calendar.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects invalid calendar metadata and dates', async () => {
    await expect(
      controller.createCalendar(undefined, {
        name: 'Bad Timezone',
        timezone: 'Not/A_Timezone',
        type: CalendarType.Enterprise,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    const calendar = await createCalendar(controller);
    await expect(
      controller.createHoliday(undefined, calendar.id, {
        date: '2026-02-31',
        name: 'Invalid Date',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

function createCalendar(controller: CalendarController) {
  return controller.createCalendar(undefined, {
    name: `Corporate Calendar ${Math.random()}`,
    timezone: 'UTC',
    type: CalendarType.Enterprise,
  });
}
