import React from "react";
import { EmptyState } from "@/components/ui/states";
import type {
  ApiPlanningTaskSchedule,
  ApiResourceAllocation,
} from "@/lib/api/client";

type PlanningDetailPanelProps = {
  allocations: ApiResourceAllocation[];
  isCritical: boolean;
  predecessorCount: number;
  schedule: ApiPlanningTaskSchedule | null;
  successorCount: number;
  wbs?: string;
};

export function PlanningDetailPanel({
  allocations,
  isCritical,
  predecessorCount,
  schedule,
  successorCount,
  wbs,
}: PlanningDetailPanelProps) {
  return (
    <aside
      aria-label="Planning detail panel"
      className="shrink-0 border-t border-slate-200 bg-slate-50/70 p-4 2xl:sticky 2xl:top-0 2xl:w-72 2xl:self-start 2xl:border-l 2xl:border-t-0"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Task Details</h3>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Selection
        </span>
      </div>

      {!schedule ? (
        <EmptyState
          className="mt-4"
          surface="white"
          variant="dashed"
        >
          Select a grid row or Gantt object to inspect its planning details.
        </EmptyState>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {wbs ?? "Unnumbered"} · {formatTaskKind(schedule)}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {getTaskTitle(schedule)}
            </p>
            {isCritical ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                <span
                  aria-hidden="true"
                  className="inline-flex size-4 items-center justify-center rounded-full bg-red-100"
                >
                  !
                </span>
                Critical path
              </p>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <DetailItem
              label="Status"
              value={formatLabel(schedule.status ?? schedule.task?.status)}
            />
            <DetailItem
              label="Progress"
              value={`${Number(schedule.percentComplete ?? 0).toFixed(0)}%`}
            />
            <DetailItem
              label="Start"
              value={formatDate(schedule.plannedStartDate)}
            />
            <DetailItem
              label="Finish"
              value={formatDate(schedule.plannedFinishDate)}
            />
            <DetailItem
              label="Duration"
              value={`${Number(schedule.durationDays ?? 0)} days`}
            />
            <DetailItem label="Owner" value={formatOwner(schedule)} />
            <DetailItem label="Predecessors" value={String(predecessorCount)} />
            <DetailItem label="Successors" value={String(successorCount)} />
            <DetailItem
              label="Total Float"
              value={formatFloat(schedule.totalFloatDays)}
            />
            <DetailItem
              label="Allocations"
              value={String(allocations.length)}
            />
          </dl>

          <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
            Edit directly in the grid. Changes use the existing validation,
            recalculation, and persistence workflow.
          </p>
        </div>
      )}
    </aside>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-slate-900" title={value}>
        {value}
      </dd>
    </div>
  );
}

function getTaskTitle(schedule: ApiPlanningTaskSchedule) {
  const fallbackTask = schedule.task as
    | { name?: string | null; title?: string | null }
    | null
    | undefined;
  return (
    schedule.taskTitle?.trim() ||
    fallbackTask?.title?.trim() ||
    fallbackTask?.name?.trim() ||
    "Untitled task"
  );
}

function formatTaskKind(schedule: ApiPlanningTaskSchedule) {
  if (schedule.taskKind === "summary") {
    return "Summary";
  }
  if (schedule.taskKind === "milestone") {
    return "Milestone";
  }
  return "Task";
}

function formatOwner(schedule: ApiPlanningTaskSchedule) {
  const assignee = schedule.task?.assignee;
  if (!assignee) {
    return "Unassigned";
  }
  return (
    `${assignee.firstName} ${assignee.lastName}`.trim() ||
    assignee.email ||
    "Assigned"
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unscheduled";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function formatFloat(value?: number | null) {
  return typeof value === "number" ? `${value} days` : "Not calculated";
}

function formatLabel(value?: string | null) {
  if (!value) {
    return "Not set";
  }
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
