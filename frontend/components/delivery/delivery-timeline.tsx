"use client";

import React, { useMemo } from "react";
import { EmptyState, StatusBadge, WorkspaceSection } from "@/components/foundation";
import { getDisplayedPercentComplete } from "@/components/projects/execution-update-payload";
import type { ApiTask } from "@/features/projects";
import { getDateOnly, getTaskDueDate } from "./delivery-filters";

type DeliveryTimelineProps = {
  tasks: ApiTask[];
};

/**
 * Execution progress timeline — not the Planning Gantt.
 * Shows when work is targeted to finish and current execution state.
 */
export function DeliveryTimeline({ tasks }: DeliveryTimelineProps) {
  const rows = useMemo(() => {
    return tasks
      .filter((task) => task.taskKind !== "summary")
      .map((task) => ({
        date: getTaskDueDate(task),
        progress: getDisplayedPercentComplete(task),
        status: task.status,
        task,
      }))
      .sort((left, right) => {
        if (!left.date && !right.date) {
          return left.task.title.localeCompare(right.task.title);
        }
        if (!left.date) return 1;
        if (!right.date) return -1;
        return left.date.localeCompare(right.date);
      });
  }, [tasks]);

  if (rows.length === 0) {
    return (
      <EmptyState
        description="No executable tasks are available for the timeline."
        title="No timeline items"
      />
    );
  }

  const today = getDateOnly(new Date());

  return (
    <WorkspaceSection surface="card">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-950">
          Execution timeline
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Target dates and progress. Scheduling changes belong in Planning.
        </p>
      </div>
      <ol aria-label="Execution timeline" className="space-y-2">
        {rows.map(({ date, progress, status, task }) => {
          const isOverdue = Boolean(
            date && today && date < today && status !== "done",
          );

          return (
            <li
              className="grid grid-cols-[7rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              key={task.id}
            >
              <span
                className={`font-semibold tabular-nums ${
                  isOverdue ? "text-red-700" : "text-slate-700"
                }`}
              >
                {date ?? "No date"}
              </span>
              <span className="min-w-0 truncate font-medium text-slate-900">
                {task.title}
              </span>
              <StatusBadge size="sm" tone={statusTone(status)}>
                {formatStatus(status)}
              </StatusBadge>
              <span className="w-12 text-right text-xs font-semibold text-slate-600">
                {progress}%
              </span>
            </li>
          );
        })}
      </ol>
    </WorkspaceSection>
  );
}

function formatStatus(status: ApiTask["status"]) {
  return status.replaceAll("_", " ");
}

function statusTone(status: ApiTask["status"]) {
  if (status === "done") return "success" as const;
  if (status === "blocked") return "critical" as const;
  if (status === "in_progress") return "warning" as const;
  return "neutral" as const;
}
