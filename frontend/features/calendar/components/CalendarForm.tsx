"use client";

import React, {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import { ErrorState } from "@/components/ui/states";
import { defaultCalendarForm, timezones } from "../constants";
import type { CalendarInput, EnterpriseCalendar } from "../types";

type CalendarFormProps = {
  calendar?: EnterpriseCalendar | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: CalendarInput) => Promise<void>;
};

export function CalendarForm({
  calendar,
  isSaving,
  onCancel,
  onSubmit,
}: CalendarFormProps) {
  const initialForm = useMemo(
    () => ({
      description: calendar?.description ?? defaultCalendarForm.description,
      isDefault: calendar?.isDefault ?? defaultCalendarForm.isDefault,
      name: calendar?.name ?? defaultCalendarForm.name,
      status: calendar?.status ?? defaultCalendarForm.status,
      timezone: calendar?.timezone ?? defaultCalendarForm.timezone,
    }),
    [calendar],
  );
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initialForm);
    setError(null);
  }, [initialForm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Calendar name is required.");
      nameInputRef.current?.focus();
      return;
    }

    setError(null);
    await onSubmit({
      defaultWorkingDays:
        calendar?.defaultWorkingDays ?? [...defaultCalendarForm.defaultWorkingDays],
      description: form.description.trim() || null,
      hoursPerDay: calendar?.hoursPerDay ?? defaultCalendarForm.hoursPerDay,
      isDefault: form.isDefault,
      name: form.name.trim(),
      status: form.status,
      timezone: form.timezone,
      type: "enterprise",
      workingDayEnd: calendar?.workingDayEnd ?? defaultCalendarForm.workingDayEnd,
      workingDayStart:
        calendar?.workingDayStart ?? defaultCalendarForm.workingDayStart,
    });
  }

  return (
    <ModalForm noValidate onSubmit={handleSubmit}>
      <ModalFormSection
        description="Maintain the enterprise working calendar metadata used by administration workflows."
        title="General"
      >
        <ModalFormGrid>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? "true" : undefined}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              ref={nameInputRef}
              required
              value={form.name}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Timezone</span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              value={form.timezone}
            >
              {timezones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>
        </ModalFormGrid>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            value={form.description ?? ""}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
            <input
              checked={form.status === "active"}
              className="size-4 rounded border-slate-300 text-brand"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.checked ? "active" : "archived",
                }))
              }
              type="checkbox"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
            <input
              checked={form.isDefault}
              className="size-4 rounded border-slate-300 text-brand"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isDefault: event.target.checked,
                }))
              }
              type="checkbox"
            />
            <span className="text-sm font-medium text-slate-700">Default</span>
          </label>
        </div>

        {error ? <ErrorState id={errorId}>{error}</ErrorState> : null}
      </ModalFormSection>

      <div className="flex justify-end gap-3">
        <button
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : calendar ? "Save changes" : "Create calendar"}
        </button>
      </div>
    </ModalForm>
  );
}
