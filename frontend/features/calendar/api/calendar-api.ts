import { apiRequest } from "@/lib/api/client";
import type {
  CalendarInput,
  EnterpriseCalendar,
  ExceptionDay,
  ExceptionDayInput,
  Holiday,
  HolidayInput,
  WorkingHours,
  WorkingHoursInput,
} from "../types";

export function getCalendars() {
  return apiRequest<EnterpriseCalendar[]>("/calendar");
}

export function getCalendar(calendarId: string) {
  return apiRequest<EnterpriseCalendar>(`/calendar/${calendarId}`);
}

export function createCalendar(input: CalendarInput) {
  return apiRequest<EnterpriseCalendar>("/calendar", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCalendar(calendarId: string, input: Partial<CalendarInput>) {
  return apiRequest<EnterpriseCalendar>(`/calendar/${calendarId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCalendar(calendarId: string) {
  return apiRequest<void>(`/calendar/${calendarId}`, {
    method: "DELETE",
  });
}

export function getWorkingHours(calendarId: string) {
  return apiRequest<WorkingHours[]>(`/calendar/${calendarId}/working-hours`);
}

export function createWorkingHours(calendarId: string, input: WorkingHoursInput) {
  return apiRequest<WorkingHours>(`/calendar/${calendarId}/working-hours`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorkingHours(
  calendarId: string,
  workingHourId: string,
  input: Omit<WorkingHoursInput, "dayOfWeek">,
) {
  return apiRequest<WorkingHours>(
    `/calendar/${calendarId}/working-hours/${workingHourId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function deleteWorkingHours(calendarId: string, workingHourId: string) {
  return apiRequest<void>(
    `/calendar/${calendarId}/working-hours/${workingHourId}`,
    {
      method: "DELETE",
    },
  );
}

export function getHolidays(calendarId: string) {
  return apiRequest<Holiday[]>(`/calendar/${calendarId}/holidays`);
}

export function createHoliday(calendarId: string, input: HolidayInput) {
  return apiRequest<Holiday>(`/calendar/${calendarId}/holidays`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateHoliday(
  calendarId: string,
  holidayId: string,
  input: HolidayInput,
) {
  return apiRequest<Holiday>(`/calendar/${calendarId}/holidays/${holidayId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteHoliday(calendarId: string, holidayId: string) {
  return apiRequest<void>(`/calendar/${calendarId}/holidays/${holidayId}`, {
    method: "DELETE",
  });
}

export function getExceptionDays(calendarId: string) {
  return apiRequest<ExceptionDay[]>(`/calendar/${calendarId}/exceptions`);
}

export function createExceptionDay(calendarId: string, input: ExceptionDayInput) {
  return apiRequest<ExceptionDay>(`/calendar/${calendarId}/exceptions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateExceptionDay(
  calendarId: string,
  exceptionId: string,
  input: ExceptionDayInput,
) {
  return apiRequest<ExceptionDay>(
    `/calendar/${calendarId}/exceptions/${exceptionId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function deleteExceptionDay(calendarId: string, exceptionId: string) {
  return apiRequest<void>(`/calendar/${calendarId}/exceptions/${exceptionId}`, {
    method: "DELETE",
  });
}
