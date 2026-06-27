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
type EditableField =
  | "durationDays"
  | "ownerId"
  | "percentComplete"
  | "plannedFinishDate"
  | "plannedStartDate"
  | "status"
  | "taskTitle";

type EditingCell = {
  field: EditableField;
  taskId: string;
  value: string;
};

type PlanningWorkspaceProps = {
  isSaving?: boolean;
  onCreateDependency: (input: {
    dependencyType: "FS" | "SS" | "FF";
    predecessorTaskId: string;
    successorTaskId: string;
  }) => Promise<void>;
  onCreateTask: (input: {
    parentTaskId?: string | null;
  }) => Promise<ApiPlanningTaskSchedule>;
  onDeleteDependency: (dependencyId: string) => Promise<void>;
  onUpdateSchedule: (
    taskId: string,
    input: {
      durationDays?: number | null;
      ownerId?: string | null;
      percentComplete?: number;
      plannedFinishDate?: string | null;
      plannedStartDate?: string | null;
      status?: NonNullable<ApiPlanningTaskSchedule["status"]>;
      taskTitle?: string;
    },
  ) => Promise<ApiPlanningTaskSchedule>;
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
const planningGridTemplate =
  "70px minmax(260px,320px) 160px 120px 120px 90px 100px 120px";
const planningGridWidth = 1100;
const headerHeight = 44;
const resourceHeight = 18;
const barHeight = 16;
const editableFields: EditableField[] = [
  "taskTitle",
  "ownerId",
  "plannedStartDate",
  "plannedFinishDate",
  "durationDays",
  "percentComplete",
  "status",
];
const statusOptions: NonNullable<ApiPlanningTaskSchedule["status"]>[] = [
  "backlog",
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export function PlanningWorkspace({
  isSaving = false,
  onCreateDependency,
  onCreateTask,
  onDeleteDependency,
  onUpdateSchedule,
  workspace,
}: PlanningWorkspaceProps) {
  const [zoom, setZoom] = useState<ZoomMode>("week");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskFocusId, setNewTaskFocusId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [dependencyDraft, setDependencyDraft] = useState({
    dependencyType: "FS" as "FS" | "SS" | "FF",
    predecessorTaskId: "",
    successorTaskId: "",
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const taskNameRefs = useRef(new Map<string, HTMLSpanElement>());

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
  const selectedSchedule = useMemo(
    () =>
      selectedTaskId
        ? rows.find((row) => row.schedule.taskId === selectedTaskId)?.schedule
        : null,
    [rows, selectedTaskId],
  );
  const ownerOptions = useMemo(() => buildOwnerOptions(workspace), [workspace]);

  useEffect(() => {
    setDependencyDraft((currentDraft) => ({
      dependencyType: currentDraft.dependencyType,
      predecessorTaskId:
        currentDraft.predecessorTaskId || leafRows[0]?.schedule.taskId || "",
      successorTaskId:
        currentDraft.successorTaskId || leafRows[1]?.schedule.taskId || "",
    }));
  }, [leafRows]);

  useEffect(() => {
    if (!newTaskFocusId) {
      return;
    }
    const taskName = taskNameRefs.current.get(newTaskFocusId);
    if (!taskName) {
      return;
    }
    taskName.focus();
    setNewTaskFocusId(null);
  }, [newTaskFocusId, workspace.schedules]);

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

  async function createTask(parentTaskId?: string | null) {
    const schedule = await onCreateTask({ parentTaskId });
    setSelectedTaskId(schedule.taskId);
    setNewTaskFocusId(schedule.taskId);
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    taskId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    setSelectedTaskId(taskId);
  }

  function startEditing(
    schedule: ApiPlanningTaskSchedule,
    field: EditableField,
  ) {
    setSelectedTaskId(schedule.taskId);
    setEditError(null);
    setEditingCell({
      field,
      taskId: schedule.taskId,
      value: getEditableValue(schedule, field),
    });
  }

  async function commitEdit(moveDirection: 0 | 1 = 0) {
    if (!editingCell) {
      return;
    }
    const schedule = workspace.schedules.find(
      (candidate) => candidate.taskId === editingCell.taskId,
    );
    if (!schedule) {
      setEditingCell(null);
      return;
    }
    const validation = validateEdit(schedule, editingCell);
    if (validation) {
      setEditError(validation);
      return;
    }
    const input = buildEditPayload(editingCell);
    const hasChanges = Object.keys(input).length > 0;
    const currentTaskId = editingCell.taskId;
    const currentField = editingCell.field;
    setEditingCell(null);
    setEditError(null);
    if (hasChanges) {
      await onUpdateSchedule(currentTaskId, input);
    }
    if (moveDirection > 0) {
      moveToNextEditableCell(currentTaskId, currentField);
    }
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditError(null);
  }

  function moveToNextEditableCell(taskId: string, field: EditableField) {
    const rowIndex = rows.findIndex((row) => row.schedule.taskId === taskId);
    const fieldIndex = editableFields.indexOf(field);
    if (rowIndex < 0 || fieldIndex < 0) {
      return;
    }
    const nextField = editableFields[(fieldIndex + 1) % editableFields.length];
    const nextRow =
      fieldIndex === editableFields.length - 1
        ? rows[Math.min(rowIndex + 1, rows.length - 1)]
        : rows[rowIndex];
    window.setTimeout(() => startEditing(nextRow.schedule, nextField), 0);
  }

  function handleEditKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEdit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      void commitEdit(1);
    }
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
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            disabled={isSaving}
            onClick={() => createTask(selectedSchedule?.parentTaskId ?? null)}
            type="button"
          >
            Add Task
          </button>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            disabled={isSaving || !selectedSchedule}
            onClick={() => createTask(selectedSchedule?.taskId ?? null)}
            type="button"
          >
            Add Child
          </button>
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

      <section className="grid min-h-[560px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft xl:grid-cols-[minmax(560px,45%)_minmax(0,1fr)]">
        <div className="overflow-auto border-r border-slate-200">
          <div
            className="grid h-11 min-w-[1100px] items-center border-b border-slate-300 bg-slate-50 text-xs font-bold uppercase text-slate-600"
            style={{
              gridTemplateColumns: planningGridTemplate,
              width: planningGridWidth,
            }}
          >
            <span className="h-full border-r border-slate-200 px-3 py-3">
              WBS
            </span>
            <span className="h-full border-r border-slate-200 px-4 py-3">
              Name
            </span>
            <span className="h-full border-r border-slate-200 px-4 py-3">
              Owner
            </span>
            <span className="h-full border-r border-slate-200 px-3 py-3">
              Start
            </span>
            <span className="h-full border-r border-slate-200 px-3 py-3">
              Finish
            </span>
            <span className="h-full border-r border-slate-200 px-3 py-3 text-right">
              Duration
            </span>
            <span className="h-full px-3 py-3 text-right">% Complete</span>
            <span className="h-full border-l border-slate-200 px-3 py-3">
              Status
            </span>
          </div>
          {rows.map(({ depth, schedule, wbs }) => {
            const children = workspace.schedules.some(
              (candidate) => candidate.parentTaskId === schedule.taskId,
            );
            const title = getTaskTitle(schedule);
            return (
              <div
                aria-selected={selectedTaskId === schedule.taskId}
                className={`grid h-[46px] min-w-[1100px] items-center border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50 ${
                  selectedTaskId === schedule.taskId
                    ? "bg-brand/10 ring-1 ring-inset ring-brand/40"
                    : ""
                }`}
                key={schedule.taskId}
                onClick={() => setSelectedTaskId(schedule.taskId)}
                onKeyDown={(event) => handleRowKeyDown(event, schedule.taskId)}
                role="row"
                style={{
                  gridTemplateColumns: planningGridTemplate,
                  width: planningGridWidth,
                }}
                tabIndex={0}
              >
                <span className="flex h-full items-center border-r border-slate-100 px-3 font-mono text-slate-500">
                  {wbs}
                </span>
                <div
                  className="flex h-full min-w-0 items-center gap-2 border-r border-slate-100 px-4"
                  style={{ paddingLeft: 16 + depth * 14 }}
                >
                  {children ? (
                    <button
                      aria-label={`${collapsedIds.has(schedule.taskId) ? "Expand" : "Collapse"} ${title}`}
                      className="text-slate-500"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCollapse(schedule.taskId);
                      }}
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
                  <span
                    className="truncate font-medium text-slate-950"
                    onDoubleClick={() => startEditing(schedule, "taskTitle")}
                    ref={(element) => {
                      if (element) {
                        taskNameRefs.current.set(schedule.taskId, element);
                      } else {
                        taskNameRefs.current.delete(schedule.taskId);
                      }
                    }}
                    tabIndex={-1}
                    title={title}
                  >
                    {isEditing(editingCell, schedule.taskId, "taskTitle") ? (
                      <InlineEditor
                        error={editError}
                        field="taskTitle"
                        onBlur={() => void commitEdit()}
                        onChange={(value) =>
                          setEditingCell((current) =>
                            current ? { ...current, value } : current,
                          )
                        }
                        onKeyDown={handleEditKeyDown}
                        ownerOptions={ownerOptions}
                        value={editingCell?.value ?? ""}
                      />
                    ) : (
                      title
                    )}
                  </span>
                </div>
                <EditableGridCell
                  align="left"
                  displayValue={formatOwner(schedule)}
                  editingCell={editingCell}
                  editError={editError}
                  field="ownerId"
                  onBlur={() => void commitEdit()}
                  onChange={(value) =>
                    setEditingCell((current) =>
                      current ? { ...current, value } : current,
                    )
                  }
                  onKeyDown={handleEditKeyDown}
                  onStartEdit={() => startEditing(schedule, "ownerId")}
                  ownerOptions={ownerOptions}
                  schedule={schedule}
                />
                <EditableGridCell
                  displayValue={formatShortDate(schedule.plannedStartDate)}
                  editingCell={editingCell}
                  editError={editError}
                  field="plannedStartDate"
                  onBlur={() => void commitEdit()}
                  onChange={(value) =>
                    setEditingCell((current) =>
                      current ? { ...current, value } : current,
                    )
                  }
                  onKeyDown={handleEditKeyDown}
                  onStartEdit={() => startEditing(schedule, "plannedStartDate")}
                  ownerOptions={ownerOptions}
                  schedule={schedule}
                />
                <EditableGridCell
                  displayValue={formatShortDate(schedule.plannedFinishDate)}
                  editingCell={editingCell}
                  editError={editError}
                  field="plannedFinishDate"
                  onBlur={() => void commitEdit()}
                  onChange={(value) =>
                    setEditingCell((current) =>
                      current ? { ...current, value } : current,
                    )
                  }
                  onKeyDown={handleEditKeyDown}
                  onStartEdit={() =>
                    startEditing(schedule, "plannedFinishDate")
                  }
                  ownerOptions={ownerOptions}
                  schedule={schedule}
                />
                <EditableGridCell
                  align="right"
                  displayValue={`${schedule.durationDays}d`}
                  editingCell={editingCell}
                  editError={editError}
                  field="durationDays"
                  onBlur={() => void commitEdit()}
                  onChange={(value) =>
                    setEditingCell((current) =>
                      current ? { ...current, value } : current,
                    )
                  }
                  onKeyDown={handleEditKeyDown}
                  onStartEdit={() => startEditing(schedule, "durationDays")}
                  ownerOptions={ownerOptions}
                  schedule={schedule}
                />
                <EditableGridCell
                  align="right"
                  displayValue={`${Number(schedule.percentComplete).toFixed(0)}%`}
                  editingCell={editingCell}
                  editError={editError}
                  field="percentComplete"
                  onBlur={() => void commitEdit()}
                  onChange={(value) =>
                    setEditingCell((current) =>
                      current ? { ...current, value } : current,
                    )
                  }
                  onKeyDown={handleEditKeyDown}
                  onStartEdit={() => startEditing(schedule, "percentComplete")}
                  ownerOptions={ownerOptions}
                  schedule={schedule}
                />
                <EditableGridCell
                  displayValue={formatStatus(schedule.status)}
                  editingCell={editingCell}
                  editError={editError}
                  field="status"
                  onBlur={() => void commitEdit()}
                  onChange={(value) =>
                    setEditingCell((current) =>
                      current ? { ...current, value } : current,
                    )
                  }
                  onKeyDown={handleEditKeyDown}
                  onStartEdit={() => startEditing(schedule, "status")}
                  ownerOptions={ownerOptions}
                  schedule={schedule}
                />
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
              const title = getTaskTitle(schedule);
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
                        aria-label={`Milestone ${title}`}
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
                          aria-label={`Move ${title}`}
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
                            aria-label={`Resize ${title}`}
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
                  {row.wbs} {getTaskTitle(row.schedule)}
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
                  {row.wbs} {getTaskTitle(row.schedule)}
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

type OwnerOption = {
  id: string;
  label: string;
};

function EditableGridCell({
  align = "left",
  displayValue,
  editingCell,
  editError,
  field,
  onBlur,
  onChange,
  onKeyDown,
  onStartEdit,
  ownerOptions,
  schedule,
}: {
  align?: "left" | "right";
  displayValue: string;
  editingCell: EditingCell | null;
  editError: string | null;
  field: EditableField;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onStartEdit: () => void;
  ownerOptions: OwnerOption[];
  schedule: ApiPlanningTaskSchedule;
}) {
  const editing = isEditing(editingCell, schedule.taskId, field);
  return (
    <span
      className={`flex h-full min-w-0 items-center border-r border-slate-100 px-3 ${
        align === "right" ? "justify-end text-right" : ""
      }`}
      onDoubleClick={onStartEdit}
      title={displayValue}
    >
      {editing ? (
        <InlineEditor
          error={editError}
          field={field}
          onBlur={onBlur}
          onChange={onChange}
          onKeyDown={onKeyDown}
          ownerOptions={ownerOptions}
          value={editingCell?.value ?? ""}
        />
      ) : (
        <span className="truncate">{displayValue}</span>
      )}
    </span>
  );
}

function InlineEditor({
  error,
  field,
  onBlur,
  onChange,
  onKeyDown,
  ownerOptions,
  value,
}: {
  error: string | null;
  field: EditableField;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  ownerOptions: OwnerOption[];
  value: string;
}) {
  const className = `w-full rounded-sm border px-2 py-1 text-xs text-slate-950 outline-none ${
    error ? "border-red-500 bg-red-50" : "border-brand bg-white"
  }`;
  const commonProps = {
    autoFocus: true,
    className,
    onBlur,
    onKeyDown,
  };

  if (field === "ownerId") {
    return (
      <select
        {...commonProps}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Unassigned</option>
        {ownerOptions.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.label}
          </option>
        ))}
      </select>
    );
  }

  if (field === "status") {
    return (
      <select
        {...commonProps}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {formatStatus(status)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className="relative w-full">
      <input
        {...commonProps}
        onChange={(event) => onChange(event.target.value)}
        type={
          field === "plannedStartDate" || field === "plannedFinishDate"
            ? "date"
            : field === "durationDays" || field === "percentComplete"
              ? "number"
              : "text"
        }
        value={value}
      />
      {error ? (
        <span className="absolute left-0 top-full z-10 mt-1 min-w-44 rounded-sm border border-red-200 bg-white px-2 py-1 text-left text-[11px] font-medium text-red-700 shadow-soft">
          {error}
        </span>
      ) : null}
    </span>
  );
}

function isEditing(
  editingCell: EditingCell | null,
  taskId: string,
  field: EditableField,
) {
  return editingCell?.taskId === taskId && editingCell.field === field;
}

function buildOwnerOptions(workspace: ApiPlanningWorkspace): OwnerOption[] {
  const owners = new Map<string, OwnerOption>();
  workspace.schedules.forEach((schedule) => {
    const assignee = schedule.task?.assignee;
    if (assignee?.id) {
      owners.set(assignee.id, {
        id: assignee.id,
        label:
          `${assignee.firstName} ${assignee.lastName}`.trim() ||
          assignee.email ||
          assignee.id,
      });
    }
  });
  workspace.resourceAllocations.forEach((allocation) => {
    const user = allocation.user;
    if (user?.id) {
      owners.set(user.id, {
        id: user.id,
        label:
          `${user.firstName} ${user.lastName}`.trim() || user.email || user.id,
      });
    }
  });
  return [...owners.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function getEditableValue(
  schedule: ApiPlanningTaskSchedule,
  field: EditableField,
) {
  if (field === "taskTitle") {
    return getTaskTitle(schedule);
  }
  if (field === "ownerId") {
    return schedule.ownerId ?? schedule.task?.assignee?.id ?? "";
  }
  if (field === "plannedStartDate") {
    return schedule.plannedStartDate ?? "";
  }
  if (field === "plannedFinishDate") {
    return schedule.plannedFinishDate ?? "";
  }
  if (field === "durationDays") {
    return String(schedule.durationDays ?? 0);
  }
  if (field === "percentComplete") {
    return String(Number(schedule.percentComplete ?? 0));
  }
  return schedule.status ?? schedule.task?.status ?? "todo";
}

function validateEdit(
  schedule: ApiPlanningTaskSchedule,
  editingCell: EditingCell,
) {
  const value = editingCell.value.trim();
  if (editingCell.field === "taskTitle" && !value) {
    return "Task name is required.";
  }
  if (
    editingCell.field === "plannedStartDate" ||
    editingCell.field === "plannedFinishDate"
  ) {
    if (value && Number.isNaN(parseDate(value).getTime())) {
      return "Enter a valid date.";
    }
    const plannedStartDate =
      editingCell.field === "plannedStartDate"
        ? value
        : schedule.plannedStartDate;
    const plannedFinishDate =
      editingCell.field === "plannedFinishDate"
        ? value
        : schedule.plannedFinishDate;
    if (
      plannedStartDate &&
      plannedFinishDate &&
      plannedFinishDate < plannedStartDate
    ) {
      return "Finish cannot be before start.";
    }
  }
  if (editingCell.field === "durationDays") {
    const duration = Number(value);
    if (!Number.isInteger(duration) || duration < 0) {
      return "Duration must be a whole number of days.";
    }
  }
  if (editingCell.field === "percentComplete") {
    const progress = Number(value);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return "Progress must be between 0 and 100.";
    }
  }
  return null;
}

function buildEditPayload(editingCell: EditingCell): Parameters<
  PlanningWorkspaceProps["onUpdateSchedule"]
>[1] {
  const value = editingCell.value.trim();
  if (editingCell.field === "taskTitle") {
    return { taskTitle: value };
  }
  if (editingCell.field === "ownerId") {
    return { ownerId: value || null };
  }
  if (editingCell.field === "plannedStartDate") {
    return { plannedStartDate: value || null };
  }
  if (editingCell.field === "plannedFinishDate") {
    return { plannedFinishDate: value || null };
  }
  if (editingCell.field === "durationDays") {
    return { durationDays: Number(value) };
  }
  if (editingCell.field === "percentComplete") {
    return { percentComplete: Number(value) };
  }
  return { status: value as NonNullable<ApiPlanningTaskSchedule["status"]> };
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
        getTaskTitle(left).localeCompare(getTaskTitle(right)),
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
  const sortedStarts = [...starts].sort();
  const sortedFinishes = [...finishes].sort();
  const min = addDays(parseDate(sortedStarts[0] ?? today()), -3);
  const max = addDays(
    parseDate(sortedFinishes[sortedFinishes.length - 1] ?? today()),
    21,
  );
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

function formatStatus(value?: string | null) {
  if (!value) {
    return "Not Started";
  }
  const labels: Record<string, string> = {
    backlog: "Not Started",
    blocked: "Blocked",
    done: "Done",
    in_progress: "In Progress",
    todo: "To Do",
  };
  return labels[value] ?? value;
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
    schedule.taskId
  );
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
  const schedule = schedules.find((candidate) => candidate.taskId === taskId);
  return schedule ? getTaskTitle(schedule) : taskId;
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
