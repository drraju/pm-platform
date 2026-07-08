"use client";

import React, { useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { CalendarForm } from "./CalendarForm";
import { ExceptionTable } from "./ExceptionTable";
import { HolidayTable } from "./HolidayTable";
import { WorkingHoursEditor } from "./WorkingHoursEditor";
import type { CalendarInput, EnterpriseCalendar } from "../types";

type CalendarDialogProps = {
  calendar?: EnterpriseCalendar | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (
    input: CalendarInput,
    calendar?: EnterpriseCalendar | null,
  ) => Promise<EnterpriseCalendar | void>;
};

const tabs = ["General", "Working Hours", "Holidays", "Exception Days"] as const;

type CalendarTab = (typeof tabs)[number];

export function CalendarDialog({
  calendar,
  isSaving,
  onClose,
  onSave,
}: CalendarDialogProps) {
  const [activeTab, setActiveTab] = useState<CalendarTab>("General");
  const isCreateMode = !calendar;

  async function handleSave(input: CalendarInput) {
    const savedCalendar = await onSave(input, calendar);
    if (!calendar && savedCalendar) {
      onClose();
    }
  }

  return (
    <AppModal
      description={
        isCreateMode
          ? "Create an enterprise calendar for administrative maintenance."
          : "Maintain enterprise calendar metadata, working hours, holidays, and exception days."
      }
      labelledById="calendar-dialog-title"
      onClose={onClose}
      title={isCreateMode ? "New calendar" : `Edit ${calendar.name}`}
      widthClassName="max-w-5xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {tabs.map((tab) => {
            const disabled = isCreateMode && tab !== "General";
            return (
              <button
                aria-selected={activeTab === tab}
                className={`border-b-2 px-3 py-2 text-sm font-semibold ${
                  activeTab === tab
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                } disabled:cursor-not-allowed disabled:text-slate-300`}
                disabled={disabled}
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                type="button"
              >
                {tab}
              </button>
            );
          })}
        </div>

        {activeTab === "General" ? (
          <CalendarForm
            calendar={calendar}
            isSaving={isSaving}
            onCancel={onClose}
            onSubmit={handleSave}
          />
        ) : null}

        {calendar && activeTab === "Working Hours" ? (
          <WorkingHoursEditor calendarId={calendar.id} />
        ) : null}

        {calendar && activeTab === "Holidays" ? (
          <HolidayTable calendarId={calendar.id} />
        ) : null}

        {calendar && activeTab === "Exception Days" ? (
          <ExceptionTable calendarId={calendar.id} />
        ) : null}
      </div>
    </AppModal>
  );
}
