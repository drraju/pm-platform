"use client";

import React, { FormEvent, useEffect, useState } from "react";
import {
  createWorkingHours,
  deleteWorkingHours,
  getWorkingHours,
  updateWorkingHours,
} from "../api/calendar-api";
import { weekDays } from "../constants";
import type { WorkingHours } from "../types";

type WorkingHoursEditorProps = {
  calendarId: string;
};

export function WorkingHoursEditor({ calendarId }: WorkingHoursEditorProps) {
  const [rows, setRows] = useState<WorkingHours[]>([]);
  const [form, setForm] = useState({
    dayOfWeek: 1,
    end: "17:00",
    hours: 8,
    start: "09:00",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRows() {
    setRows(await getWorkingHours(calendarId));
  }

  useEffect(() => {
    void loadRows();
  }, [calendarId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.start >= form.end) {
      setError("Start must be before end.");
      return;
    }
    if (
      !editingId &&
      rows.some((row) => row.dayOfWeek === Number(form.dayOfWeek))
    ) {
      setError("That day already has a working interval.");
      return;
    }

    setError(null);
    if (editingId) {
      await updateWorkingHours(calendarId, editingId, {
        end: form.end,
        hours: Number(form.hours),
        start: form.start,
      });
    } else {
      await createWorkingHours(calendarId, {
        dayOfWeek: Number(form.dayOfWeek),
        end: form.end,
        hours: Number(form.hours),
        start: form.start,
      });
    }
    setEditingId(null);
    setForm({ dayOfWeek: 1, end: "17:00", hours: 8, start: "09:00" });
    await loadRows();
  }

  function startEditing(row: WorkingHours) {
    setEditingId(row.id);
    setForm({
      dayOfWeek: row.dayOfWeek,
      end: row.end.slice(0, 5),
      hours: row.hours ?? 8,
      start: row.start.slice(0, 5),
    });
  }

  async function handleDelete(row: WorkingHours) {
    await deleteWorkingHours(calendarId, row.id);
    await loadRows();
  }

  return (
    <section className="space-y-4" data-testid="working-hours-editor">
      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        onSubmit={handleSubmit}
      >
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Day
          </span>
          <select
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            disabled={Boolean(editingId)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                dayOfWeek: Number(event.target.value),
              }))
            }
            value={form.dayOfWeek}
          >
            {weekDays.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <TimeInput
          label="Start"
          onChange={(value) =>
            setForm((current) => ({ ...current, start: value }))
          }
          value={form.start}
        />
        <TimeInput
          label="End"
          onChange={(value) => setForm((current) => ({ ...current, end: value }))}
          value={form.end}
        />
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hours
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            max={24}
            min={0.25}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hours: Number(event.target.value),
              }))
            }
            step={0.25}
            type="number"
            value={form.hours}
          />
        </label>
        <div className="flex items-end">
          <button
            className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            type="submit"
          >
            {editingId ? "Update" : "Add interval"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {weekDays.find((day) => day.value === row.dayOfWeek)?.label}
                </td>
                <td className="px-4 py-3">{row.start.slice(0, 5)}</td>
                <td className="px-4 py-3">{row.end.slice(0, 5)}</td>
                <td className="px-4 py-3">{row.hours ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => startEditing(row)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-md border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => void handleDelete(row)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimeInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
        onChange={(event) => onChange(event.target.value)}
        type="time"
        value={value}
      />
    </label>
  );
}
