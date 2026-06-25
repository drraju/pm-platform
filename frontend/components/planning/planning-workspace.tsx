"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiPlanningTaskSchedule,
  ApiPlanningWorkspace,
  ApiResourceAllocation,
  ApiTaskDependency,
} from "@/lib/api/client";

type ZoomMode = "day" | "week" | "month";
type DragMode = "move" | "resize-end";

type PlanningWorkspaceProps = {
  isSaving?: boolean;
  onCreateDependency: (input: {
    dependencyType: "FS" | "SS" | "FF";
    predecessorTaskId: string;
    successorTaskId: string;
  }) => Promise<void>;
  onDeleteDependency: (dependencyId: string) => Promise<void>;
  onUpdateSchedule: (
    taskId: string,
    input: {
      plannedFinishDate?: string | null;
      plannedStartDate?: string | null;
    },
  ) => Promise<void>;
  workspace: ApiPlanningWorkspace;
};

type VisibleRow = {
  depth: number;
  schedule: ApiPlanningTaskSchedule;
  wbs: string;
};

type DragState = {
  mode: DragMode;
  originX: number;
  schedule: ApiPlanningTaskSchedule;
};

const rowHeight = 46;
const treeWidth = 560;
const headerHeight = 44;
const resourceHeight = 18;
const barHeight = 16;

export function PlanningWorkspace({
  isSaving = false,
  onCreateDependency,
  onDeleteDependency,
  onUpdateSchedule,
  workspace,
}: PlanningWorkspaceProps) {
  const [zoom, setZoom] = useState<ZoomMode>("week");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [dependencyDraft, setDependencyDraft] = useState({
    dependencyType: "FS" as "FS" | "SS" | "FF",
    predecessorTaskId: "",
    successorTaskId: "",
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const rows = useMemo(
    () => buildVisibleRows(workspace.schedules, collapsedIds),
    [collapsedIds, workspace.schedules],
  );
  const leafRows = useMemo(
    () => rows.filter((row) => row.schedule.taskKind !== "summary"),
    [rows],
  );
  const timeline = useMemo(
    () => buildTimeline(workspace.schedules, zoom),
    [workspace.schedules, zoom],
  );
  const allocationsByTaskId = useMemo(
    () => groupAllocations(workspace.resourceAllocations),
    [workspace.resourceAllocations],
  );

  useEffect(() => {
    setDependencyDraft((currentDraft) => ({
      dependencyType: currentDraft.dependencyType,
      predecessorTaskId:
        currentDraft.predecessorTaskId || leafRows[0]?.schedule.taskId || "",
      successorTaskId:
        currentDraft.successorTaskId || leafRows[1]?.schedule.taskId || "",
    }));
  }, [leafRows]);

  const totalHeight = headerHeight + rows.length * rowHeight + 24;
  const totalWidth = timeline.width;

  function toggleCollapse(taskId: string) {
    setCollapsedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(taskId)) {
        nextIds.delete(taskId);
      } else {
        nextIds.add(taskId);
      }
      return nextIds;
    });
  }

  function startDrag(
    event: React.PointerEvent<SVGElement>,
    schedule: ApiPlanningTaskSchedule,
    mode: DragMode,
  ) {
    if (schedule.taskKind === "summary") {
      return;
    }
    if (schedule.taskKind === "milestone" && mode === "resize-end") {
      return;
    }
    const clientX = getPointerClientX(event);
    if (!Number.isFinite(clientX)) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ mode, originX: clientX, schedule });
  }

  async function finishDrag(event: React.PointerEvent<SVGElement>) {
    if (!dragState) {
      return;
    }
    const clientX = getPointerClientX(event);
    if (!Number.isFinite(clientX)) {
      setDragState(null);
      return;
    }
    const deltaUnits = Math.round(
      (clientX - dragState.originX) / timeline.unitWidth,
    );
    setDragState(null);
    if (deltaUnits === 0) {
      return;
    }
    const deltaDays = deltaUnits * timeline.daysPerUnit;
    const start = dragState.schedule.plannedStartDate;
    const finish = dragState.schedule.plannedFinishDate;
    if (!start || !finish) {
      return;
    }
    if (dragState.mode === "move") {
      await onUpdateSchedule(dragState.schedule.taskId, {
        plannedFinishDate: shiftDate(finish, deltaDays),
        plannedStartDate: shiftDate(start, deltaDays),
      });
      return;
    }
    await onUpdateSchedule(dragState.schedule.taskId, {
      plannedFinishDate: shiftDate(finish, deltaDays),
    });
  }

  async function submitDependency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreateDependency(dependencyDraft);
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            {workspace.project.name} planning workspace
          </h2>
          <p className="text-xs text-slate-500">
            Schedule v{workspace.snapshot.versionNumber} ·{" "}
            {workspace.snapshot.projectStartDate ?? "Unscheduled"} to{" "}
            {workspace.snapshot.projectFinishDate ?? "Unscheduled"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              aria-pressed={zoom === mode}
              className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                zoom === mode
                  ? "border-brand bg-brand text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
              key={mode}
              onClick={() => setZoom(mode)}
              type="button"
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="grid min-h-[560px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft xl:grid-cols-[560px_minmax(0,1fr)]">
        <div className="overflow-auto border-r border-slate-200">
          <div className="grid h-11 grid-cols-[68px_1fr_120px_92px_92px_76px_88px] items-center border-b border-slate-200 bg-slate-50 px-3 text-xs font-semibold uppercase text-slate-500">
            <span>WBS</span>
            <span>Name</span>
            <span>Owner</span>
            <span>Start</span>
            <span>Finish</span>
            <span>Duration</span>
            <span>% Complete</span>
          </div>
          {rows.map(({ depth, schedule, wbs }) => {
            const children = workspace.schedules.some(
              (candidate) => candidate.parentTaskId === schedule.taskId,
            );
            return (
              <div
                className="grid h-[46px] grid-cols-[68px_1fr_120px_92px_92px_76px_88px] items-center border-b border-slate-100 px-3 text-xs text-slate-700"
                key={schedule.taskId}
              >
                <span className="font-mono text-slate-500">{wbs}</span>
                <div
                  className="flex min-w-0 items-center gap-2"
                  style={{ paddingLeft: depth * 14 }}
                >
                  {children ? (
                    <button
                      aria-label={`${collapsedIds.has(schedule.taskId) ? "Expand" : "Collapse"} ${schedule.taskTitle}`}
                      className="text-slate-500"
                      onClick={() => toggleCollapse(schedule.taskId)}
                      type="button"
                    >
                      {collapsedIds.has(schedule.taskId) ? "►" : "▼"}
                    </button>
                  ) : (
                    <span className="w-3" />
                  )}
                  <span aria-hidden>
                    {schedule.taskKind === "summary"
                      ? "►"
                      : schedule.taskKind === "milestone"
                        ? "♦"
                        : "•"}
                  </span>
                  <span className="truncate font-medium text-slate-950">
                    {schedule.taskTitle}
                  </span>
                </div>
                <span className="truncate">{formatOwner(schedule)}</span>
                <span>{formatShortDate(schedule.plannedStartDate)}</span>
                <span>{formatShortDate(schedule.plannedFinishDate)}</span>
                <span>{schedule.durationDays}d</span>
                <span>{Number(schedule.percentComplete).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>

        <div className="overflow-auto">
          <svg
            aria-label="Interactive Gantt timeline"
            className="block"
            height={totalHeight}
            onPointerUp={finishDrag}
            ref={svgRef}
            role="img"
            width={totalWidth}
          >
            <rect
              fill="#f8fafc"
              height={headerHeight}
              width={totalWidth}
              x={0}
              y={0}
            />
            {timeline.ticks.map((tick) => (
              <g key={tick.date}>
                {tick.isWeekend ? (
                  <rect
                    fill="#f1f5f9"
                    height={totalHeight}
                    opacity={0.7}
                    width={timeline.unitWidth}
                    x={tick.x}
                    y={headerHeight}
                  />
                ) : null}
                <line
                  stroke="#e2e8f0"
                  x1={tick.x}
                  x2={tick.x}
                  y1={0}
                  y2={totalHeight}
                />
                <text fill="#64748b" fontSize="11" x={tick.x + 6} y={26}>
                  {tick.label}
                </text>
              </g>
            ))}
            {timeline.todayX !== null ? (
              <line
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                x1={timeline.todayX}
                x2={timeline.todayX}
                y1={headerHeight}
                y2={totalHeight}
              />
            ) : null}

            {rows.map(({ schedule }, index) => {
              const y = headerHeight + index * rowHeight + 12;
              const geometry = getBarGeometry(schedule, timeline);
              const isCritical =
                schedule.isCritical ||
                workspace.criticalPathTaskIds.includes(schedule.taskId);
              const allocations =
                allocationsByTaskId.get(schedule.taskId) ?? [];
              return (
                <g key={schedule.taskId}>
                  <line
                    stroke="#f1f5f9"
                    x1={0}
                    x2={totalWidth}
                    y1={headerHeight + (index + 1) * rowHeight}
                    y2={headerHeight + (index + 1) * rowHeight}
                  />
                  {geometry ? (
                    schedule.taskKind === "milestone" ? (
                      <rect
                        aria-label={`Milestone ${schedule.taskTitle}`}
                        fill={isCritical ? "#dc2626" : "#0f766e"}
                        height={16}
                        onPointerDown={(event) =>
                          startDrag(event, schedule, "move")
                        }
                        style={{ cursor: "grab" }}
                        transform={`rotate(45 ${geometry.x + 8} ${y + 8})`}
                        width={16}
                        x={geometry.x}
                        y={y}
                      />
                    ) : (
                      <g>
                        <rect
                          aria-label={`Move ${schedule.taskTitle}`}
                          fill={
                            schedule.taskKind === "summary"
                              ? "#94a3b8"
                              : isCritical
                                ? "#dc2626"
                                : "#0f766e"
                          }
                          height={barHeight}
                          opacity={schedule.taskKind === "summary" ? 0.75 : 1}
                          onPointerDown={(event) =>
                            startDrag(event, schedule, "move")
                          }
                          rx={3}
                          style={{
                            cursor:
                              schedule.taskKind === "summary"
                                ? "not-allowed"
                                : "grab",
                          }}
                          width={geometry.width}
                          x={geometry.x}
                          y={y}
                        />
                        <rect
                          fill="#ccfbf1"
                          height={barHeight}
                          opacity={0.75}
                          rx={3}
                          width={Math.max(
                            0,
                            geometry.width *
                              (Number(schedule.percentComplete) / 100),
                          )}
                          x={geometry.x}
                          y={y}
                        />
                        {schedule.taskKind !== "summary" ? (
                          <rect
                            aria-label={`Resize ${schedule.taskTitle}`}
                            fill="#0f172a"
                            height={barHeight}
                            onPointerDown={(event) =>
                              startDrag(event, schedule, "resize-end")
                            }
                            style={{ cursor: "ew-resize" }}
                            width={5}
                            x={geometry.x + geometry.width - 5}
                            y={y}
                          />
                        ) : null}
                      </g>
                    )
                  ) : null}
                  {allocations.map((allocation, allocationIndex) => {
                    const allocationY =
                      y + barHeight + 3 + allocationIndex * resourceHeight;
                    return (
                      <g key={allocation.id}>
                        <rect
                          fill={allocationColor(allocation.allocationPercent)}
                          height={12}
                          rx={2}
                          width={Math.max(
                            48,
                            Number(allocation.allocationPercent),
                          )}
                          x={geometry?.x ?? 0}
                          y={allocationY}
                        />
                        <text
                          fill="#0f172a"
                          fontSize="10"
                          x={(geometry?.x ?? 0) + 54}
                          y={allocationY + 10}
                        >
                          {formatAllocation(allocation)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {workspace.dependencies.map((dependency) => {
              const line = getDependencyLine(dependency, rows, timeline);
              return line ? (
                <path
                  d={line}
                  fill="none"
                  key={dependency.id}
                  markerEnd="url(#arrow)"
                  stroke="#475569"
                  strokeWidth={1.5}
                />
              ) : null;
            })}
            <defs>
              <marker
                id="arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#475569" />
              </marker>
            </defs>
          </svg>
        </div>
      </section>

      <section className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-soft lg:grid-cols-[1fr_1fr]">
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={submitDependency}>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Predecessor
            </span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              onChange={(event) =>
                setDependencyDraft((draft) => ({
                  ...draft,
                  predecessorTaskId: event.target.value,
                }))
              }
              value={dependencyDraft.predecessorTaskId}
            >
              {leafRows.map((row) => (
                <option key={row.schedule.taskId} value={row.schedule.taskId}>
                  {row.wbs} {row.schedule.taskTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Successor
            </span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              onChange={(event) =>
                setDependencyDraft((draft) => ({
                  ...draft,
                  successorTaskId: event.target.value,
                }))
              }
              value={dependencyDraft.successorTaskId}
            >
              {leafRows.map((row) => (
                <option key={row.schedule.taskId} value={row.schedule.taskId}>
                  {row.wbs} {row.schedule.taskTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Type
            </span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              onChange={(event) =>
                setDependencyDraft((draft) => ({
                  ...draft,
                  dependencyType: event.target.value as "FS" | "SS" | "FF",
                }))
              }
              value={dependencyDraft.dependencyType}
            >
              <option value="FS">Finish to Start</option>
              <option value="SS">Start to Start</option>
              <option value="FF">Finish to Finish</option>
            </select>
          </label>
          <button
            className="self-end rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={
              isSaving ||
              !dependencyDraft.predecessorTaskId ||
              !dependencyDraft.successorTaskId
            }
            type="submit"
          >
            Add dependency
          </button>
        </form>

        <div className="space-y-2">
          {workspace.dependencies.length === 0 ? (
            <p className="text-sm text-slate-500">No dependencies yet.</p>
          ) : (
            workspace.dependencies.map((dependency) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"
                key={dependency.id}
              >
                <span>
                  {taskName(dependency.predecessorTaskId, workspace.schedules)}{" "}
                  → {taskName(dependency.successorTaskId, workspace.schedules)}{" "}
                  · {dependency.dependencyType}
                </span>
                <button
                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                  disabled={isSaving}
                  onClick={() => onDeleteDependency(dependency.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function getPointerClientX(event: React.PointerEvent<SVGElement>) {
  const nativeClientX = (event.nativeEvent as PointerEvent | MouseEvent)
    .clientX;
  return Number.isFinite(event.clientX) ? event.clientX : nativeClientX;
}

function buildVisibleRows(
  schedules: ApiPlanningTaskSchedule[],
  collapsedIds: Set<string>,
) {
  const byParentId = new Map<string | null, ApiPlanningTaskSchedule[]>();
  schedules.forEach((schedule) => {
    const key = schedule.parentTaskId ?? null;
    byParentId.set(key, [...(byParentId.get(key) ?? []), schedule]);
  });
  byParentId.forEach((items) =>
    items.sort(
      (left, right) =>
        (left.sequenceNumber ?? 999_999) - (right.sequenceNumber ?? 999_999) ||
        left.taskTitle.localeCompare(right.taskTitle),
    ),
  );

  const rows: VisibleRow[] = [];
  const visit = (parentId: string | null, depth: number, prefix: number[]) => {
    (byParentId.get(parentId) ?? []).forEach((schedule, index) => {
      const wbsParts = [...prefix, index + 1];
      rows.push({ depth, schedule, wbs: wbsParts.join(".") });
      if (!collapsedIds.has(schedule.taskId)) {
        visit(schedule.taskId, depth + 1, wbsParts);
      }
    });
  };
  visit(null, 0, []);
  return rows;
}

function buildTimeline(schedules: ApiPlanningTaskSchedule[], zoom: ZoomMode) {
  const starts = schedules
    .map((schedule) => schedule.plannedStartDate)
    .filter((value): value is string => Boolean(value));
  const finishes = schedules
    .map((schedule) => schedule.plannedFinishDate)
    .filter((value): value is string => Boolean(value));
  const min = addDays(parseDate(starts.toSorted()[0] ?? today()), -3);
  const max = addDays(parseDate(finishes.toSorted().at(-1) ?? today()), 21);
  const daysPerUnit = zoom === "day" ? 1 : zoom === "week" ? 7 : 30;
  const unitWidth = zoom === "day" ? 34 : zoom === "week" ? 58 : 86;
  const totalDays = Math.max(1, diffDays(formatDate(min), formatDate(max)));
  const units = Math.ceil(totalDays / daysPerUnit);
  const ticks = Array.from({ length: units + 1 }).map((_, index) => {
    const date = addDays(min, index * daysPerUnit);
    return {
      date: formatDate(date),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      label:
        zoom === "month"
          ? date.toLocaleDateString("en", { month: "short", timeZone: "UTC" })
          : date.toLocaleDateString("en", {
              day: "2-digit",
              month: "short",
              timeZone: "UTC",
            }),
      x: index * unitWidth,
    };
  });
  const todayOffset = diffDays(formatDate(min), today());
  return {
    daysPerUnit,
    startDate: formatDate(min),
    ticks,
    todayX:
      todayOffset >= 0 && todayOffset <= totalDays
        ? (todayOffset / daysPerUnit) * unitWidth
        : null,
    unitWidth,
    width: Math.max(900, (units + 1) * unitWidth),
  };
}

function getBarGeometry(
  schedule: ApiPlanningTaskSchedule,
  timeline: ReturnType<typeof buildTimeline>,
) {
  if (!schedule.plannedStartDate || !schedule.plannedFinishDate) {
    return null;
  }
  const startOffset = diffDays(timeline.startDate, schedule.plannedStartDate);
  const duration = Math.max(
    0,
    diffDays(schedule.plannedStartDate, schedule.plannedFinishDate),
  );
  return {
    width: Math.max(
      schedule.taskKind === "milestone" ? 16 : 20,
      ((duration || 1) / timeline.daysPerUnit) * timeline.unitWidth,
    ),
    x: (startOffset / timeline.daysPerUnit) * timeline.unitWidth,
  };
}

function getDependencyLine(
  dependency: ApiTaskDependency,
  rows: VisibleRow[],
  timeline: ReturnType<typeof buildTimeline>,
) {
  const predecessorIndex = rows.findIndex(
    (row) => row.schedule.taskId === dependency.predecessorTaskId,
  );
  const successorIndex = rows.findIndex(
    (row) => row.schedule.taskId === dependency.successorTaskId,
  );
  if (predecessorIndex < 0 || successorIndex < 0) {
    return null;
  }
  const predecessor = rows[predecessorIndex].schedule;
  const successor = rows[successorIndex].schedule;
  const predecessorGeometry = getBarGeometry(predecessor, timeline);
  const successorGeometry = getBarGeometry(successor, timeline);
  if (!predecessorGeometry || !successorGeometry) {
    return null;
  }
  const sourceX =
    dependency.dependencyType === "SS"
      ? predecessorGeometry.x
      : predecessorGeometry.x + predecessorGeometry.width;
  const targetX =
    dependency.dependencyType === "FF"
      ? successorGeometry.x + successorGeometry.width
      : successorGeometry.x;
  const sourceY = headerHeight + predecessorIndex * rowHeight + 20;
  const targetY = headerHeight + successorIndex * rowHeight + 20;
  const midX = sourceX + (targetX - sourceX) / 2;
  return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
}

function groupAllocations(allocations: ApiResourceAllocation[]) {
  const grouped = new Map<string, ApiResourceAllocation[]>();
  allocations.forEach((allocation) => {
    grouped.set(allocation.taskId, [
      ...(grouped.get(allocation.taskId) ?? []),
      allocation,
    ]);
  });
  return grouped;
}

function formatOwner(schedule: ApiPlanningTaskSchedule) {
  const assignee = schedule.task?.assignee;
  if (!assignee) {
    return "Unassigned";
  }
  return `${assignee.firstName} ${assignee.lastName}`.trim() || assignee.email;
}

function formatAllocation(allocation: ApiResourceAllocation) {
  const user = allocation.user;
  const name = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "Resource";
  return `${name} ${Number(allocation.allocationPercent).toFixed(0)}%`;
}

function allocationColor(percent: number) {
  if (percent > 100) {
    return "#ef4444";
  }
  if (percent > 90) {
    return "#f59e0b";
  }
  return "#22c55e";
}

function taskName(taskId: string, schedules: ApiPlanningTaskSchedule[]) {
  return (
    schedules.find((schedule) => schedule.taskId === taskId)?.taskTitle ??
    taskId
  );
}

function formatShortDate(value?: string | null) {
  return value ? value.slice(5, 10) : "TBD";
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function today() {
  return formatDate(new Date());
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function shiftDate(value: string, days: number) {
  return formatDate(addDays(parseDate(value), days));
}

function diffDays(start: string, finish: string) {
  return Math.round(
    (parseDate(finish).getTime() - parseDate(start).getTime()) / 86_400_000,
  );
}
