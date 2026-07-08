"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCalendar,
  deleteCalendar,
  getCalendars,
  updateCalendar,
} from "../api/calendar-api";
import type { CalendarInput, EnterpriseCalendar } from "../types";

export function useCalendars() {
  const [calendars, setCalendars] = useState<EnterpriseCalendar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadCalendars = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      setCalendars(await getCalendars());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load calendars",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  async function saveCalendar(
    input: CalendarInput,
    calendar?: EnterpriseCalendar | null,
  ) {
    setError(null);
    setIsSaving(true);
    try {
      const savedCalendar = calendar
        ? await updateCalendar(calendar.id, input)
        : await createCalendar(input);
      setCalendars((currentCalendars) => {
        if (calendar) {
          return currentCalendars.map((currentCalendar) =>
            currentCalendar.id === calendar.id ? savedCalendar : currentCalendar,
          );
        }
        return [...currentCalendars, savedCalendar];
      });
      return savedCalendar;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to save calendar";
      setError(message);
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCalendar(calendar: EnterpriseCalendar) {
    setError(null);
    setIsSaving(true);
    try {
      await deleteCalendar(calendar.id);
      setCalendars((currentCalendars) =>
        currentCalendars.filter((currentCalendar) => currentCalendar.id !== calendar.id),
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete calendar";
      setError(message);
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    calendars,
    error,
    isLoading,
    isSaving,
    refresh: loadCalendars,
    removeCalendar,
    saveCalendar,
  };
}
