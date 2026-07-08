export type CalendarStatus = "active" | "archived";

export type CalendarType = "enterprise";

export type EnterpriseCalendar = {
  createdAt?: string;
  defaultWorkingDays: number[];
  description?: string | null;
  hoursPerDay: number;
  id: string;
  isDefault: boolean;
  name: string;
  organizationId?: string;
  status: CalendarStatus;
  timezone: string;
  type: CalendarType;
  updatedAt?: string;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

export type CalendarInput = {
  defaultWorkingDays?: number[];
  description?: string | null;
  hoursPerDay?: number;
  isDefault?: boolean;
  name: string;
  status?: CalendarStatus;
  timezone?: string;
  type: CalendarType;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

export type WorkingHours = {
  calendarId: string;
  dayOfWeek: number;
  end: string;
  hours?: number | null;
  id: string;
  start: string;
};

export type WorkingHoursInput = {
  dayOfWeek: number;
  end: string;
  hours?: number | null;
  start: string;
};

export type Holiday = {
  calendarId: string;
  createdAt?: string;
  date: string;
  id: string;
  name: string;
  recurring?: boolean;
  updatedAt?: string;
};

export type HolidayInput = {
  date: string;
  name: string;
};

export type ExceptionDay = {
  calendarId: string;
  closed: boolean;
  createdAt?: string;
  date: string;
  hours?: number | null;
  id: string;
  name: string;
  updatedAt?: string;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};

export type ExceptionDayInput = {
  closed: boolean;
  date: string;
  hours?: number | null;
  name: string;
  workingDayEnd?: string | null;
  workingDayStart?: string | null;
};
