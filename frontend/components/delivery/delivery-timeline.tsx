"use client";

import React, { useMemo, useState } from "react";
import {
  EmptyState,
  StatusBadge,
  WorkspaceSection,
} from "@/components/foundation";
import {
  buildTimeline,
  getBarGeometry,
  today,
  type TimelineDatedItem,
} from "@/components/planning/timeline-geometry";
import type {
  ApiForecastSnapshotDetail,
  ApiProjectBaseline,
  ApiTask,
} from "@/lib/api/client";
import {
  buildDeliveryTimelineRows,
  buildDeliveryTimelineSummary,
  type DeliveryPresentationStatus,
  type DeliveryTimelineRow,
} from "./delivery-timeline-model";

type DeliveryTimelineProps = {
  activeBaseline?: ApiProjectBaseline | null;
  currentForecast?: ApiForecastSnapshotDetail | null;
  isLoadingReferences?: boolean;
  tasks: ApiTask[];
};

const headerHeight = 42;
const rowHeight = 58;
const labelWidth = 260;

/** Read-only execution view. Scheduling and dependency changes remain in Planning. */
export function DeliveryTimeline({
  activeBaseline = null,
  currentForecast = null,
  isLoadingReferences = false,
  tasks,
}: DeliveryTimelineProps) {
  const todayDate = today();
  const rows = useMemo(
    () =>
      buildDeliveryTimelineRows({
        activeBaseline,
        currentForecast,
        tasks,
        todayDate,
      }),
    [activeBaseline, currentForecast, tasks, todayDate],
  );
  const summary = useMemo(
    () => buildDeliveryTimelineSummary(rows, currentForecast),
    [currentForecast, rows],
  );
  const timelineItems = useMemo(() => buildTimelineItems(rows), [rows]);
  const timeline = useMemo(
    () => buildTimeline(timelineItems, "week", null, todayDate),
    [timelineItems, todayDate],
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedRow =
    rows.find((row) => row.task.id === selectedTaskId) ?? null;

  if (rows.length === 0) {
    return (
      <EmptyState
        description="No executable tasks or milestones are available for the timeline."
        title="No timeline items"
      />
    );
  }

  const totalHeight = headerHeight + rows.length * rowHeight;

  return (
    <WorkspaceSection surface="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Execution timeline
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Target, actual progress, official forecast, and active baseline.
            Scheduling changes belong in Planning.
          </p>
        </div>
        {isLoadingReferences ? (
          <span
            aria-live="polite"
            className="text-xs font-medium text-slate-500"
          >
            Loading forecast and baseline…
          </span>
        ) : null}
      </div>

      <dl
        aria-label="Project delivery summary"
        className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4"
      >
        <SummaryMetric
          label="Overall completion"
          value={`${summary.completionPercent}%`}
        />
        <SummaryMetric
          label="Target finish"
          value={formatDisplayDate(summary.targetFinish)}
        />
        <SummaryMetric
          label="Current forecast"
          value={formatDisplayDate(summary.currentForecastFinish)}
        />
        <SummaryMetric
          label="Variance"
          tone={varianceTone(summary.varianceDays)}
          value={formatVariance(summary.varianceDays)}
        />
      </dl>

      <div
        aria-label="Timeline legend"
        className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-600"
      >
        <LegendItem className="border-slate-500 bg-slate-200" label="Target" />
        <LegendItem className="border-teal-700 bg-teal-600" label="Actual" />
        <LegendItem className="border-sky-700 bg-sky-100" label="Current forecast" />
        <LegendItem
          className="border-dashed border-amber-700 bg-amber-50"
          label="Active baseline"
        />
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-l-2 border-dashed border-red-500" />
          Today
        </span>
      </div>

      <div
        aria-label="Execution timeline chart"
        className="mt-3 max-w-full overflow-x-auto rounded-md border border-slate-200 bg-white"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${labelWidth}px ${timeline.width}px`,
            minWidth: labelWidth + timeline.width,
          }}
        >
          <div
            className="sticky left-0 z-10 border-r border-slate-200 bg-white shadow-[4px_0_8px_-8px_rgba(15,23,42,0.5)]"
            style={{ height: totalHeight }}
          >
            <div className="flex h-[42px] items-center border-b border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Delivery item
            </div>
            {rows.map((row) => {
              const descriptionId = `delivery-timeline-detail-${row.task.id}`;
              const detailText = buildDetailText(row);
              return (
                <div
                  className="flex items-center justify-between gap-2 border-b border-slate-100 px-3"
                  key={row.task.id}
                  style={{ height: rowHeight }}
                >
                  <div className="min-w-0">
                    <button
                      aria-describedby={descriptionId}
                      aria-expanded={selectedTaskId === row.task.id}
                      className="block max-w-full truncate text-left text-xs font-semibold text-slate-900 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      onClick={() =>
                        setSelectedTaskId((current) =>
                          current === row.task.id ? null : row.task.id,
                        )
                      }
                      title={detailText}
                      type="button"
                    >
                      {row.task.title}
                    </button>
                    <span className="mt-1 flex items-center gap-2">
                      <StatusBadge
                        size="sm"
                        tone={statusTone(row.presentationStatus)}
                      >
                        {row.presentationStatus}
                      </StatusBadge>
                      <span className="text-[10px] font-semibold tabular-nums text-slate-500">
                        {row.progress}%
                      </span>
                      {row.varianceDays !== null ? (
                        <span
                          className={`text-[10px] font-semibold tabular-nums ${varianceTextClass(row.varianceDays)}`}
                        >
                          {formatVariance(row.varianceDays)}
                        </span>
                      ) : null}
                    </span>
                    <span className="sr-only" id={descriptionId}>
                      {detailText}
                    </span>
                  </div>
                  {row.task.taskKind === "milestone" ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Milestone
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <svg
            aria-label="Read-only execution timeline"
            className="block"
            height={totalHeight}
            role="img"
            width={timeline.width}
          >
            <rect fill="#f8fafc" height={headerHeight} width={timeline.width} />
            {timeline.ticks.map((tick) => (
              <g key={tick.date}>
                <line
                  stroke="#e2e8f0"
                  x1={tick.x}
                  x2={tick.x}
                  y1={0}
                  y2={totalHeight}
                />
                <text fill="#64748b" fontSize="11" x={tick.x + 6} y={25}>
                  {tick.label}
                </text>
              </g>
            ))}
            {rows.map((row, index) => (
              <TimelineRow
                key={row.task.id}
                row={row}
                timeline={timeline}
                y={headerHeight + index * rowHeight}
              />
            ))}
            {timeline.todayX !== null ? (
              <g data-testid="today-marker">
                <line
                  aria-label={`Today ${formatDisplayDate(todayDate)}`}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  x1={timeline.todayX}
                  x2={timeline.todayX}
                  y1={headerHeight}
                  y2={totalHeight}
                />
                <text
                  fill="#b91c1c"
                  fontSize="10"
                  fontWeight="600"
                  x={timeline.todayX + 4}
                  y={headerHeight + 11}
                >
                  Today
                </text>
              </g>
            ) : null}
          </svg>
        </div>
      </div>

      {selectedRow ? (
        <TimelineDetail row={selectedRow} />
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          Select a delivery item for authoritative date details.
        </p>
      )}
    </WorkspaceSection>
  );
}

function TimelineRow({
  row,
  timeline,
  y,
}: {
  row: DeliveryTimelineRow;
  timeline: ReturnType<typeof buildTimeline>;
  y: number;
}) {
  const centerY = y + rowHeight / 2;
  const taskKind = row.task.taskKind ?? "standard";
  const isMilestone = taskKind === "milestone";
  const target = geometryForDates(row.targetStart, row.targetFinish, taskKind, timeline);
  const actual = geometryForDates(row.actualStart, row.actualFinish, taskKind, timeline);
  const actualStartPoint = pointForDate(row.actualStart, timeline);
  const actualFinishPoint = pointForDate(row.actualFinish, timeline);
  const forecast = geometryForDates(
    row.forecastStart,
    row.forecastFinish,
    taskKind,
    timeline,
  );
  const baseline = geometryForDates(
    row.baselineStart,
    row.baselineFinish,
    taskKind,
    timeline,
  );
  const forecastDiffers =
    row.forecastStart !== row.targetStart || row.forecastFinish !== row.targetFinish;

  return (
    <g
      aria-label={buildDetailText(row)}
      data-task-id={row.task.id}
      data-task-kind={taskKind}
      data-testid={`delivery-timeline-row-${row.task.id}`}
    >
      <line stroke="#f1f5f9" x1={0} x2={timeline.width} y1={y} y2={y} />

      {baseline ? (
        isMilestone ? (
          <Diamond
            dataTestId={`baseline-marker-${row.task.id}`}
            fill="#fffbeb"
            size={8}
            stroke="#c2410c"
            strokeDasharray="3 2"
            x={baseline.x + 8}
            y={centerY + 15}
          />
        ) : (
          <rect
            data-testid={`baseline-bar-${row.task.id}`}
            fill="#fffbeb"
            height={4}
            rx={2}
            stroke="#c2410c"
            strokeDasharray="4 2"
            width={baseline.width}
            x={baseline.x}
            y={centerY + 13}
          />
        )
      ) : null}

      {target ? (
        isMilestone ? (
          <Diamond
            dataTestId={`target-milestone-${row.task.id}`}
            fill="#cbd5e1"
            size={12}
            stroke="#475569"
            x={target.x + 8}
            y={centerY}
          />
        ) : (
          <rect
            data-finish-date={row.targetFinish ?? undefined}
            data-start-date={row.targetStart ?? undefined}
            data-testid={`target-bar-${row.task.id}`}
            fill="#e2e8f0"
            height={10}
            rx={3}
            stroke="#64748b"
            width={target.width}
            x={target.x}
            y={centerY - 5}
          />
        )
      ) : null}

      {forecast && forecastDiffers ? (
        isMilestone ? (
          <Diamond
            dataTestId={`forecast-marker-${row.task.id}`}
            fill="#e0f2fe"
            size={9}
            stroke="#0369a1"
            x={forecast.x + 8}
            y={centerY - 14}
          />
        ) : (
          <rect
            data-finish-date={row.forecastFinish ?? undefined}
            data-start-date={row.forecastStart ?? undefined}
            data-testid={`forecast-bar-${row.task.id}`}
            fill="#e0f2fe"
            height={5}
            rx={2}
            stroke="#0369a1"
            width={forecast.width}
            x={forecast.x}
            y={centerY - 16}
          />
        )
      ) : null}

      {!isMilestone && row.actualStart ? (
        <rect
          data-actual-finish={row.actualFinish ?? undefined}
          data-actual-start={row.actualStart}
          data-testid={`actual-progress-${row.task.id}`}
          fill="#0f766e"
          height={10}
          rx={3}
          width={getActualWidth({ actual, progress: row.progress, target })}
          x={actual?.x ?? actualStartPoint ?? 0}
          y={centerY - 5}
        />
      ) : null}

      {isMilestone && (row.actualFinish ?? row.actualStart) ? (
        <Diamond
          dataTestId={`actual-milestone-${row.task.id}`}
          fill="#0f766e"
          size={10}
          stroke="#115e59"
          x={pointForDate(row.actualFinish ?? row.actualStart, timeline) ?? 0}
          y={centerY}
        />
      ) : null}

      {!isMilestone && actualFinishPoint !== null ? (
        <line
          data-testid={`actual-finish-${row.task.id}`}
          stroke="#115e59"
          strokeWidth={2}
          x1={actualFinishPoint}
          x2={actualFinishPoint}
          y1={centerY - 8}
          y2={centerY + 8}
        />
      ) : null}
    </g>
  );
}

function TimelineDetail({ row }: { row: DeliveryTimelineRow }) {
  const fields = [
    dateDetail("Target start", row.targetStart),
    dateDetail("Target finish", row.targetFinish),
    dateDetail("Actual start", row.actualStart),
    dateDetail("Actual finish", row.actualFinish),
    ["Completion", `${row.progress}%`],
    dateDetail("Forecast start", row.forecastStart),
    dateDetail("Forecast finish", row.forecastFinish),
    row.varianceDays !== null
      ? ([
          "Variance",
          `${formatVariance(row.varianceDays)} (${row.varianceSource})`,
        ] as [string, string])
      : null,
    ["Status", row.presentationStatus],
    dateDetail("Baseline start", row.baselineStart),
    dateDetail("Baseline finish", row.baselineFinish),
  ].filter((field): field is [string, string] => field !== null);
  return (
    <section
      aria-label={`Timeline details for ${row.task.title}`}
      className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <h3 className="text-xs font-semibold text-slate-950">{row.task.title}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="font-medium text-slate-500">{label}</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function dateDetail(label: string, value: string | null): [string, string] | null {
  return value ? [label, formatDisplayDate(value)] : null;
}

function SummaryMetric({
  label,
  tone = "text-slate-950",
  value,
}: {
  label: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className="bg-white px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-sm font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`h-2 w-7 rounded-sm border ${className}`} />
      {label}
    </span>
  );
}

function Diamond({
  dataTestId,
  fill,
  size,
  stroke,
  strokeDasharray,
  x,
  y,
}: {
  dataTestId: string;
  fill: string;
  size: number;
  stroke: string;
  strokeDasharray?: string;
  x: number;
  y: number;
}) {
  return (
    <rect
      data-testid={dataTestId}
      fill={fill}
      height={size}
      stroke={stroke}
      strokeDasharray={strokeDasharray}
      strokeWidth={1.5}
      transform={`rotate(45 ${x} ${y})`}
      width={size}
      x={x - size / 2}
      y={y - size / 2}
    />
  );
}

function buildTimelineItems(rows: DeliveryTimelineRow[]): TimelineDatedItem[] {
  return rows.flatMap((row) => {
    const taskKind = row.task.taskKind ?? "standard";
    return [
      normalizeItem(row.targetStart, row.targetFinish, taskKind),
      normalizeItem(row.actualStart, row.actualFinish, taskKind),
      normalizeItem(row.forecastStart, row.forecastFinish, taskKind),
      normalizeItem(row.baselineStart, row.baselineFinish, taskKind),
    ].filter((item): item is TimelineDatedItem => Boolean(item));
  });
}

function normalizeItem(
  startDate: string | null,
  finishDate: string | null,
  taskKind: TimelineDatedItem["taskKind"],
): TimelineDatedItem | null {
  if (!startDate && !finishDate) return null;
  if (taskKind === "milestone" || !startDate || !finishDate) {
    const point = startDate ?? finishDate;
    return point ? { finishDate: point, startDate: point, taskKind } : null;
  }
  return { finishDate, startDate, taskKind };
}

function geometryForDates(
  startDate: string | null,
  finishDate: string | null,
  taskKind: TimelineDatedItem["taskKind"],
  timeline: ReturnType<typeof buildTimeline>,
) {
  const item = normalizeItem(startDate, finishDate, taskKind);
  return item ? getBarGeometry(item, timeline) : null;
}

function pointForDate(
  value: string | null,
  timeline: ReturnType<typeof buildTimeline>,
) {
  if (!value) return null;
  return (
    getBarGeometry(
      { finishDate: value, startDate: value, taskKind: "milestone" },
      timeline,
    )?.x ?? null
  );
}

function getActualWidth({
  actual,
  progress,
  target,
}: {
  actual: ReturnType<typeof getBarGeometry>;
  progress: number;
  target: ReturnType<typeof getBarGeometry>;
}) {
  if (actual) return Math.max(3, actual.width * (progress / 100 || 1));
  if (target) return Math.max(3, target.width * (progress / 100));
  return Math.max(3, progress * 0.4);
}

function buildDetailText(row: DeliveryTimelineRow) {
  return [
    row.task.title,
    `Target ${formatRange(row.targetStart, row.targetFinish)}`,
    row.actualStart || row.actualFinish
      ? `Actual ${formatRange(row.actualStart, row.actualFinish)}`
      : null,
    `${row.progress}% complete`,
    row.forecastStart || row.forecastFinish
      ? `Forecast ${formatRange(row.forecastStart, row.forecastFinish)}`
      : null,
    row.baselineStart || row.baselineFinish
      ? `Baseline ${formatRange(row.baselineStart, row.baselineFinish)}`
      : null,
    row.varianceDays !== null
      ? `${row.varianceSource} variance ${formatVariance(row.varianceDays)}`
      : null,
    row.presentationStatus,
  ]
    .filter(Boolean)
    .join(". ");
}

function formatRange(start: string | null, finish: string | null) {
  if (start && finish && start !== finish) {
    return `${formatDisplayDate(start)} to ${formatDisplayDate(finish)}`;
  }
  return formatDisplayDate(start ?? finish);
}

function formatDisplayDate(value: string | null) {
  if (!value) return "Not available";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function formatVariance(value: number | null) {
  if (value === null) return "Not available";
  if (value === 0) return "On plan";
  return `${value > 0 ? "+" : ""}${value} ${Math.abs(value) === 1 ? "day" : "days"}`;
}

function varianceTone(value: number | null) {
  if (value === null) return "text-slate-500";
  if (value <= 0) return "text-emerald-700";
  if (value <= 5) return "text-amber-700";
  return "text-red-700";
}

function varianceTextClass(value: number) {
  if (value <= 0) return "text-emerald-700";
  if (value <= 5) return "text-amber-700";
  return "text-red-700";
}

function statusTone(status: DeliveryPresentationStatus) {
  if (status === "Complete") return "success" as const;
  if (status === "Late") return "critical" as const;
  if (status === "At risk") return "warning" as const;
  if (status === "In progress") return "warning" as const;
  return "neutral" as const;
}
