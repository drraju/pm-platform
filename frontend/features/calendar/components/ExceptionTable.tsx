"use client";

import React, { FormEvent, useEffect, useState } from "react";
import {
  createExceptionDay,
  deleteExceptionDay,
  getExceptionDays,
  updateExceptionDay,
} from "../api/calendar-api";
import type { ExceptionDay } from "../types";

type ExceptionTableProps = {
  calendarId: string;
};

export function ExceptionTable({ calendarId }: ExceptionTableProps) {
  const [rows, setRows] = useState<ExceptionDay[]>([]);
  const [form, setForm] = useState({
    closed: true,
    date: "",
    end: "17:00",
    hours: 8,
    name: "",
    start: "09:00",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRows() {
    setRows(await getExceptionDays(calendarId));
  }

  useEffect(() => {
    void loadRows();
  }, [calendarId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.date) {
      setError("Exception name and date are required.");
      return;
    }
    if (!form.closed && form.start >= form.end) {
      setError("Start must be before end.");
      return;
    }
    if (
      !editingId &&
      rows.some((row) => row.date.slice(0, 10) === form.date)
    ) {
      setError("That exception date already exists.");
      return;
    }

    const input = {
      closed: form.closed,
      date: form.date,
      hours: form.closed ? null : Number(form.hours),
      name: form.name.trim(),
      workingDayEnd: form.closed ? null : form.end,
      workingDayStart: form.closed ? null : form.start,
    };

    setError(null);
    if (editingId) {
      await updateExceptionDay(calendarId, editingId, input);
    } else {
      await createExceptionDay(calendarId, input);
    }
    setEditingId(null);
    setForm({
      closed: true,
      date: "",
      end: "17:00",
      hours: 8,
      name: "",
      start: "09:00",
    });
    await loadRows();
  }

  function startEditing(row: ExceptionDay) {
    setEditingId(row.id);
    setForm({
      closed: row.closed,
      date: row.date.slice(0, 10),
      end: row.workingDayEnd?.slice(0, 5) ?? "17:00",
      hours: row.hours ?? 8,
      name: row.name,
      start: row.workingDayStart?.slice(0, 5) ?? "09:00",
    });
  }

  async function handleDelete(row: ExceptionDay) {
    await deleteExceptionDay(calendarId, row.id);
    await loadRows();
  }

  return (
    <section className="space-y-4" data-testid="exception-table">
      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-6"
        onSubmit={handleSubmit}
      >
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            onChange={(event) =>
              setForm((current) => ({ ...current, date: event.target.value }))
            }
            type="date"
            value={form.date}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Name
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            value={form.name}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
          <input
            checked={form.closed}
            className="size-4 rounded border-slate-300 text-brand"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                closed: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Closed
        </label>
        <div className="flex items-end">
          <button
            className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            type="submit"
          >
            {editingId ? "Update" : "Add exception"}
          </button>
        </div>
        {!form.closed ? (
          <>
            <TimeField
              label="Start"
              onChange={(value) =>
                setForm((current) => ({ ...current, start: value }))
              }
              value={form.start}
            />
            <TimeField
              label="End"
              onChange={(value) =>
                setForm((current) => ({ ...current, end: value }))
              }
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
          </>
        ) : null}
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
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Working Intervals</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.date.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{row.closed ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    {row.closed
                      ? "Closed"
                      : `${row.workingDayStart?.slice(0, 5)}-${row.workingDayEnd?.slice(0, 5)}`}
                  </td>
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
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                  Not found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimeField({
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
