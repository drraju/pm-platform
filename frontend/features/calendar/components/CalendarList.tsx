"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarDialog } from "./CalendarDialog";
import { DeleteCalendarDialog } from "./DeleteCalendarDialog";
import { useCalendars } from "../hooks/useCalendars";
import type { CalendarInput, EnterpriseCalendar } from "../types";

export function CalendarList() {
  const {
    calendars,
    error,
    isLoading,
    isSaving,
    refresh,
    removeCalendar,
    saveCalendar,
  } = useCalendars();
  const [selectedCalendar, setSelectedCalendar] =
    useState<EnterpriseCalendar | null>(null);
  const [calendarPendingDelete, setCalendarPendingDelete] =
    useState<EnterpriseCalendar | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function openCreateDialog() {
    setSelectedCalendar(null);
    setLocalError(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(calendar: EnterpriseCalendar) {
    setSelectedCalendar(calendar);
    setLocalError(null);
    setIsDialogOpen(true);
  }

  async function handleSave(
    input: CalendarInput,
    calendar?: EnterpriseCalendar | null,
  ) {
    try {
      const savedCalendar = await saveCalendar(input, calendar);
      setLocalError(null);
      await refresh();
      return savedCalendar;
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save calendar",
      );
    }
  }

  async function handleDelete() {
    if (!calendarPendingDelete) {
      return;
    }
    try {
      await removeCalendar(calendarPendingDelete);
      setCalendarPendingDelete(null);
      setLocalError(null);
    } catch (requestError) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete calendar",
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            onClick={openCreateDialog}
            type="button"
          >
            + New Calendar
          </button>
        }
        description="Administer enterprise calendars, working hours, holidays, and exception days without changing scheduling calculations."
        eyebrow="Administration"
        title="Enterprise Calendars"
      />

      {error || localError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {localError ?? error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  Loading calendars...
                </td>
              </tr>
            ) : calendars.length ? (
              calendars.map((calendar) => (
                <tr key={calendar.id}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        calendar.isDefault
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {calendar.isDefault ? "Default" : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">
                      {calendar.name}
                    </div>
                    {calendar.description ? (
                      <div className="mt-1 max-w-xl truncate text-xs text-slate-500">
                        {calendar.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{calendar.timezone}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                      {calendar.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => openEditDialog(calendar)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => setCalendarPendingDelete(calendar)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  Not found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isDialogOpen ? (
        <CalendarDialog
          calendar={selectedCalendar}
          isSaving={isSaving}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
        />
      ) : null}

      {calendarPendingDelete ? (
        <DeleteCalendarDialog
          calendar={calendarPendingDelete}
          isDeleting={isSaving}
          onCancel={() => setCalendarPendingDelete(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
