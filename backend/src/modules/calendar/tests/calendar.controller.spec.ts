import { CalendarController } from '../calendar.controller';
import { CalendarService, DEFAULT_ORGANIZATION_ID } from '../calendar.service';
import { CalendarType } from '../dto/calendar.dto';

describe('CalendarController', () => {
  let controller: CalendarController;
  let service: Record<keyof CalendarService, jest.Mock>;

  beforeEach(() => {
    service = {
      createCalendar: jest.fn(),
      createExceptionDay: jest.fn(),
      createHoliday: jest.fn(),
      createWorkingHours: jest.fn(),
      deleteCalendar: jest.fn(),
      deleteExceptionDay: jest.fn(),
      deleteHoliday: jest.fn(),
      deleteWorkingHours: jest.fn(),
      getCalendar: jest.fn(),
      listCalendars: jest.fn(),
      listExceptionDays: jest.fn(),
      listHolidays: jest.fn(),
      listWorkingHours: jest.fn(),
      replaceCalendar: jest.fn(),
      updateCalendar: jest.fn(),
      updateExceptionDay: jest.fn(),
      updateHoliday: jest.fn(),
      updateWorkingHours: jest.fn(),
    } as unknown as Record<keyof CalendarService, jest.Mock>;

    controller = new CalendarController(service as unknown as CalendarService);
  });

  it('forwards calendar CRUD requests with the default organization scope', async () => {
    await controller.createCalendar(undefined, {
      name: 'Corporate Calendar',
      type: CalendarType.Enterprise,
    });
    await controller.listCalendars(undefined);
    await controller.getCalendar(undefined, 'calendar-id');
    await controller.replaceCalendar(undefined, 'calendar-id', {
      name: 'Corporate Calendar',
      type: CalendarType.Enterprise,
    });
    await controller.updateCalendar(undefined, 'calendar-id', {
      name: 'Renamed Calendar',
    });
    await controller.deleteCalendar(undefined, 'calendar-id');

    expect(service.createCalendar).toHaveBeenCalledWith(DEFAULT_ORGANIZATION_ID, {
      name: 'Corporate Calendar',
      type: CalendarType.Enterprise,
    });
    expect(service.listCalendars).toHaveBeenCalledWith(DEFAULT_ORGANIZATION_ID);
    expect(service.getCalendar).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
    );
    expect(service.replaceCalendar).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      { name: 'Corporate Calendar', type: CalendarType.Enterprise },
    );
    expect(service.updateCalendar).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      { name: 'Renamed Calendar' },
    );
    expect(service.deleteCalendar).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
    );
  });

  it('forwards nested resource requests with the provided organization scope', async () => {
    const organizationId = ' default ';

    await controller.listWorkingHours(organizationId, 'calendar-id');
    await controller.createWorkingHours(organizationId, 'calendar-id', {
      dayOfWeek: 1,
      end: '17:00',
      start: '09:00',
    });
    await controller.updateWorkingHours(organizationId, 'calendar-id', '1', {
      end: '16:00',
      start: '08:00',
    });
    await controller.deleteWorkingHours(organizationId, 'calendar-id', '1');
    await controller.listHolidays(organizationId, 'calendar-id');
    await controller.createHoliday(organizationId, 'calendar-id', {
      date: '2026-12-25',
      name: 'Christmas',
    });
    await controller.updateHoliday(organizationId, 'calendar-id', 'holiday-id', {
      date: '2026-12-24',
      name: 'Christmas Eve',
    });
    await controller.deleteHoliday(organizationId, 'calendar-id', 'holiday-id');
    await controller.listExceptionDays(organizationId, 'calendar-id');
    await controller.createExceptionDay(organizationId, 'calendar-id', {
      closed: true,
      date: '2026-11-27',
      name: 'Closure',
    });
    await controller.updateExceptionDay(
      organizationId,
      'calendar-id',
      'exception-id',
      {
        closed: false,
        date: '2026-11-27',
        name: 'Short Day',
        workingDayEnd: '14:00',
        workingDayStart: '10:00',
      },
    );
    await controller.deleteExceptionDay(
      organizationId,
      'calendar-id',
      'exception-id',
    );

    expect(service.listWorkingHours).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
    );
    expect(service.createWorkingHours).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      { dayOfWeek: 1, end: '17:00', start: '09:00' },
    );
    expect(service.updateWorkingHours).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      '1',
      { end: '16:00', start: '08:00' },
    );
    expect(service.deleteWorkingHours).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      '1',
    );
    expect(service.listHolidays).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
    );
    expect(service.createHoliday).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      { date: '2026-12-25', name: 'Christmas' },
    );
    expect(service.updateHoliday).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      'holiday-id',
      { date: '2026-12-24', name: 'Christmas Eve' },
    );
    expect(service.deleteHoliday).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      'holiday-id',
    );
    expect(service.listExceptionDays).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
    );
    expect(service.createExceptionDay).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      { closed: true, date: '2026-11-27', name: 'Closure' },
    );
    expect(service.updateExceptionDay).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      'exception-id',
      {
        closed: false,
        date: '2026-11-27',
        name: 'Short Day',
        workingDayEnd: '14:00',
        workingDayStart: '10:00',
      },
    );
    expect(service.deleteExceptionDay).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'calendar-id',
      'exception-id',
    );
  });
});
