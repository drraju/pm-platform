"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  ApiPlanningTaskSchedule,
  ApiPlanningWorkspace,
  ApiProjectMember,
  ApiResourceAllocation,
  ApiTaskDependency,
} from "@/lib/api/client";

type ZoomMode = "day" | "week" | "month" | "quarter";
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
      parentTaskId?: string | null;
      percentComplete?: number;
      plannedFinishDate?: string | null;
      plannedStartDate?: string | null;
      sequenceNumber?: number | null;
      status?: NonNullable<ApiPlanningTaskSchedule["status"]>;
      taskTitle?: string;
    },
  ) => Promise<ApiPlanningTaskSchedule>;
  projectMembers?: ApiProjectMember[];
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

type RowDragState = {
  parentTaskId: string | null;
  taskId: string;
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
const zoomModes: ZoomMode[] = ["day", "week", "month", "quarter"];
const zoomLabels: Record<ZoomMode, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
};
const toolbarButtonClassName =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export function PlanningWorkspace({
  isSaving = false,
  onCreateDependency,
  onCreateTask,
  onDeleteDependency,
  onUpdateSchedule,
  projectMembers = [],
  workspace,
}: PlanningWorkspaceProps) {
  const [zoom, setZoom] = useState<ZoomMode>("week");
  const [localSchedules, setLocalSchedules] = useState(workspace.schedules);
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
  const [rowDragState, setRowDragState] = useState<RowDragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ganttScrollRef = useRef<HTMLDivElement | null>(null);
  const dependencySectionRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const taskNameRefs = useRef(new Map<string, HTMLSpanElement>());

  useEffect(() => {
    setLocalSchedules(workspace.schedules);
  }, [workspace.schedules]);

  const rows = useMemo(
    () => buildVisibleRows(localSchedules, collapsedIds),
    [collapsedIds, localSchedules],
  );
  const summaryTaskIds = useMemo(
    () => getSummaryTaskIds(localSchedules),
    [localSchedules],
  );
  const leafRows = useMemo(
    () => rows.filter((row) => !summaryTaskIds.has(row.schedule.taskId)),
    [rows, summaryTaskIds],
  );
  const timeline = useMemo(
    () => buildTimeline(localSchedules, zoom),
    [localSchedules, zoom],
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
  const ownerOptions = useMemo(
    () => buildOwnerOptions(workspace, projectMembers),
    [projectMembers, workspace],
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

  useLayoutEffect(() => {
    if (!newTaskFocusId) {
      return;
    }
    const taskName = taskNameRefs.current.get(newTaskFocusId);
    if (!taskName) {
      return;
    }
    taskName.focus();
    rowRefs.current.get(newTaskFocusId)?.scrollIntoView?.({
      block: "nearest",
    });
    setNewTaskFocusId(null);
  }, [newTaskFocusId, localSchedules]);

  const totalHeight = headerHeight + rows.length * rowHeight + 24;
  const totalWidth = timeline.width;
  const canZoomIn = zoom !== zoomModes[0];
  const canZoomOut = zoom !== zoomModes[zoomModes.length - 1];
  const milestoneCount = useMemo(
    () =>
      localSchedules.filter((schedule) => schedule.taskKind === "milestone")
        .length,
    [localSchedules],
  );
  const hasSummaryTasks = summaryTaskIds.size > 0;

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

  function expandAll() {
    setCollapsedIds(new Set());
  }

  function collapseAll() {
    setCollapsedIds(new Set(summaryTaskIds));
  }

  async function createTask(parentTaskId?: string | null) {
    const schedule = await onCreateTask({ parentTaskId });
    setLocalSchedules((currentSchedules) =>
      currentSchedules.some(
        (currentSchedule) => currentSchedule.taskId === schedule.taskId,
      )
        ? currentSchedules
        : [...currentSchedules, schedule],
    );
    if (parentTaskId) {
      setCollapsedIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(parentTaskId);
        return nextIds;
      });
    }
    setSelectedTaskId(schedule.taskId);
    setNewTaskFocusId(schedule.taskId);
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    schedule: ApiPlanningTaskSchedule,
    hasChildren: boolean,
  ) {
    if (event.key === "ArrowLeft" && hasChildren) {
      event.preventDefault();
      setSelectedTaskId(schedule.taskId);
      setCollapsedIds((currentIds) => {
        if (currentIds.has(schedule.taskId)) {
          return currentIds;
        }
        const nextIds = new Set(currentIds);
        nextIds.add(schedule.taskId);
        return nextIds;
      });
      return;
    }

    if (event.key === "ArrowRight" && hasChildren) {
      event.preventDefault();
      setSelectedTaskId(schedule.taskId);
      setCollapsedIds((currentIds) => {
        if (!currentIds.has(schedule.taskId)) {
          return currentIds;
        }
        const nextIds = new Set(currentIds);
        nextIds.delete(schedule.taskId);
        return nextIds;
      });
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    setSelectedTaskId(schedule.taskId);
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
    const schedule = localSchedules.find(
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

  async function commitEditValue(
    schedule: ApiPlanningTaskSchedule,
    field: EditableField,
    value: string,
  ) {
    const nextEdit = { field, taskId: schedule.taskId, value };
    const validation = validateEdit(schedule, nextEdit);
    if (validation) {
      setEditError(validation);
      return;
    }

    setEditingCell(null);
    setEditError(null);
    await onUpdateSchedule(schedule.taskId, buildEditPayload(nextEdit));
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

  function startRowDrag(
    event: React.DragEvent<HTMLDivElement>,
    schedule: ApiPlanningTaskSchedule,
  ) {
    if (editingCell) {
      event.preventDefault();
      return;
    }
    setSelectedTaskId(schedule.taskId);
    setRowDragState({
      parentTaskId: schedule.parentTaskId ?? null,
      taskId: schedule.taskId,
    });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", schedule.taskId);
  }

  function handleRowDragOver(
    event: React.DragEvent<HTMLDivElement>,
    targetSchedule: ApiPlanningTaskSchedule,
  ) {
    if (
      !rowDragState ||
      rowDragState.taskId === targetSchedule.taskId ||
      rowDragState.parentTaskId !== (targetSchedule.parentTaskId ?? null)
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async function dropRow(
    event: React.DragEvent<HTMLDivElement>,
    targetSchedule: ApiPlanningTaskSchedule,
  ) {
    event.preventDefault();
    if (
      !rowDragState ||
      rowDragState.taskId === targetSchedule.taskId ||
      rowDragState.parentTaskId !== (targetSchedule.parentTaskId ?? null)
    ) {
      setRowDragState(null);
      return;
    }

    const reorder = reorderSchedulesWithinParent(
      localSchedules,
      rowDragState.taskId,
      targetSchedule.taskId,
    );
    setRowDragState(null);
    if (!reorder) {
      return;
    }

    setLocalSchedules(reorder.schedules);
    await Promise.all(
      reorder.changedSchedules.map((schedule) =>
        onUpdateSchedule(schedule.taskId, {
          parentTaskId: schedule.parentTaskId ?? null,
          sequenceNumber: schedule.sequenceNumber ?? null,
        }),
      ),
    );
  }

  function changeZoom(direction: "in" | "out") {
    setZoom((currentZoom) => {
      const currentIndex = zoomModes.indexOf(currentZoom);
      const nextIndex =
        direction === "in"
          ? Math.max(0, currentIndex - 1)
          : Math.min(zoomModes.length - 1, currentIndex + 1);
      return zoomModes[nextIndex];
    });
  }

  function fitToProject() {
    const viewportWidth = ganttScrollRef.current?.clientWidth || 900;
    const nextZoom =
      [...zoomModes]
        .reverse()
        .find(
          (mode) =>
            buildTimeline(localSchedules, mode).width <= viewportWidth,
        ) ?? "quarter";
    setZoom(nextZoom);
    window.setTimeout(() => {
      const scrollContainer = ganttScrollRef.current;
      if (scrollContainer) {
        scrollContainer.scrollLeft = 0;
      }
    }, 0);
  }

  function scrollToToday() {
    const todayX = timeline.todayX;
    if (todayX === null) {
      return;
    }
    const scrollContainer = ganttScrollRef.current;
    if (!scrollContainer) {
      return;
    }
    const viewportWidth = scrollContainer.clientWidth || 900;
    scrollContainer.scrollLeft = Math.max(0, todayX - viewportWidth / 2);
  }

  function scrollToDependencies() {
    dependencySectionRef.current?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="flex max-h-[calc(100vh-12rem)] min-h-[640px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
      <section
        aria-label="Planning toolbar"
        className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 p-3 backdrop-blur"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ToolbarGroup label="Tasks">
              <button
                className={toolbarButtonClassName}
                disabled={isSaving}
                onClick={() => createTask(selectedSchedule?.parentTaskId ?? null)}
                type="button"
              >
                Add Task
              </button>
              <button
                className={toolbarButtonClassName}
                disabled={isSaving || !selectedSchedule}
                onClick={() => createTask(selectedSchedule?.taskId ?? null)}
                type="button"
              >
                Add Child
              </button>
              <button
                className={toolbarButtonClassName}
                disabled
                title="Phase creation is handled outside this UX polish story."
                type="button"
              >
                Add Phase
              </button>
              <button
                className={toolbarButtonClassName}
                disabled
                title="Milestone creation is outside this UX polish story."
                type="button"
              >
                Add Milestone
              </button>
              <button
                className={toolbarButtonClassName}
                disabled
                title="Task deletion is outside this UX polish story."
                type="button"
              >
                Delete
              </button>
            </ToolbarGroup>
            <ToolbarGroup label="Schedule">
              <button
                className={toolbarButtonClassName}
                onClick={scrollToDependencies}
                type="button"
              >
                Dependencies
              </button>
              <button
                className={toolbarButtonClassName}
                onClick={scrollToToday}
                type="button"
              >
                Today
              </button>
            </ToolbarGroup>
            <ToolbarGroup label="Zoom">
              <button
                aria-label="Zoom Out"
                className={toolbarButtonClassName}
                disabled={!canZoomOut}
                onClick={() => changeZoom("out")}
                title="Zoom Out"
                type="button"
              >
                -
              </button>
              <button
                aria-label="Zoom In"
                className={toolbarButtonClassName}
                disabled={!canZoomIn}
                onClick={() => changeZoom("in")}
                title="Zoom In"
                type="button"
              >
                +
              </button>
              <button
                className={toolbarButtonClassName}
                onClick={fitToProject}
                type="button"
              >
                Fit to Project
              </button>
            </ToolbarGroup>
            <ToolbarGroup label="View">
              <button
                className={toolbarButtonClassName}
                disabled={!hasSummaryTasks}
                onClick={expandAll}
                type="button"
              >
                Expand All
              </button>
              <button
                className={toolbarButtonClassName}
                disabled={!hasSummaryTasks}
                onClick={collapseAll}
                type="button"
              >
                Collapse All
              </button>
              <label className="sr-only" htmlFor="planning-time-scale">
                Time Scale
              </label>
              <select
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                id="planning-time-scale"
                onChange={(event) => setZoom(event.target.value as ZoomMode)}
                value={zoom}
              >
                {zoomModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {zoomLabels[mode]}
                  </option>
                ))}
              </select>
              <KeyboardHelp />
            </ToolbarGroup>
          </div>
        </div>
      </section>

      <section
        aria-label="Scrollable planning workspace"
        className="min-h-0 flex-1 overflow-auto bg-white"
      >
        <div className="grid min-h-[560px] xl:grid-cols-[minmax(560px,45%)_minmax(0,1fr)]">
        <div className="overflow-visible border-r border-slate-200">
          <div
            className="sticky top-0 z-10 grid h-11 min-w-[1100px] items-center border-b border-slate-300 bg-slate-50 text-xs font-bold uppercase text-slate-600"
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
            const hasChildren = localSchedules.some(
              (candidate) => candidate.parentTaskId === schedule.taskId,
            );
            const title = getTaskTitle(schedule);
            return (
              <div
                aria-label={`Planning row ${wbs} ${title}`}
                aria-selected={selectedTaskId === schedule.taskId}
                className={`grid h-[46px] min-w-[1100px] items-center border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50 ${
                  selectedTaskId === schedule.taskId
                    ? "bg-brand/10 shadow-[inset_3px_0_0_#0f766e] ring-1 ring-inset ring-brand/30"
                    : ""
                }`}
                draggable={!editingCell}
                key={schedule.taskId}
                onClick={() => setSelectedTaskId(schedule.taskId)}
                onDragEnd={() => setRowDragState(null)}
                onDragOver={(event) => handleRowDragOver(event, schedule)}
                onDragStart={(event) => startRowDrag(event, schedule)}
                onDrop={(event) => dropRow(event, schedule)}
                onKeyDown={(event) =>
                  handleRowKeyDown(event, schedule, hasChildren)
                }
                ref={(element) => {
                  if (element) {
                    rowRefs.current.set(schedule.taskId, element);
                  } else {
                    rowRefs.current.delete(schedule.taskId);
                  }
                }}
                role="row"
                style={{
                  gridTemplateColumns: planningGridTemplate,
                  width: planningGridWidth,
                }}
                tabIndex={0}
              >
                <span
                  className="flex h-full cursor-move items-center border-r border-slate-100 px-3 font-mono text-slate-500"
                  title="Drag to reorder"
                >
                  <span aria-hidden className="mr-2 text-slate-400">
                    ::
                  </span>
                  <span>{wbs}</span>
                </span>
                <div
                  className="flex h-full min-w-0 items-center gap-2 border-r border-slate-100 px-4"
                  style={{ paddingLeft: 16 + depth * 18 }}
                >
                  {hasChildren ? (
                    <button
                      aria-label={`${collapsedIds.has(schedule.taskId) ? "Expand" : "Collapse"} ${title}`}
                      className="inline-flex h-5 w-5 items-center justify-center text-slate-500"
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
                    {hasChildren
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
                  onCommitValue={(value) =>
                    void commitEditValue(schedule, "ownerId", value)
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
                  onCommitValue={(value) =>
                    void commitEditValue(schedule, "status", value)
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
          {rows.length === 0 ? (
            <div className="min-w-[1100px] px-4 py-12 text-center text-sm text-slate-500">
              <p className="font-semibold text-slate-700">No Tasks</p>
              <p className="mt-1">Add a task to start building the project WBS.</p>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto overflow-y-visible" ref={ganttScrollRef}>
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
                aria-label="Today marker"
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
      </div>

      <section
        className="m-3 grid gap-4 rounded-md border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_1fr]"
        ref={dependencySectionRef}
      >
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
                  {taskName(dependency.predecessorTaskId, localSchedules)} →{" "}
                  {taskName(dependency.successorTaskId, localSchedules)}{" "}
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
      </section>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
        <span>{localSchedules.length} Tasks</span>
        <span>{summaryTaskIds.size} Summary Tasks</span>
        <span>{milestoneCount} Milestones</span>
        <span>Zoom: {zoomLabels[zoom]}</span>
        <span>Visible Tasks: {rows.length}</span>
      </footer>
    </div>
  );
}

function getPointerClientX(event: React.PointerEvent<SVGElement>) {
  const nativeClientX = (event.nativeEvent as PointerEvent | MouseEvent)
    .clientX;
  return Number.isFinite(event.clientX) ? event.clientX : nativeClientX;
}

function ToolbarGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 first:border-l-0 first:pl-0">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function KeyboardHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Keyboard help"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        ?
      </button>
      {isOpen ? (
        <span className="absolute right-0 top-9 z-30 w-64 rounded-md border border-slate-200 bg-white p-3 text-left text-xs text-slate-600 shadow-lg">
          <span className="block font-semibold text-slate-900">
            Keyboard Shortcuts
          </span>
          <span className="mt-2 block">Arrow Left: collapse summary task</span>
          <span className="block">Arrow Right: expand summary task</span>
          <span className="block">Enter or Space: select row</span>
          <span className="block">Enter: save inline edit</span>
          <span className="block">Escape: cancel inline edit</span>
          <span className="block">Tab: save and move to next editable cell</span>
        </span>
      ) : null}
    </span>
  );
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
  onCommitValue,
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
  onCommitValue?: (value: string) => void;
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
          onCommitValue={onCommitValue}
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
  onCommitValue,
  onKeyDown,
  ownerOptions,
  value,
}: {
  error: string | null;
  field: EditableField;
  onBlur: () => void;
  onChange: (value: string) => void;
  onCommitValue?: (value: string) => void;
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
        onChange={(event) => {
          onChange(event.target.value);
          onCommitValue?.(event.target.value);
        }}
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
        onChange={(event) => {
          onChange(event.target.value);
          onCommitValue?.(event.target.value);
        }}
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

function buildOwnerOptions(
  workspace: ApiPlanningWorkspace,
  projectMembers: ApiProjectMember[],
): OwnerOption[] {
  const owners = new Map<string, OwnerOption>();
  projectMembers.forEach((member) => {
    owners.set(member.userId, {
      id: member.userId,
      label: member.user
        ? `${member.user.firstName} ${member.user.lastName}`.trim() ||
          member.user.email ||
          member.userId
      : member.userId,
    });
  });
  if (projectMembers.length > 0) {
    return [...owners.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }
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

function reorderSchedulesWithinParent(
  schedules: ApiPlanningTaskSchedule[],
  draggedTaskId: string,
  targetTaskId: string,
) {
  const dragged = schedules.find((schedule) => schedule.taskId === draggedTaskId);
  const target = schedules.find((schedule) => schedule.taskId === targetTaskId);
  if (!dragged || !target) {
    return null;
  }
  const parentTaskId = dragged.parentTaskId ?? null;
  if (parentTaskId !== (target.parentTaskId ?? null)) {
    return null;
  }

  const sourceIndex = new Map(
    schedules.map((schedule, index) => [schedule.taskId, index]),
  );
  const orderedSiblings = schedules
    .filter((schedule) => (schedule.parentTaskId ?? null) === parentTaskId)
    .sort((left, right) => compareScheduleOrder(left, right, sourceIndex));
  const draggedIndex = orderedSiblings.findIndex(
    (schedule) => schedule.taskId === draggedTaskId,
  );
  const targetIndex = orderedSiblings.findIndex(
    (schedule) => schedule.taskId === targetTaskId,
  );
  if (draggedIndex < 0 || targetIndex < 0) {
    return null;
  }

  const [draggedSchedule] = orderedSiblings.splice(draggedIndex, 1);
  const insertionIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
  orderedSiblings.splice(insertionIndex, 0, draggedSchedule);

  const updatedByTaskId = new Map<string, ApiPlanningTaskSchedule>();
  orderedSiblings.forEach((schedule, index) => {
    updatedByTaskId.set(schedule.taskId, {
      ...schedule,
      sequenceNumber: index + 1,
    });
  });
  const nextSchedules = schedules.map(
    (schedule) => updatedByTaskId.get(schedule.taskId) ?? schedule,
  );
  const changedSchedules = orderedSiblings
    .map((schedule) => updatedByTaskId.get(schedule.taskId) ?? schedule)
    .filter(
      (schedule) =>
        schedule.sequenceNumber !==
        schedules.find((candidate) => candidate.taskId === schedule.taskId)
          ?.sequenceNumber,
    );

  return {
    changedSchedules,
    schedules: nextSchedules,
  };
}

function compareScheduleOrder(
  left: ApiPlanningTaskSchedule,
  right: ApiPlanningTaskSchedule,
  sourceIndex: Map<string, number>,
) {
  const leftSequence =
    typeof left.sequenceNumber === "number" ? left.sequenceNumber : 999_999;
  const rightSequence =
    typeof right.sequenceNumber === "number" ? right.sequenceNumber : 999_999;
  return (
    leftSequence - rightSequence ||
    (sourceIndex.get(left.taskId) ?? 999_999) -
      (sourceIndex.get(right.taskId) ?? 999_999)
  );
}

function buildVisibleRows(
  schedules: ApiPlanningTaskSchedule[],
  collapsedIds: Set<string>,
) {
  const sourceIndex = new Map(
    schedules.map((schedule, index) => [schedule.taskId, index]),
  );
  const byParentId = new Map<string | null, ApiPlanningTaskSchedule[]>();
  schedules.forEach((schedule) => {
    const key = schedule.parentTaskId ?? null;
    byParentId.set(key, [...(byParentId.get(key) ?? []), schedule]);
  });
  byParentId.forEach((items) =>
    items.sort((left, right) => compareScheduleOrder(left, right, sourceIndex)),
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

function getSummaryTaskIds(schedules: ApiPlanningTaskSchedule[]) {
  const summaryTaskIds = new Set<string>();
  schedules.forEach((schedule) => {
    if (schedule.parentTaskId) {
      summaryTaskIds.add(schedule.parentTaskId);
    }
  });
  return summaryTaskIds;
}

function buildTimeline(schedules: ApiPlanningTaskSchedule[], zoom: ZoomMode) {
  const currentDate = today();
  const starts = schedules
    .map((schedule) => schedule.plannedStartDate)
    .filter((value): value is string => Boolean(value));
  const finishes = schedules
    .map((schedule) => schedule.plannedFinishDate)
    .filter((value): value is string => Boolean(value));
  const sortedStarts = [...starts].sort();
  const sortedFinishes = [...finishes].sort();
  const earliestDate =
    [sortedStarts[0], currentDate]
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? currentDate;
  const latestDate =
    [sortedFinishes[sortedFinishes.length - 1], currentDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? currentDate;
  const min = addDays(parseDate(earliestDate), -3);
  const max = addDays(
    parseDate(latestDate),
    21,
  );
  const daysPerUnit =
    zoom === "day" ? 1 : zoom === "week" ? 7 : zoom === "month" ? 30 : 90;
  const unitWidth =
    zoom === "day" ? 34 : zoom === "week" ? 58 : zoom === "month" ? 86 : 120;
  const totalDays = Math.max(1, diffDays(formatDate(min), formatDate(max)));
  const units = Math.ceil(totalDays / daysPerUnit);
  const ticks = Array.from({ length: units + 1 }).map((_, index) => {
    const date = addDays(min, index * daysPerUnit);
    return {
      date: formatDate(date),
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      label:
        zoom === "quarter"
          ? `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`
          : zoom === "month"
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
