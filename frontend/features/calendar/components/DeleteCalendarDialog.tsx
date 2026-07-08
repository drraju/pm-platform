"use client";

import React from "react";
import { AppModal } from "@/components/ui/app-modal";
import type { EnterpriseCalendar } from "../types";

type DeleteCalendarDialogProps = {
  calendar: EnterpriseCalendar;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteCalendarDialog({
  calendar,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteCalendarDialogProps) {
  return (
    <AppModal
      description="Archive this enterprise calendar. Existing scheduling behavior is not recalculated from this screen."
      labelledById="delete-calendar-title"
      onClose={onCancel}
      title="Delete calendar"
      widthClassName="max-w-lg"
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-slate-600">
          Confirm deletion of{" "}
          <span className="font-semibold text-slate-950">{calendar.name}</span>.
        </p>
        <div className="flex justify-end gap-3">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete calendar"}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
