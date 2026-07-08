export const calendarType = "enterprise" as const;

export const weekDays = [
  { label: "Sunday", shortLabel: "Sun", value: 0 },
  { label: "Monday", shortLabel: "Mon", value: 1 },
  { label: "Tuesday", shortLabel: "Tue", value: 2 },
  { label: "Wednesday", shortLabel: "Wed", value: 3 },
  { label: "Thursday", shortLabel: "Thu", value: 4 },
  { label: "Friday", shortLabel: "Fri", value: 5 },
  { label: "Saturday", shortLabel: "Sat", value: 6 },
];

export const defaultCalendarForm = {
  defaultWorkingDays: [1, 2, 3, 4, 5],
  description: "",
  hoursPerDay: 8,
  isDefault: false,
  name: "",
  status: "active",
  timezone: "UTC",
  type: calendarType,
  workingDayEnd: "17:00",
  workingDayStart: "09:00",
} as const;

export const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];
