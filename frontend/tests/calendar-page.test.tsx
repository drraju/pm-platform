import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalendarPage from "@/app/(app)/calendar/page";

const calendarApiMocks = vi.hoisted(() => ({
  createCalendar: vi.fn(),
  createExceptionDay: vi.fn(),
  createHoliday: vi.fn(),
  createWorkingHours: vi.fn(),
  deleteCalendar: vi.fn(),
  deleteExceptionDay: vi.fn(),
  deleteHoliday: vi.fn(),
  deleteWorkingHours: vi.fn(),
  getCalendars: vi.fn(),
  getExceptionDays: vi.fn(),
  getHolidays: vi.fn(),
  getWorkingHours: vi.fn(),
  updateCalendar: vi.fn(),
  updateExceptionDay: vi.fn(),
  updateHoliday: vi.fn(),
  updateWorkingHours: vi.fn(),
}));

vi.mock("@/features/calendar/api/calendar-api", () => calendarApiMocks);

const calendar = {
  createdAt: "2026-07-08T00:00:00.000Z",
  defaultWorkingDays: [1, 2, 3, 4, 5],
  description: "Corporate working calendar",
  hoursPerDay: 8,
  id: "calendar-1",
  isDefault: true,
  name: "Corporate Calendar",
  organizationId: "default",
  status: "active",
  timezone: "UTC",
  type: "enterprise",
  updatedAt: "2026-07-08T00:00:00.000Z",
  workingDayEnd: "17:00:00",
  workingDayStart: "09:00:00",
} as const;

describe("CalendarPage", () => {
  beforeEach(() => {
    calendarApiMocks.createCalendar.mockReset();
    calendarApiMocks.createExceptionDay.mockReset();
    calendarApiMocks.createHoliday.mockReset();
    calendarApiMocks.createWorkingHours.mockReset();
    calendarApiMocks.deleteCalendar.mockReset();
    calendarApiMocks.deleteExceptionDay.mockReset();
    calendarApiMocks.deleteHoliday.mockReset();
    calendarApiMocks.deleteWorkingHours.mockReset();
    calendarApiMocks.getCalendars.mockReset();
    calendarApiMocks.getExceptionDays.mockReset();
    calendarApiMocks.getHolidays.mockReset();
    calendarApiMocks.getWorkingHours.mockReset();
    calendarApiMocks.updateCalendar.mockReset();
    calendarApiMocks.updateExceptionDay.mockReset();
    calendarApiMocks.updateHoliday.mockReset();
    calendarApiMocks.updateWorkingHours.mockReset();

    calendarApiMocks.getCalendars.mockResolvedValue([calendar]);
    calendarApiMocks.createCalendar.mockResolvedValue({
      ...calendar,
      id: "calendar-2",
      isDefault: false,
      name: "EMEA Calendar",
      timezone: "Europe/London",
    });
    calendarApiMocks.updateCalendar.mockResolvedValue({
      ...calendar,
      name: "Updated Corporate Calendar",
    });
    calendarApiMocks.deleteCalendar.mockResolvedValue(undefined);
    calendarApiMocks.getWorkingHours.mockResolvedValue([
      {
        calendarId: "calendar-1",
        dayOfWeek: 1,
        end: "17:00:00",
        hours: 8,
        id: "1",
        start: "09:00:00",
      },
    ]);
    calendarApiMocks.createWorkingHours.mockResolvedValue({
      calendarId: "calendar-1",
      dayOfWeek: 2,
      end: "16:00",
      hours: 7,
      id: "2",
      start: "09:00",
    });
    calendarApiMocks.updateWorkingHours.mockResolvedValue({
      calendarId: "calendar-1",
      dayOfWeek: 1,
      end: "16:00",
      hours: 7,
      id: "1",
      start: "09:00",
    });
    calendarApiMocks.deleteWorkingHours.mockResolvedValue(undefined);
    calendarApiMocks.getHolidays.mockResolvedValue([
      {
        calendarId: "calendar-1",
        date: "2026-12-25",
        id: "holiday-1",
        name: "Christmas",
      },
    ]);
    calendarApiMocks.createHoliday.mockResolvedValue({
      calendarId: "calendar-1",
      date: "2026-11-26",
      id: "holiday-2",
      name: "Thanksgiving",
    });
    calendarApiMocks.updateHoliday.mockResolvedValue({
      calendarId: "calendar-1",
      date: "2026-12-24",
      id: "holiday-1",
      name: "Christmas Eve",
    });
    calendarApiMocks.deleteHoliday.mockResolvedValue(undefined);
    calendarApiMocks.getExceptionDays.mockResolvedValue([
      {
        calendarId: "calendar-1",
        closed: true,
        date: "2026-11-27",
        id: "exception-1",
        name: "Closure",
      },
    ]);
    calendarApiMocks.createExceptionDay.mockResolvedValue({
      calendarId: "calendar-1",
      closed: false,
      date: "2026-11-28",
      id: "exception-2",
      name: "Short Day",
      workingDayEnd: "14:00",
      workingDayStart: "10:00",
    });
    calendarApiMocks.updateExceptionDay.mockResolvedValue({
      calendarId: "calendar-1",
      closed: false,
      date: "2026-11-27",
      id: "exception-1",
      name: "Short Friday",
      workingDayEnd: "14:00",
      workingDayStart: "10:00",
    });
    calendarApiMocks.deleteExceptionDay.mockResolvedValue(undefined);
  });

  it("renders the calendar page and loads the calendar list", async () => {
    render(<CalendarPage />);

    expect(
      screen.getByRole("heading", { name: /enterprise calendars/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/loading calendars/i)).toBeInTheDocument();
    expect(await screen.findByText("Corporate Calendar")).toBeInTheDocument();
    expect(screen.getByText("UTC")).toBeInTheDocument();
    expect(screen.getAllByText("Default").length).toBeGreaterThan(0);
  });

  it("opens the create dialog and submits a new calendar", async () => {
    render(<CalendarPage />);

    fireEvent.click(await screen.findByRole("button", { name: /\+ new calendar/i }));
    const dialog = await screen.findByRole("dialog", { name: /new calendar/i });
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "EMEA Calendar" },
    });
    fireEvent.change(within(dialog).getByLabelText("Timezone"), {
      target: { value: "Europe/London" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /create calendar/i }),
    );

    await waitFor(() => {
      expect(calendarApiMocks.createCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "EMEA Calendar",
          timezone: "Europe/London",
          type: "enterprise",
        }),
      );
    });
  });

  it("opens the edit dialog and submits general changes", async () => {
    render(<CalendarPage />);

    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    const dialog = await screen.findByRole("dialog", {
      name: /edit corporate calendar/i,
    });
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "Updated Corporate Calendar" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(calendarApiMocks.updateCalendar).toHaveBeenCalledWith(
        "calendar-1",
        expect.objectContaining({ name: "Updated Corporate Calendar" }),
      );
    });
  });

  it("confirms calendar deletion", async () => {
    render(<CalendarPage />);

    fireEvent.click(await screen.findByRole("button", { name: /^delete$/i }));
    const dialog = await screen.findByRole("dialog", { name: /delete calendar/i });
    expect(within(dialog).getByText(/confirm deletion of/i)).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /^delete calendar$/i }),
    );

    await waitFor(() => {
      expect(calendarApiMocks.deleteCalendar).toHaveBeenCalledWith("calendar-1");
    });
  });

  it("supports working hours editor validation and CRUD controls", async () => {
    render(<CalendarPage />);

    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    fireEvent.click(await screen.findByRole("tab", { name: /working hours/i }));
    const editor = await screen.findByTestId("working-hours-editor");
    expect(editor).toBeInTheDocument();

    fireEvent.change(within(editor).getByLabelText("Day"), {
      target: { value: "2" },
    });
    fireEvent.change(within(editor).getByLabelText("Start"), {
      target: { value: "17:00" },
    });
    fireEvent.change(within(editor).getByLabelText("End"), {
      target: { value: "09:00" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: /add interval/i }));
    expect(await screen.findByText(/start must be before end/i)).toBeInTheDocument();

    fireEvent.change(within(editor).getByLabelText("Start"), {
      target: { value: "09:00" },
    });
    fireEvent.change(within(editor).getByLabelText("End"), {
      target: { value: "16:00" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: /add interval/i }));

    await waitFor(() => {
      expect(calendarApiMocks.createWorkingHours).toHaveBeenCalledWith(
        "calendar-1",
        expect.objectContaining({ dayOfWeek: 2, end: "16:00", start: "09:00" }),
      );
    });

    fireEvent.click(within(editor).getByRole("button", { name: /^edit$/i }));
    fireEvent.click(within(editor).getByRole("button", { name: /update/i }));
    await waitFor(() => {
      expect(calendarApiMocks.updateWorkingHours).toHaveBeenCalledWith(
        "calendar-1",
        "1",
        expect.objectContaining({ end: "17:00", start: "09:00" }),
      );
    });

    fireEvent.click(within(editor).getByRole("button", { name: /remove/i }));
    await waitFor(() => {
      expect(calendarApiMocks.deleteWorkingHours).toHaveBeenCalledWith(
        "calendar-1",
        "1",
      );
    });
  });

  it("supports holiday CRUD UI", async () => {
    render(<CalendarPage />);

    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    fireEvent.click(await screen.findByRole("tab", { name: /holidays/i }));
    const table = await screen.findByTestId("holiday-table");
    expect(table).toBeInTheDocument();

    fireEvent.change(within(table).getByLabelText("Holiday Name"), {
      target: { value: "Thanksgiving" },
    });
    fireEvent.change(within(table).getByLabelText("Date"), {
      target: { value: "2026-11-26" },
    });
    fireEvent.click(within(table).getByRole("button", { name: /add holiday/i }));

    await waitFor(() => {
      expect(calendarApiMocks.createHoliday).toHaveBeenCalledWith("calendar-1", {
        date: "2026-11-26",
        name: "Thanksgiving",
      });
    });

    fireEvent.click(within(table).getByRole("button", { name: /^edit$/i }));
    fireEvent.change(within(table).getByLabelText("Holiday Name"), {
      target: { value: "Christmas Eve" },
    });
    fireEvent.change(within(table).getByLabelText("Date"), {
      target: { value: "2026-12-24" },
    });
    fireEvent.click(within(table).getByRole("button", { name: /update/i }));
    await waitFor(() => {
      expect(calendarApiMocks.updateHoliday).toHaveBeenCalledWith(
        "calendar-1",
        "holiday-1",
        { date: "2026-12-24", name: "Christmas Eve" },
      );
    });

    fireEvent.click(within(table).getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      expect(calendarApiMocks.deleteHoliday).toHaveBeenCalledWith(
        "calendar-1",
        "holiday-1",
      );
    });
  });

  it("supports exception day CRUD UI", async () => {
    render(<CalendarPage />);

    fireEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
    fireEvent.click(await screen.findByRole("tab", { name: /exception days/i }));
    const table = await screen.findByTestId("exception-table");
    expect(table).toBeInTheDocument();

    fireEvent.change(within(table).getByLabelText("Date"), {
      target: { value: "2026-11-28" },
    });
    fireEvent.change(within(table).getByLabelText("Name"), {
      target: { value: "Short Day" },
    });
    fireEvent.click(within(table).getByLabelText("Closed"));
    fireEvent.change(within(table).getByLabelText("Start"), {
      target: { value: "10:00" },
    });
    fireEvent.change(within(table).getByLabelText("End"), {
      target: { value: "14:00" },
    });
    fireEvent.click(within(table).getByRole("button", { name: /add exception/i }));

    await waitFor(() => {
      expect(calendarApiMocks.createExceptionDay).toHaveBeenCalledWith(
        "calendar-1",
        expect.objectContaining({
          closed: false,
          date: "2026-11-28",
          name: "Short Day",
          workingDayEnd: "14:00",
          workingDayStart: "10:00",
        }),
      );
    });

    fireEvent.click(within(table).getByRole("button", { name: /^edit$/i }));
    fireEvent.change(within(table).getByLabelText("Name"), {
      target: { value: "Short Friday" },
    });
    fireEvent.click(within(table).getByRole("button", { name: /update/i }));
    await waitFor(() => {
      expect(calendarApiMocks.updateExceptionDay).toHaveBeenCalledWith(
        "calendar-1",
        "exception-1",
        expect.objectContaining({ name: "Short Friday" }),
      );
    });

    fireEvent.click(within(table).getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      expect(calendarApiMocks.deleteExceptionDay).toHaveBeenCalledWith(
        "calendar-1",
        "exception-1",
      );
    });
  });
});
