"use client";

import React, { FormEvent, useEffect, useState } from "react";
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
} from "../api/calendar-api";
import type { Holiday } from "../types";

type HolidayTableProps = {
  calendarId: string;
};

export function HolidayTable({ calendarId }: HolidayTableProps) {
  const [rows, setRows] = useState<Holiday[]>([]);
  const [form, setForm] = useState({ date: "", name: "", recurring: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRows() {
    setRows(await getHolidays(calendarId));
  }

  useEffect(() => {
    void loadRows();
  }, [calendarId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.date) {
      setError("Holiday name and date are required.");
      return;
    }
    if (
      !editingId &&
      rows.some((row) => row.date.slice(0, 10) === form.date)
    ) {
      setError("That holiday date already exists.");
      return;
    }

    setError(null);
    if (editingId) {
      await updateHoliday(calendarId, editingId, {
        date: form.date,
        name: form.name.trim(),
      });
    } else {
      await createHoliday(calendarId, {
        date: form.date,
        name: form.name.trim(),
      });
    }
    setEditingId(null);
    setForm({ date: "", name: "", recurring: false });
    await loadRows();
  }

  function startEditing(row: Holiday) {
    setEditingId(row.id);
    setForm({
      date: row.date.slice(0, 10),
      name: row.name,
      recurring: Boolean(row.recurring),
    });
  }

  async function handleDelete(row: Holiday) {
    await deleteHoliday(calendarId, row.id);
    await loadRows();
  }

  return (
    <section className="space-y-4" data-testid="holiday-table">
      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
        onSubmit={handleSubmit}
      >
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Holiday Name
          </span>
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            value={form.name}
          />
        </label>
        <label className="space-y-1">
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
        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
          <input
            checked={form.recurring}
            className="size-4 rounded border-slate-300 text-brand"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                recurring: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Recurring
        </label>
        <div className="flex items-end">
          <button
            className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
            type="submit"
          >
            {editingId ? "Update" : "Add holiday"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={["Holiday Name", "Date", "Recurring", "Actions"]}
        rows={rows.map((row) => [
          row.name,
          row.date.slice(0, 10),
          row.recurring ? "Yes" : "No",
          <RowActions
            key={row.id}
            onDelete={() => void handleDelete(row)}
            onEdit={() => startEditing(row)}
          />,
        ])}
      />
    </section>
  );
}

function RowActions({
  onDelete,
  onEdit,
}: {
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
        onClick={onEdit}
        type="button"
      >
        Edit
      </button>
      <button
        className="rounded-md border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </div>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column, index) => (
              <th
                className={`px-4 py-3 ${index === columns.length - 1 ? "text-right" : ""}`}
                key={column}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    className={`px-4 py-3 ${cellIndex === row.length - 1 ? "text-right" : ""}`}
                    key={cellIndex}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>
                Not found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
