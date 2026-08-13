"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ApiDuplicateWorkPackageInput,
  ApiDuplicateWorkPackageResult,
  ApiPlanningTaskSchedule,
  ApiPlanningWorkspace,
  ApiMilestoneCategory,
  ApiProjectMember,
  ApiResourceAllocation,
  ApiTaskDependency,
  ApiTaskType,
} from "@/lib/api/client";
import {
  EmptyState,
  InfoCard,
  StatusBadge,
  WorkspaceSection,
} from "@/components/foundation";
import { DisclosureButton } from "@/components/ui/disclosure-button";
import { ToolbarGroup } from "@/components/ui/toolbar";
import { useDismissibleMenu, useDropdownMenu } from "@/hooks/use-dropdown-menu";
import { usePlanningExpansionState } from "./planning-expansion-state";
import { PlanningDetailPanel } from "./planning-detail-panel";

type ZoomMode = "day" | "week" | "month" | "quarter";
type DragMode = "move" | "resize-end";
type PlanningViewMode = "split" | "grid" | "timeline";
type GridColumnId =
  | "critical"
  | "durationDays"
  | "earlyFinish"
  | "earlyStart"
  | "freeFloatDays"
  | "lateFinish"
  | "lateStart"
  | "ownerId"
  | "percentComplete"
  | "plannedFinishDate"
  | "plannedStartDate"
  | "priority"
  | "status"
  | "taskTitle"
  | "totalFloatDays"
  | "wbs";
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
    milestoneCategory?: ApiMilestoneCategory;
    ownerId?: string | null;
    parentTaskId?: string | null;
    taskType?: ApiTaskType;
    title?: string;
  }) => Promise<ApiPlanningTaskSchedule>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onDeleteDependency: (dependencyId: string) => Promise<void>;
  onDuplicateWorkPackage?: (
    sourceSummaryTaskId: string,
    input: ApiDuplicateWorkPackageInput,
  ) => Promise<ApiDuplicateWorkPackageResult>;
  onRefreshWorkspace?: () => Promise<void>;
  onRegenerateWorkspace?: () => Promise<void>;
  onRemoveDuplicatedWorkPackage?: (
    summaryTaskId: string,
  ) => Promise<ApiPlanningWorkspace>;
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

type DraftCreateRowState = {
  error: string | null;
  isSaving: boolean;
  keepSelectedTaskId?: string | null;
  ownerId: string;
  parentTaskId: string | null;
  title: string;
  typeLabel: "Task" | "Sub-task";
};

type DraftCreateRowPlacement = {
  depth: number;
  insertIndex: number;
  wbs: string;
};

type PlanningDisplayRow =
  | { kind: "schedule"; row: VisibleRow }
  | { kind: "draft"; placement: DraftCreateRowPlacement };

type DragState = {
  mode: DragMode;
  originX: number;
  schedule: ApiPlanningTaskSchedule;
};

type RowDragState = {
  parentTaskId: string | null;
  taskId: string;
};

type SummaryDeleteDialogState = {
  taskId: string;
};

type MoveToSummaryState = {
  destinationTaskId: string;
  taskId: string;
};

type DuplicateWorkPackageDialogState = {
  input: ApiDuplicateWorkPackageInput;
  sourceTaskId: string;
};

type WorkPackageContextMenuState = {
  sourceTaskId: string;
  x: number;
  y: number;
};

type DuplicateHistoryEntry = {
  duplicateCollapsedSummaryIndexes: number[];
  duplicateSummaryTaskIds: string[];
  duplicateSummaryTaskId: string;
  input: ApiDuplicateWorkPackageInput;
  selectedTaskIdBefore: string | null;
  sourceTaskId: string;
};

type GridColumnDefinition = {
  align?: "left" | "right";
  defaultVisible: boolean;
  editableField?: EditableField;
  id: GridColumnId;
  label: string;
  minWidth: number;
};

const rowHeight = 42;
const defaultGridWidth = 560;
const minGridWidth = 420;
const maxGridWidth = 720;
const compactViewportWidth = 1280;
const headerHeight = 44;
const resourceHeight = 18;
const barHeight = 16;
const editableFields: EditableField[] = [
  "taskTitle",
  "ownerId",
  "plannedStartDate",
  "plannedFinishDate",
  "status",
  "percentComplete",
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
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50";
const preferenceKeys = {
  columns: "pm-platform.planningWorkspace.visibleColumns",
  showCriticalPath: "pm-platform.planningWorkspace.showCriticalPath",
  showFloatColumns: "pm-platform.planningWorkspace.showFloatColumns",
  splitWidth: "pm-platform.planningWorkspace.splitWidth",
  viewMode: "pm-platform.planningWorkspace.viewMode",
  zoom: "pm-platform.planningWorkspace.zoom",
};
type DuplicateBooleanOptionKey = Exclude<
  keyof ApiDuplicateWorkPackageInput,
  "newSummaryName"
>;
const duplicateOptionDefinitions: Array<{
  key: DuplicateBooleanOptionKey;
  label: string;
}> = [
  { key: "copyChildTasks", label: "Copy child tasks" },
  { key: "preserveWbsHierarchy", label: "Preserve WBS hierarchy" },
  { key: "preserveTaskDurations", label: "Preserve task durations" },
  { key: "preserveEstimatedEffort", label: "Preserve estimated effort" },
  {
    key: "preserveInternalPredecessors",
    label: "Preserve predecessors between copied tasks",
  },
  { key: "preserveMilestones", label: "Preserve milestones" },
  { key: "preserveNotes", label: "Preserve notes" },
  { key: "copyResourceAssignments", label: "Copy resource assignments" },
  { key: "copyPlannedDates", label: "Copy planned dates" },
  { key: "copyActualDates", label: "Copy actual dates" },
];
const unsupportedDuplicateOptions = ["Copy comments", "Copy attachments"];
const gridColumns: GridColumnDefinition[] = [
  { defaultVisible: true, id: "wbs", label: "WBS", minWidth: 64 },
  {
    defaultVisible: true,
    editableField: "taskTitle",
    id: "taskTitle",
    label: "Task Name",
    minWidth: 300,
  },
  {
    defaultVisible: true,
    editableField: "ownerId",
    id: "ownerId",
    label: "Owner",
    minWidth: 120,
  },
  {
    defaultVisible: true,
    editableField: "plannedStartDate",
    id: "plannedStartDate",
    label: "Start",
    minWidth: 96,
  },
  {
    defaultVisible: true,
    editableField: "plannedFinishDate",
    id: "plannedFinishDate",
    label: "Finish",
    minWidth: 96,
  },
  {
    defaultVisible: false,
    editableField: "status",
    id: "status",
    label: "Status",
    minWidth: 110,
  },
  {
    defaultVisible: false,
    id: "priority",
    label: "Priority",
    minWidth: 90,
  },
  {
    align: "right",
    defaultVisible: false,
    editableField: "percentComplete",
    id: "percentComplete",
    label: "Progress",
    minWidth: 92,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "durationDays",
    label: "Duration",
    minWidth: 88,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "earlyStart",
    label: "ES",
    minWidth: 64,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "earlyFinish",
    label: "EF",
    minWidth: 64,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "lateStart",
    label: "LS",
    minWidth: 64,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "lateFinish",
    label: "LF",
    minWidth: 64,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "totalFloatDays",
    label: "Total Float",
    minWidth: 108,
  },
  {
    align: "right",
    defaultVisible: false,
    id: "freeFloatDays",
    label: "Free Float",
    minWidth: 104,
  },
  {
    defaultVisible: false,
    id: "critical",
    label: "Critical",
    minWidth: 86,
  },
];
const defaultGridColumnIds = gridColumns
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);
const optionalGridColumns = gridColumns.filter(
  (column) => !column.defaultVisible,
);
const floatColumnIds: GridColumnId[] = [
  "earlyStart",
  "earlyFinish",
  "lateStart",
  "lateFinish",
  "totalFloatDays",
  "freeFloatDays",
  "critical",
];
const milestoneCategories: Array<{
  category: ApiMilestoneCategory;
  label: string;
}> = [
  { category: "standard", label: "Standard" },
  { category: "release", label: "Release" },
  { category: "drop", label: "Drop" },
  { category: "go_live", label: "Go Live" },
  { category: "decision", label: "Decision" },
];

export function PlanningWorkspace({
  isSaving = false,
  onCreateDependency,
  onCreateTask,
  onDeleteTask = async () => {},
  onDeleteDependency,
  onDuplicateWorkPackage,
  onRefreshWorkspace = async () => {},
  onRegenerateWorkspace = async () => {},
  onRemoveDuplicatedWorkPackage,
  onUpdateSchedule,
  projectMembers = [],
  workspace,
}: PlanningWorkspaceProps) {
  const [zoom, setZoom] = useState<ZoomMode>(() => readZoomPreference());
  const [gridWidth, setGridWidth] = useState(() =>
    readNumberPreference(preferenceKeys.splitWidth, defaultGridWidth),
  );
  const [fitTimelineWidth, setFitTimelineWidth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<PlanningViewMode>(() =>
    readViewModePreference(),
  );
  const [showCriticalPath, setShowCriticalPath] = useState(() =>
    readBooleanPreference(preferenceKeys.showCriticalPath),
  );
  const [showFloatColumns, setShowFloatColumns] = useState(() =>
    readBooleanPreference(preferenceKeys.showFloatColumns),
  );
  const [visibleOptionalColumnIds, setVisibleOptionalColumnIds] = useState<
    GridColumnId[]
  >(() => {
    const savedColumns = readVisibleColumnPreference();
    return readBooleanPreference(preferenceKeys.showFloatColumns)
      ? mergeColumnIds(savedColumns, floatColumnIds)
      : savedColumns;
  });
  const columnsMenu = useDropdownMenu<HTMLSpanElement>();
  const viewMenu = useDropdownMenu<HTMLSpanElement>();
  const structureMenu = useDropdownMenu<HTMLSpanElement>();
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [localSchedules, setLocalSchedules] = useState(workspace.schedules);
  const expansionState = usePlanningExpansionState(workspace.project.id);
  const expansionVersion = expansionState.getSnapshot();
  const collapsedIds = expansionState.getCollapsedTaskIds();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskFocusId, setNewTaskFocusId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [draftCreateRow, setDraftCreateRow] =
    useState<DraftCreateRowState | null>(null);
  const [summaryDeleteDialog, setSummaryDeleteDialog] =
    useState<SummaryDeleteDialogState | null>(null);
  const [moveToSummaryState, setMoveToSummaryState] =
    useState<MoveToSummaryState | null>(null);
  const [duplicateWorkPackageDialog, setDuplicateWorkPackageDialog] =
    useState<DuplicateWorkPackageDialogState | null>(null);
  const [workPackageContextMenu, setWorkPackageContextMenu] =
    useState<WorkPackageContextMenuState | null>(null);
  const workPackageMenu = useDismissibleMenu<HTMLDivElement>({
    closeOnWindowBlur: true,
    closeOnWindowResize: true,
    isOpen: workPackageContextMenu !== null,
    onClose: () => setWorkPackageContextMenu(null),
  });
  const [duplicateUndoStack, setDuplicateUndoStack] = useState<
    DuplicateHistoryEntry[]
  >([]);
  const [duplicateRedoStack, setDuplicateRedoStack] = useState<
    DuplicateHistoryEntry[]
  >([]);
  const addMenu = useDropdownMenu<HTMLSpanElement>();
  const [dependencyDraft, setDependencyDraft] = useState({
    dependencyType: "FS" as "FS" | "SS" | "FF",
    predecessorTaskId: "",
    successorTaskId: "",
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [rowDragState, setRowDragState] = useState<RowDragState | null>(null);
  const workspaceSplitRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const verticalScrollRef = useRef<HTMLElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingTimelineScrollRef = useRef<null | {
    ratio?: number;
    scrollLeft?: number;
  }>(null);
  const dependencySectionRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const taskNameRefs = useRef(new Map<string, HTMLSpanElement>());

  useEffect(() => {
    setLocalSchedules(workspace.schedules);
  }, [workspace.schedules]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateResponsiveState = () => {
      setIsCompactViewport(window.innerWidth < compactViewportWidth);
      if (!readPreference(preferenceKeys.splitWidth)) {
        const containerWidth = workspaceSplitRef.current?.clientWidth ?? 0;
        if (containerWidth > 0) {
          setGridWidth(clampGridWidth(containerWidth * 0.35));
        }
      }
    };

    updateResponsiveState();
    window.addEventListener("resize", updateResponsiveState);
    return () => window.removeEventListener("resize", updateResponsiveState);
  }, []);

  useEffect(() => {
    writePreference(preferenceKeys.splitWidth, String(Math.round(gridWidth)));
  }, [gridWidth]);

  useEffect(() => {
    writePreference(preferenceKeys.columns, visibleOptionalColumnIds.join(","));
  }, [visibleOptionalColumnIds]);

  useEffect(() => {
    writePreference(preferenceKeys.viewMode, viewMode);
  }, [viewMode]);

  useEffect(() => {
    writePreference(preferenceKeys.showCriticalPath, String(showCriticalPath));
  }, [showCriticalPath]);

  useEffect(() => {
    writePreference(preferenceKeys.showFloatColumns, String(showFloatColumns));
  }, [showFloatColumns]);

  useEffect(() => {
    writePreference(preferenceKeys.zoom, zoom);
  }, [zoom]);

  const rows = useMemo(
    () => buildVisibleRows(localSchedules, collapsedIds),
    // The expansion manager mutates a stable Set and publishes expansionVersion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expansionVersion, localSchedules],
  );
  const draftCreateRowPlacement = useMemo(
    () => getDraftCreateRowPlacement(rows, localSchedules, draftCreateRow),
    [draftCreateRow, localSchedules, rows],
  );
  const displayRows = useMemo(
    () => buildDisplayRows(rows, draftCreateRowPlacement),
    [draftCreateRowPlacement, rows],
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
    () => buildTimeline(localSchedules, zoom, fitTimelineWidth),
    [fitTimelineWidth, localSchedules, zoom],
  );
  const allocationsByTaskId = useMemo(
    () => groupAllocations(workspace.resourceAllocations),
    [workspace.resourceAllocations],
  );
  const selectedSchedule = useMemo(
    () =>
      selectedTaskId
        ? (rows.find((row) => row.schedule.taskId === selectedTaskId)
            ?.schedule ?? null)
        : null,
    [rows, selectedTaskId],
  );
  const selectedRow = useMemo(
    () =>
      selectedTaskId
        ? (rows.find((row) => row.schedule.taskId === selectedTaskId) ?? null)
        : null,
    [rows, selectedTaskId],
  );
  const selectedAllocations = selectedTaskId
    ? (allocationsByTaskId.get(selectedTaskId) ?? [])
    : [];
  const selectedPredecessorCount = selectedTaskId
    ? workspace.dependencies.filter(
        (dependency) => dependency.successorTaskId === selectedTaskId,
      ).length
    : 0;
  const selectedSuccessorCount = selectedTaskId
    ? workspace.dependencies.filter(
        (dependency) => dependency.predecessorTaskId === selectedTaskId,
      ).length
    : 0;
  const ownerOptions = useMemo(
    () => buildOwnerOptions(workspace, projectMembers),
    [projectMembers, workspace],
  );
  const selectedTaskChildren = useMemo(
    () =>
      selectedTaskId
        ? getDirectChildSchedules(localSchedules, selectedTaskId)
        : [],
    [localSchedules, selectedTaskId],
  );
  const selectedTaskSiblingContext = useMemo(
    () =>
      selectedTaskId ? getSiblingContext(localSchedules, selectedTaskId) : null,
    [localSchedules, selectedTaskId],
  );
  const moveToSummaryOptions = useMemo(
    () =>
      selectedTaskId
        ? getEligibleSummaryMoveTargets(localSchedules, selectedTaskId)
        : [],
    [localSchedules, selectedTaskId],
  );
  const visibleColumns = useMemo(() => {
    const enabledIds = new Set<GridColumnId>([
      ...defaultGridColumnIds,
      ...(isCompactViewport ? [] : visibleOptionalColumnIds),
    ]);
    return gridColumns.filter((column) => enabledIds.has(column.id));
  }, [isCompactViewport, visibleOptionalColumnIds]);
  const gridMinContentWidth = useMemo(
    () => visibleColumns.reduce((width, column) => width + column.minWidth, 0),
    [visibleColumns],
  );
  const gridContentWidth = Math.max(gridWidth, gridMinContentWidth);
  const gridTemplateColumns = buildGridTemplateColumns(
    visibleColumns,
    gridContentWidth,
  );
  const showGrid = viewMode !== "timeline";
  const showTimeline = viewMode !== "grid";

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
    rowRefs.current.get(newTaskFocusId)?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
    const input = taskName.querySelector("input");
    if (input instanceof HTMLInputElement) {
      input.focus();
      const cursorPosition = input.value.length;
      input.setSelectionRange(cursorPosition, cursorPosition);
    } else {
      taskName.focus();
    }
    setNewTaskFocusId(null);
  }, [editingCell, newTaskFocusId, localSchedules]);

  const totalHeight = headerHeight + displayRows.length * rowHeight + 24;
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
  const canMoveSelectionUp = Boolean(
    selectedTaskSiblingContext?.previousTaskId,
  );
  const canMoveSelectionDown = Boolean(selectedTaskSiblingContext?.nextTaskId);
  const canMoveSelectionToParent = Boolean(selectedSchedule?.parentTaskId);
  const canMoveSelectionToSummary = moveToSummaryOptions.length > 0;

  useLayoutEffect(() => {
    const pendingScroll = pendingTimelineScrollRef.current;
    const scrollContainer = timelineScrollRef.current;
    if (!pendingScroll || !scrollContainer) {
      return;
    }

    if (typeof pendingScroll.scrollLeft === "number") {
      scrollContainer.scrollLeft = pendingScroll.scrollLeft;
    } else if (typeof pendingScroll.ratio === "number") {
      const viewportWidth = Math.max(scrollContainer.clientWidth || 0, 1);
      scrollContainer.scrollLeft = Math.max(
        0,
        pendingScroll.ratio * totalWidth - viewportWidth / 2,
      );
    }

    pendingTimelineScrollRef.current = null;
  }, [totalWidth]);

  function toggleCollapse(taskId: string) {
    expansionState.toggle(taskId);
  }

  function expandAll() {
    expansionState.expandMany(summaryTaskIds);
  }

  function collapseAll() {
    expansionState.collapseMany(summaryTaskIds);
  }

  async function createTask(
    input: {
      focusCreatedTask?: boolean;
      keepSelectedTaskId?: string | null;
      milestoneCategory?: ApiMilestoneCategory;
      ownerId?: string | null;
      parentTaskId?: string | null;
      taskType?: ApiTaskType;
      title?: string;
    } = {},
  ) {
    setHierarchyError(null);
    const {
      focusCreatedTask = true,
      keepSelectedTaskId,
      ...createInput
    } = input;
    const schedule = await onCreateTask(createInput);
    setLocalSchedules((currentSchedules) =>
      currentSchedules.some(
        (currentSchedule) => currentSchedule.taskId === schedule.taskId,
      )
        ? currentSchedules
        : [...currentSchedules, schedule],
    );
    if (schedule.taskKind === "summary") {
      expansionState.collapse(schedule.taskId);
    }
    setSelectedTaskId(keepSelectedTaskId ?? schedule.taskId);
    if (focusCreatedTask) {
      setEditingCell({
        field: "taskTitle",
        taskId: schedule.taskId,
        value: getTaskTitle(schedule),
      });
      setEditError(null);
      setNewTaskFocusId(schedule.taskId);
    }
    addMenu.close();
  }

  function openDraftCreateRow(input: {
    keepSelectedTaskId?: string | null;
    parentTaskId?: string | null;
    typeLabel: "Task" | "Sub-task";
  }) {
    setHierarchyError(null);
    setEditingCell(null);
    setEditError(null);
    if (input.parentTaskId) {
      expansionState.expand(input.parentTaskId);
    }
    setDraftCreateRow({
      error: null,
      isSaving: false,
      keepSelectedTaskId: input.keepSelectedTaskId,
      ownerId: "",
      parentTaskId: input.parentTaskId ?? null,
      title: input.typeLabel === "Sub-task" ? "New Sub-task" : "New Task",
      typeLabel: input.typeLabel,
    });
    addMenu.close();
  }

  async function submitDraftCreateRow() {
    if (!draftCreateRow || draftCreateRow.isSaving) {
      return;
    }
    const title = draftCreateRow.title.trim();
    if (!title) {
      setDraftCreateRow((current) =>
        current
          ? {
              ...current,
              error: "Task name is required.",
            }
          : current,
      );
      return;
    }
    setDraftCreateRow((current) =>
      current ? { ...current, error: null, isSaving: true } : current,
    );
    try {
      await createTask({
        focusCreatedTask: false,
        keepSelectedTaskId: draftCreateRow.keepSelectedTaskId,
        ownerId: draftCreateRow.ownerId || null,
        parentTaskId: draftCreateRow.parentTaskId,
        taskType: "task",
        title,
      });
      setDraftCreateRow(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create task.";
      setHierarchyError(message);
      setDraftCreateRow((current) =>
        current ? { ...current, error: message, isSaving: false } : current,
      );
    }
  }

  function cancelDraftCreateRow() {
    setDraftCreateRow(null);
    setHierarchyError(null);
  }

  function handleDraftCreateKeyDown(
    event: React.KeyboardEvent<HTMLElement>,
  ) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      void submitDraftCreateRow();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelDraftCreateRow();
    }
  }

  function getAddTaskParentTaskId() {
    if (!selectedSchedule) {
      return null;
    }
    if (selectedSchedule.taskKind === "summary") {
      return selectedSchedule.taskId;
    }
    return selectedSchedule.parentTaskId ?? null;
  }

  function canShowInlineSubtaskAction(schedule: ApiPlanningTaskSchedule) {
    return (
      schedule.taskKind === "standard" &&
      canScheduleContainChildren(schedule, localSchedules)
    );
  }

  function openDuplicateWorkPackageDialog(schedule: ApiPlanningTaskSchedule) {
    if (schedule.taskKind !== "summary" || !onDuplicateWorkPackage) {
      return;
    }
    setDuplicateWorkPackageDialog({
      input: {
        copyActualDates: false,
        copyAttachments: false,
        copyChildTasks: true,
        copyComments: false,
        copyPlannedDates: false,
        copyResourceAssignments: false,
        newSummaryName: `${getTaskTitle(schedule)} Copy`,
        preserveEstimatedEffort: true,
        preserveInternalPredecessors: true,
        preserveMilestones: true,
        preserveNotes: true,
        preserveChecklists: true,
        preserveTaskDurations: true,
        preserveWbsHierarchy: true,
      },
      sourceTaskId: schedule.taskId,
    });
    setWorkPackageContextMenu(null);
    setHierarchyError(null);
  }

  async function confirmDuplicateWorkPackage() {
    if (!duplicateWorkPackageDialog || !onDuplicateWorkPackage) {
      return;
    }
    const newSummaryName =
      duplicateWorkPackageDialog.input.newSummaryName.trim();
    if (!newSummaryName) {
      setHierarchyError("New Summary Name is required.");
      return;
    }
    const selectedTaskIdBefore = selectedTaskId;
    try {
      const input = {
        ...duplicateWorkPackageDialog.input,
        newSummaryName,
      };
      const result = await onDuplicateWorkPackage(
        duplicateWorkPackageDialog.sourceTaskId,
        input,
      );
      const duplicateSummaryTaskIds = getDuplicatedSummaryTaskIds(result);
      setLocalSchedules(result.workspace.schedules);
      setSelectedTaskId(result.newSummaryTaskId);
      expansionState.collapseMany(duplicateSummaryTaskIds);
      setDuplicateUndoStack((entries) => [
        ...entries,
        {
          duplicateCollapsedSummaryIndexes: duplicateSummaryTaskIds.map(
            (_, index) => index,
          ),
          duplicateSummaryTaskIds,
          duplicateSummaryTaskId: result.newSummaryTaskId,
          input,
          selectedTaskIdBefore,
          sourceTaskId: duplicateWorkPackageDialog.sourceTaskId,
        },
      ]);
      setDuplicateRedoStack([]);
      setDuplicateWorkPackageDialog(null);
      setHierarchyError(null);
      window.setTimeout(() => {
        rowRefs.current.get(result.newSummaryTaskId)?.scrollIntoView?.({
          block: "nearest",
          inline: "nearest",
        });
      }, 0);
    } catch (error) {
      setHierarchyError(
        error instanceof Error
          ? error.message
          : "Unable to duplicate the work package.",
      );
    }
  }

  async function undoDuplicateWorkPackage() {
    const entry = duplicateUndoStack.at(-1);
    if (!entry || !onRemoveDuplicatedWorkPackage) {
      return;
    }
    try {
      const nextWorkspace = await onRemoveDuplicatedWorkPackage(
        entry.duplicateSummaryTaskId,
      );
      setLocalSchedules(nextWorkspace.schedules);
      setSelectedTaskId(entry.selectedTaskIdBefore);
      const duplicateCollapsedSummaryIndexes =
        entry.duplicateSummaryTaskIds.flatMap((taskId, index) =>
          expansionState.isCollapsed(taskId) ? [index] : [],
        );
      expansionState.expandMany(entry.duplicateSummaryTaskIds);
      setDuplicateUndoStack((entries) => entries.slice(0, -1));
      setDuplicateRedoStack((entries) => [
        ...entries,
        { ...entry, duplicateCollapsedSummaryIndexes },
      ]);
      setHierarchyError(null);
    } catch (error) {
      setHierarchyError(
        error instanceof Error
          ? error.message
          : "Unable to undo the duplicated work package.",
      );
    }
  }

  async function redoDuplicateWorkPackage() {
    const entry = duplicateRedoStack.at(-1);
    if (!entry || !onDuplicateWorkPackage) {
      return;
    }
    try {
      const result = await onDuplicateWorkPackage(
        entry.sourceTaskId,
        entry.input,
      );
      const duplicateSummaryTaskIds = getDuplicatedSummaryTaskIds(result);
      setLocalSchedules(result.workspace.schedules);
      setSelectedTaskId(result.newSummaryTaskId);
      expansionState.expandMany(duplicateSummaryTaskIds);
      expansionState.collapseMany(
        duplicateSummaryTaskIds.filter((_, index) =>
          entry.duplicateCollapsedSummaryIndexes.includes(index),
        ),
      );
      setDuplicateRedoStack((entries) => entries.slice(0, -1));
      setDuplicateUndoStack((entries) => [
        ...entries,
        {
          ...entry,
          duplicateSummaryTaskIds,
          duplicateSummaryTaskId: result.newSummaryTaskId,
        },
      ]);
      setHierarchyError(null);
    } catch (error) {
      setHierarchyError(
        error instanceof Error
          ? error.message
          : "Unable to redo the duplicated work package.",
      );
    }
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    schedule: ApiPlanningTaskSchedule,
    hasChildren: boolean,
  ) {
    if (event.key === "ArrowLeft" && hasChildren) {
      event.preventDefault();
      setSelectedTaskId(schedule.taskId);
      expansionState.collapse(schedule.taskId);
      return;
    }

    if (event.key === "ArrowRight" && hasChildren) {
      event.preventDefault();
      setSelectedTaskId(schedule.taskId);
      expansionState.expand(schedule.taskId);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    setSelectedTaskId(schedule.taskId);
  }

  function handleWorkspaceKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (editingCell || isKeyboardInputTarget(event.target)) {
      return;
    }

    const primaryModifier = event.metaKey || event.ctrlKey;
    if (
      primaryModifier &&
      event.shiftKey &&
      event.key.toLowerCase() === "d" &&
      selectedSchedule?.taskKind === "summary"
    ) {
      event.preventDefault();
      openDuplicateWorkPackageDialog(selectedSchedule);
      return;
    }

    if (primaryModifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        void redoDuplicateWorkPackage();
      } else {
        void undoDuplicateWorkPackage();
      }
      return;
    }

    if (primaryModifier && event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        if (
          selectedSchedule &&
          canScheduleContainChildren(selectedSchedule, localSchedules)
        ) {
          void createTask({
            parentTaskId: selectedSchedule.taskId,
            taskType: "task",
          });
        }
        return;
      }
      void createTask({
        parentTaskId: selectedSchedule?.parentTaskId ?? null,
        taskType: "task",
      });
      return;
    }

    if (event.altKey && event.shiftKey && selectedSchedule) {
      if (event.key === "ArrowUp" && canMoveSelectionUp) {
        event.preventDefault();
        void moveSelectedTask("up");
        return;
      }
      if (event.key === "ArrowDown" && canMoveSelectionDown) {
        event.preventDefault();
        void moveSelectedTask("down");
        return;
      }
      if (event.key === "ArrowLeft" && canMoveSelectionToParent) {
        event.preventDefault();
        void moveSelectionToParent();
        return;
      }
    }

    if (event.key === "Delete" && selectedSchedule) {
      event.preventDefault();
      void deleteSelectedTask();
    }
  }

  function startEditing(
    schedule: ApiPlanningTaskSchedule,
    field: EditableField,
  ) {
    if (isReadOnlyField(schedule, field)) {
      return;
    }
    setSelectedTaskId(schedule.taskId);
    setHierarchyError(null);
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
    setSelectedTaskId(schedule.taskId);
    setHierarchyError(null);
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
    setHierarchyError(null);
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
    if (!rowDragState || rowDragState.taskId === targetSchedule.taskId) {
      return;
    }

    if (targetSchedule.taskKind === "milestone") {
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
      return;
    }

    const sameParent =
      rowDragState.parentTaskId === (targetSchedule.parentTaskId ?? null);
    const draggedSchedule = localSchedules.find(
      (schedule) => schedule.taskId === rowDragState.taskId,
    );
    const canDropIntoTarget =
      draggedSchedule &&
      canMoveScheduleUnderParent(
        localSchedules,
        draggedSchedule,
        targetSchedule,
      );
    if (!sameParent && !canDropIntoTarget) {
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
    if (!rowDragState || rowDragState.taskId === targetSchedule.taskId) {
      setRowDragState(null);
      return;
    }

    if (targetSchedule.taskKind === "milestone") {
      setHierarchyError(
        "Milestones are scheduling events and cannot contain child items.",
      );
      setRowDragState(null);
      return;
    }

    const sameParent =
      rowDragState.parentTaskId === (targetSchedule.parentTaskId ?? null);
    const draggedSchedule = localSchedules.find(
      (schedule) => schedule.taskId === rowDragState.taskId,
    );
    const canDropIntoTarget =
      draggedSchedule &&
      canMoveScheduleUnderParent(
        localSchedules,
        draggedSchedule,
        targetSchedule,
      );
    if (!sameParent && !canDropIntoTarget) {
      setHierarchyError(getMoveToParentError(localSchedules, targetSchedule));
      setRowDragState(null);
      return;
    }

    setRowDragState(null);

    if (sameParent) {
      const reorder = reorderSchedulesWithinParent(
        localSchedules,
        rowDragState.taskId,
        targetSchedule.taskId,
      );
      if (!reorder) {
        return;
      }

      await applyHierarchyOperation({
        nextSchedules: reorder.schedules,
        selectedTaskId: rowDragState.taskId,
      });
      return;
    }

    const moveResult = moveScheduleToParent(
      localSchedules,
      rowDragState.taskId,
      targetSchedule.taskId,
    );
    if ("error" in moveResult) {
      setHierarchyError(moveResult.error);
      return;
    }

    await applyHierarchyOperation({
      nextSchedules: moveResult,
      selectedTaskId: rowDragState.taskId,
    });
  }

  function changeZoom(direction: "in" | "out") {
    const scrollContainer = timelineScrollRef.current;
    if (scrollContainer) {
      const viewportWidth = Math.max(scrollContainer.clientWidth || 0, 1);
      pendingTimelineScrollRef.current = {
        ratio: Math.min(
          1,
          Math.max(
            0,
            (scrollContainer.scrollLeft + viewportWidth / 2) / totalWidth,
          ),
        ),
      };
    }
    setFitTimelineWidth(null);
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
    const viewportWidth = Math.max(
      320,
      timelineScrollRef.current?.clientWidth || 900,
    );
    const nextZoom =
      [...zoomModes]
        .reverse()
        .find(
          (mode) => buildTimeline(localSchedules, mode).width <= viewportWidth,
        ) ?? "quarter";
    setFitTimelineWidth(viewportWidth);
    pendingTimelineScrollRef.current = { scrollLeft: 0 };
    setZoom(nextZoom);
    window.setTimeout(() => {
      const scrollContainer = timelineScrollRef.current;
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
    const scrollContainer = timelineScrollRef.current;
    if (!scrollContainer) {
      return;
    }
    const viewportWidth = Math.max(0, scrollContainer.clientWidth || 900);
    scrollContainer.scrollLeft = Math.max(0, todayX - viewportWidth / 2);
  }

  function scrollToDependencies() {
    dependencySectionRef.current?.scrollIntoView({ block: "nearest" });
  }

  function toggleOptionalColumn(columnId: GridColumnId) {
    setVisibleOptionalColumnIds((currentIds) =>
      currentIds.includes(columnId)
        ? currentIds.filter((id) => id !== columnId)
        : [...currentIds, columnId],
    );
  }

  function toggleFloatColumns() {
    setShowFloatColumns((isVisible) => {
      const nextIsVisible = !isVisible;
      setVisibleOptionalColumnIds((currentIds) =>
        nextIsVisible
          ? mergeColumnIds(currentIds, floatColumnIds)
          : currentIds.filter((columnId) => !floatColumnIds.includes(columnId)),
      );
      return nextIsVisible;
    });
  }

  function restoreDefaultColumns() {
    setVisibleOptionalColumnIds([]);
    setShowFloatColumns(false);
  }

  async function applyHierarchyOperation(input: {
    deletedTaskIds?: string[];
    nextSchedules: ApiPlanningTaskSchedule[];
    selectedTaskId?: string | null;
  }) {
    const previousSchedules = localSchedules;
    const previousSelectedTaskId = selectedTaskId;
    const deletedTaskIds = input.deletedTaskIds ?? [];
    const nextSelectedTaskId =
      typeof input.selectedTaskId === "undefined"
        ? previousSelectedTaskId
        : input.selectedTaskId;
    const changedSchedules = buildHierarchyUpdatePayloads(
      previousSchedules,
      input.nextSchedules,
      deletedTaskIds,
    );

    setHierarchyError(null);
    setSummaryDeleteDialog(null);
    setMoveToSummaryState(null);
    setLocalSchedules(input.nextSchedules);
    setSelectedTaskId(nextSelectedTaskId);

    try {
      for (const schedule of changedSchedules) {
        await onUpdateSchedule(schedule.taskId, {
          parentTaskId: schedule.parentTaskId ?? null,
          sequenceNumber: schedule.sequenceNumber ?? null,
        });
      }
      for (const taskId of deletedTaskIds) {
        await onDeleteTask(taskId);
      }
      await onRefreshWorkspace();
    } catch (error) {
      setLocalSchedules(previousSchedules);
      setSelectedTaskId(previousSelectedTaskId);
      setHierarchyError(
        error instanceof Error
          ? error.message
          : "Unable to update the work breakdown structure.",
      );
    }
  }

  async function moveSelectedTask(direction: "up" | "down") {
    if (!selectedTaskId) {
      return;
    }
    const result = reorderScheduleByDirection(
      localSchedules,
      selectedTaskId,
      direction,
    );
    if (!result) {
      return;
    }
    await applyHierarchyOperation({ nextSchedules: result, selectedTaskId });
  }

  async function moveSelectionToParent() {
    if (!selectedSchedule?.parentTaskId) {
      return;
    }

    const parentSchedule = localSchedules.find(
      (schedule) => schedule.taskId === selectedSchedule.parentTaskId,
    );
    if (!parentSchedule) {
      return;
    }

    const targetParentId = parentSchedule.parentTaskId ?? null;
    const targetSiblings = getOrderedSiblings(localSchedules, targetParentId);
    const parentIndex = targetSiblings.findIndex(
      (schedule) => schedule.taskId === parentSchedule.taskId,
    );
    const result = moveScheduleToParent(
      localSchedules,
      selectedSchedule.taskId,
      targetParentId,
      parentIndex + 1,
    );

    if ("error" in result) {
      setHierarchyError(result.error);
      return;
    }

    await applyHierarchyOperation({
      nextSchedules: result,
      selectedTaskId: selectedSchedule.taskId,
    });
  }

  function openMoveToSummaryDialog() {
    if (!selectedTaskId || moveToSummaryOptions.length === 0) {
      return;
    }
    setMoveToSummaryState({
      destinationTaskId: moveToSummaryOptions[0].taskId,
      taskId: selectedTaskId,
    });
    setHierarchyError(null);
  }

  async function confirmMoveToSummary() {
    if (!moveToSummaryState) {
      return;
    }

    const result = moveScheduleToParent(
      localSchedules,
      moveToSummaryState.taskId,
      moveToSummaryState.destinationTaskId,
    );
    if ("error" in result) {
      setHierarchyError(result.error);
      return;
    }

    await applyHierarchyOperation({
      nextSchedules: result,
      selectedTaskId: moveToSummaryState.taskId,
    });
  }

  async function deleteSelectedTask() {
    if (!selectedSchedule) {
      return;
    }

    if (
      selectedSchedule.taskKind === "summary" &&
      selectedTaskChildren.length > 0
    ) {
      setSummaryDeleteDialog({ taskId: selectedSchedule.taskId });
      setHierarchyError(null);
      return;
    }

    const deletedTaskIds = [selectedSchedule.taskId];
    const nextSchedules = removeSchedulesAndRenumber(
      localSchedules,
      deletedTaskIds,
    );
    await applyHierarchyOperation({
      deletedTaskIds,
      nextSchedules,
      selectedTaskId: getFallbackSelectionTaskId(
        localSchedules,
        nextSchedules,
        selectedSchedule.taskId,
      ),
    });
  }

  async function deleteSummaryAndMoveChildrenToParent() {
    if (!summaryDeleteDialog) {
      return;
    }

    const deletedTaskIds = [summaryDeleteDialog.taskId];
    const nextSchedules = promoteSummaryChildren(
      localSchedules,
      summaryDeleteDialog.taskId,
    );
    await applyHierarchyOperation({
      deletedTaskIds,
      nextSchedules,
      selectedTaskId: getFallbackSelectionTaskId(
        localSchedules,
        nextSchedules,
        summaryDeleteDialog.taskId,
      ),
    });
  }

  async function deleteSummaryAndDescendants() {
    if (!summaryDeleteDialog) {
      return;
    }

    const deletedTaskIds = getDeletionOrder(
      localSchedules,
      summaryDeleteDialog.taskId,
    );
    const nextSchedules = removeSchedulesAndRenumber(
      localSchedules,
      deletedTaskIds,
    );
    await applyHierarchyOperation({
      deletedTaskIds,
      nextSchedules,
      selectedTaskId: getFallbackSelectionTaskId(
        localSchedules,
        nextSchedules,
        summaryDeleteDialog.taskId,
      ),
    });
  }

  function startSplitterDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!showGrid || !showTimeline) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const clientX = getReactPointerClientX(event);
    if (!Number.isFinite(clientX)) {
      return;
    }
    const containerLeft =
      workspaceSplitRef.current?.getBoundingClientRect().left ?? 0;
    const nextGridWidth = clampGridWidth(clientX - containerLeft);
    setGridWidth(nextGridWidth);
  }

  function moveSplitter(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.buttons !== 1 || !showGrid || !showTimeline) {
      return;
    }
    const clientX = getReactPointerClientX(event);
    if (!Number.isFinite(clientX)) {
      return;
    }
    const containerLeft =
      workspaceSplitRef.current?.getBoundingClientRect().left ?? 0;
    setGridWidth(clampGridWidth(clientX - containerLeft));
  }

  function adjustSplitterWithKeyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (!showGrid || !showTimeline) {
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    setGridWidth((currentWidth) =>
      clampGridWidth(currentWidth + (event.key === "ArrowRight" ? 24 : -24)),
    );
  }

  function renderDraftGridCell(
    column: GridColumnDefinition,
    placement: DraftCreateRowPlacement,
  ) {
    if (!draftCreateRow) {
      return null;
    }

    if (column.id === "wbs") {
      return (
        <span
          className="flex h-full items-center border-r border-slate-100 px-3 font-mono text-brand"
          key={column.id}
        >
          {placement.wbs}
        </span>
      );
    }

    if (column.id === "taskTitle") {
      return (
        <div
          className="flex h-full min-w-0 items-center gap-2 border-r border-slate-100 px-3"
          key={column.id}
          style={{ paddingLeft: 12 + placement.depth * 16 }}
        >
          <span aria-hidden="true" className="w-6 shrink-0" />
          <span className="flex min-w-0 flex-1 font-medium text-slate-950">
            <InlineEditor
              error={draftCreateRow.error}
              field="taskTitle"
              onBlur={() => {}}
              onChange={(value) =>
                setDraftCreateRow((current) =>
                  current ? { ...current, error: null, title: value } : current,
                )
              }
              onKeyDown={handleDraftCreateKeyDown}
              ownerOptions={ownerOptions}
              value={draftCreateRow.title}
            />
          </span>
          <span className="rounded-sm border border-brand/20 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
            Draft
          </span>
        </div>
      );
    }

    if (column.id === "ownerId") {
      return (
        <span
          className="flex h-full min-w-0 items-center border-r border-slate-100 px-3"
          key={column.id}
        >
          <InlineEditor
            autoFocus={false}
            error={null}
            field="ownerId"
            onBlur={() => {}}
            onChange={(value) =>
              setDraftCreateRow((current) =>
                current ? { ...current, ownerId: value } : current,
              )
            }
            onKeyDown={handleDraftCreateKeyDown}
            ownerOptions={ownerOptions}
            value={draftCreateRow.ownerId}
          />
        </span>
      );
    }

    return (
      <span
        className={`flex h-full min-w-0 items-center border-r border-slate-100 px-3 text-slate-400 ${
          column.align === "right" ? "justify-end text-right" : ""
        }`}
        key={column.id}
      >
        {column.id === "plannedStartDate" || column.id === "plannedFinishDate"
          ? "Auto"
          : ""}
      </span>
    );
  }

  function renderGridCell(
    column: GridColumnDefinition,
    row: VisibleRow,
    hasChildren: boolean,
    isSummary: boolean,
    isMilestone: boolean,
    title: string,
  ) {
    const { depth, schedule, wbs } = row;
    const isCritical = isScheduleCritical(schedule);
    if (column.id === "wbs") {
      return (
        <span
          className="flex h-full cursor-move items-center border-r border-slate-100 px-3 font-mono text-slate-500"
          key={column.id}
          title="Drag to reorder"
        >
          <span aria-hidden className="mr-2 text-slate-400">
            ::
          </span>
          <span>{wbs}</span>
        </span>
      );
    }

    if (column.id === "taskTitle") {
      return (
        <div
          className="flex h-full min-w-0 items-center gap-2 border-r border-slate-100 px-3"
          key={column.id}
          style={{ paddingLeft: 12 + depth * 16 }}
        >
          {hasChildren ? (
            <DisclosureButton
              expanded={!collapsedIds.has(schedule.taskId)}
              label={title}
              onClick={() => toggleCollapse(schedule.taskId)}
            />
          ) : (
            <span aria-hidden="true" className="w-6 shrink-0" />
          )}
          <span
            className={`flex min-w-0 flex-1 text-slate-950 ${
              isSummary ? "font-bold" : "font-medium"
            }`}
            onClick={
              isEditing(editingCell, schedule.taskId, "taskTitle")
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    startEditing(schedule, "taskTitle");
                  }
            }
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
          <TypeBadge schedule={schedule} />
          {isSummary ? <ScheduleStateIcon kind="calculated" /> : null}
          {!isSummary && isCritical ? (
            <ScheduleStateIcon kind="critical" />
          ) : null}
          {canShowInlineSubtaskAction(schedule) ? (
            <button
              className="ml-auto h-7 shrink-0 rounded-md border border-dashed border-slate-300 px-2 text-[11px] font-semibold text-slate-600 transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand"
              disabled={isSaving || draftCreateRow?.isSaving}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedTaskId(schedule.taskId);
                openDraftCreateRow({
                  keepSelectedTaskId: schedule.taskId,
                  parentTaskId: schedule.taskId,
                  typeLabel: "Sub-task",
                });
              }}
              type="button"
            >
              + Add sub-task
            </button>
          ) : null}
        </div>
      );
    }

    if (column.id === "ownerId") {
      return (
        <EditableGridCell
          align="left"
          displayValue={formatOwner(schedule)}
          editingCell={editingCell}
          editError={editError}
          field="ownerId"
          key={column.id}
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
          readOnly={isReadOnlyField(schedule, "ownerId")}
          schedule={schedule}
        />
      );
    }

    if (column.id === "plannedStartDate" || column.id === "plannedFinishDate") {
      const field = column.id;
      return (
        <EditableGridCell
          displayValue={formatDateCell(schedule, field)}
          editingCell={editingCell}
          editError={editError}
          field={field}
          key={column.id}
          onBlur={() => void commitEdit()}
          onChange={(value) =>
            setEditingCell((current) =>
              current ? { ...current, value } : current,
            )
          }
          onCommitValue={(value) =>
            void commitEditValue(schedule, field, value)
          }
          onKeyDown={handleEditKeyDown}
          onStartEdit={() => startEditing(schedule, field)}
          ownerOptions={ownerOptions}
          readOnly={isReadOnlyField(schedule, field)}
          schedule={schedule}
        />
      );
    }

    if (column.id === "status") {
      return (
        <EditableGridCell
          displayValue={
            isMilestone
              ? getMilestoneState(schedule)
              : formatStatus(schedule.status ?? schedule.task?.status)
          }
          editingCell={editingCell}
          editError={editError}
          field="status"
          key={column.id}
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
          onStartEdit={() => startEditing(schedule, "status")}
          ownerOptions={ownerOptions}
          readOnly={isReadOnlyField(schedule, "status")}
          schedule={schedule}
        />
      );
    }

    if (column.id === "percentComplete") {
      return (
        <EditableGridCell
          align="right"
          displayValue={
            isMilestone
              ? getMilestoneState(schedule)
              : `${Number(schedule.percentComplete).toFixed(0)}%`
          }
          editingCell={editingCell}
          editError={editError}
          field="percentComplete"
          key={column.id}
          onBlur={() => void commitEdit()}
          onChange={(value) =>
            setEditingCell((current) =>
              current ? { ...current, value } : current,
            )
          }
          onKeyDown={handleEditKeyDown}
          onStartEdit={() => startEditing(schedule, "percentComplete")}
          ownerOptions={ownerOptions}
          readOnly={isReadOnlyField(schedule, "percentComplete")}
          schedule={schedule}
        />
      );
    }

    if (
      column.id === "earlyStart" ||
      column.id === "earlyFinish" ||
      column.id === "lateStart" ||
      column.id === "lateFinish"
    ) {
      const displayValue = formatScheduleOffset(schedule, column.id);
      return (
        <span
          aria-label={`${title} ${column.label} ${displayValue || "blank"}`}
          className="flex h-full min-w-0 items-center justify-end border-r border-slate-100 px-3 text-right"
          key={column.id}
          title={
            displayValue ||
            "Summary schedule values are calculated from descendants."
          }
        >
          <span className="truncate">{displayValue}</span>
        </span>
      );
    }

    if (column.id === "totalFloatDays" || column.id === "freeFloatDays") {
      const displayValue = formatFloatCell(schedule, column.id);
      return (
        <span
          aria-label={`${title} ${column.label} ${displayValue || "blank"}`}
          className="flex h-full min-w-0 items-center justify-end border-r border-slate-100 px-3 text-right"
          key={column.id}
          title={
            column.id === "totalFloatDays"
              ? "The amount of time this task may slip before affecting project completion."
              : "The amount of time this task may slip before delaying its successor."
          }
        >
          <span className="truncate">{displayValue}</span>
        </span>
      );
    }

    if (column.id === "critical") {
      return (
        <span
          aria-label={`${title} Critical ${!isSummary && isCritical ? "yes" : "blank"}`}
          className="flex h-full min-w-0 items-center border-r border-slate-100 px-3"
          key={column.id}
          title="This task has zero total float."
        >
          {!isSummary && isCritical ? (
            <ScheduleStateIcon kind="critical" />
          ) : null}
        </span>
      );
    }

    const displayValue =
      column.id === "priority"
        ? formatPriority(schedule)
        : `${Number(schedule.durationDays ?? 0)}d`;
    return (
      <span
        className={`flex h-full min-w-0 items-center border-r border-slate-100 px-3 ${
          column.align === "right" ? "justify-end text-right" : ""
        }`}
        key={column.id}
        title={displayValue}
      >
        <span className="truncate">{displayValue}</span>
      </span>
    );
  }

  function isScheduleCritical(schedule: ApiPlanningTaskSchedule) {
    return (
      schedule.isCritical ||
      workspace.criticalPathTaskIds.includes(schedule.taskId)
    );
  }

  return (
    <WorkspaceSection
      className="relative flex max-h-[calc(100vh-12rem)] min-h-[640px] flex-col overflow-hidden"
      onKeyDown={handleWorkspaceKeyDown}
      padding="none"
      surface="card"
    >
      <section
        aria-label="Planning toolbar"
        className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur"
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-950">
              {workspace.project.name} planning workspace
            </h2>
            <p className="truncate text-[11px] text-slate-500">
              {workspace.snapshot
                ? `Schedule v${workspace.snapshot.versionNumber}`
                : "No schedule snapshot"}{" "}
              · {workspace.snapshot?.projectStartDate ?? "Unscheduled"} to{" "}
              {workspace.snapshot?.projectFinishDate ?? "Unscheduled"}
            </p>
          </div>
          <StatusBadge
            aria-live="polite"
            className="shrink-0"
            dot
            size="sm"
            tone={isSaving ? "warning" : "success"}
          >
            {isSaving ? "Saving…" : "Plan current"}
          </StatusBadge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <ToolbarGroup label="Create">
            <span className="relative" ref={addMenu.containerRef}>
              <button
                aria-expanded={addMenu.isOpen}
                aria-haspopup="menu"
                className={toolbarButtonClassName}
                disabled={isSaving}
                onClick={addMenu.toggle}
                ref={addMenu.triggerRef}
                type="button"
              >
                Add <span aria-hidden>▾</span>
              </button>
              {addMenu.isOpen ? (
                <span
                  className="absolute left-0 top-9 z-30 w-56 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg"
                  role="menu"
                >
                  <AddMenuButton
                    icon={<TaskTypeIcon taskKind="standard" />}
                    label="Task"
                    onClick={() => {
                      openDraftCreateRow({
                        keepSelectedTaskId:
                          selectedSchedule?.taskKind === "summary"
                            ? selectedSchedule.taskId
                            : undefined,
                        parentTaskId: getAddTaskParentTaskId(),
                        typeLabel: "Task",
                      });
                    }}
                  />
                  <AddMenuButton
                    icon={<TaskTypeIcon taskKind="summary" />}
                    label="Summary"
                    onClick={() =>
                      void createTask({
                        parentTaskId: selectedSchedule?.parentTaskId ?? null,
                        taskType: "summary",
                      })
                    }
                  />
                  <span className="mt-1 block border-t border-slate-100 px-2 pb-1 pt-2 text-[11px] font-bold uppercase text-slate-500">
                    Milestone
                  </span>
                  {milestoneCategories.map(({ category, label }) => (
                    <AddMenuButton
                      icon={<MilestoneCategoryIcon category={category} />}
                      key={category}
                      label={label}
                      onClick={() =>
                        void createTask({
                          milestoneCategory: category,
                          parentTaskId: selectedSchedule?.parentTaskId ?? null,
                          taskType: "milestone",
                        })
                      }
                    />
                  ))}
                </span>
              ) : null}
            </span>
            <button
              aria-label="Delete selected task"
              className={toolbarButtonClassName}
              disabled={!selectedSchedule || isSaving}
              onClick={() => void deleteSelectedTask()}
              title={
                selectedSchedule
                  ? selectedSchedule.taskKind === "summary" &&
                    selectedTaskChildren.length > 0
                    ? "Delete this Summary and choose what to do with its child items."
                    : `Delete ${getTaskTitle(selectedSchedule)}`
                  : "Select a row to delete."
              }
              type="button"
            >
              <CommandIcon name="delete" />
              <span className="hidden 2xl:inline">Delete</span>
            </button>
          </ToolbarGroup>
          <ToolbarGroup label="Structure">
            <span className="relative" ref={structureMenu.containerRef}>
              <button
                aria-expanded={structureMenu.isOpen}
                aria-haspopup="menu"
                className={toolbarButtonClassName}
                onClick={structureMenu.toggle}
                ref={structureMenu.triggerRef}
                type="button"
              >
                <CommandIcon name="structure" />
                Structure <span aria-hidden>▾</span>
              </button>
              {structureMenu.isOpen ? (
                <span
                  className="absolute left-0 top-9 z-30 w-52 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg"
                  onClick={structureMenu.onMenuClick}
                  role="menu"
                >
                  <StructureMenuButton
                    disabled={!canMoveSelectionUp || isSaving}
                    label="Move Up"
                    onClick={() => {
                      structureMenu.close();
                      void moveSelectedTask("up");
                    }}
                    shortcut="Alt+Shift+↑"
                  />
                  <StructureMenuButton
                    disabled={!canMoveSelectionDown || isSaving}
                    label="Move Down"
                    onClick={() => {
                      structureMenu.close();
                      void moveSelectedTask("down");
                    }}
                    shortcut="Alt+Shift+↓"
                  />
                  <StructureMenuButton
                    disabled={!canMoveSelectionToParent || isSaving}
                    label="Move to Parent"
                    onClick={() => {
                      structureMenu.close();
                      void moveSelectionToParent();
                    }}
                    shortcut="Alt+Shift+←"
                  />
                  <StructureMenuButton
                    disabled={!canMoveSelectionToSummary || isSaving}
                    label="Move to Summary..."
                    onClick={() => {
                      structureMenu.close();
                      openMoveToSummaryDialog();
                    }}
                  />
                  <span className="my-1 block border-t border-slate-100" />
                  <StructureMenuButton
                    disabled={
                      selectedSchedule?.taskKind !== "summary" ||
                      !onDuplicateWorkPackage ||
                      isSaving
                    }
                    label="Duplicate Work Package..."
                    onClick={() => {
                      structureMenu.close();
                      if (selectedSchedule) {
                        openDuplicateWorkPackageDialog(selectedSchedule);
                      }
                    }}
                    shortcut="⌘⇧D"
                  />
                  <StructureMenuButton
                    disabled={
                      duplicateUndoStack.length === 0 ||
                      !onRemoveDuplicatedWorkPackage ||
                      isSaving
                    }
                    label="Undo Duplicate"
                    onClick={() => {
                      structureMenu.close();
                      void undoDuplicateWorkPackage();
                    }}
                    shortcut="⌘Z"
                  />
                  <StructureMenuButton
                    disabled={
                      duplicateRedoStack.length === 0 ||
                      !onDuplicateWorkPackage ||
                      isSaving
                    }
                    label="Redo Duplicate"
                    onClick={() => {
                      structureMenu.close();
                      void redoDuplicateWorkPackage();
                    }}
                    shortcut="⌘⇧Z"
                  />
                  <span className="my-1 block border-t border-slate-100" />
                  <StructureMenuButton
                    disabled={!hasSummaryTasks}
                    label="Expand All"
                    onClick={() => {
                      structureMenu.close();
                      expandAll();
                    }}
                  />
                  <StructureMenuButton
                    disabled={!hasSummaryTasks}
                    label="Collapse All"
                    onClick={() => {
                      structureMenu.close();
                      collapseAll();
                    }}
                  />
                </span>
              ) : null}
            </span>
          </ToolbarGroup>
          <ToolbarGroup label="Schedule">
            <button
              className={toolbarButtonClassName}
              disabled={isSaving}
              onClick={() => void onRegenerateWorkspace()}
              type="button"
            >
              <CommandIcon name="refresh" />
              {workspace.snapshot?.id
                ? "Regenerate Snapshot"
                : "Create Snapshot"}
            </button>
            <button
              className={toolbarButtonClassName}
              onClick={scrollToDependencies}
              type="button"
            >
              <CommandIcon name="link" />
              Dependencies
            </button>
          </ToolbarGroup>
          <ToolbarGroup label="Time">
            <button
              className={toolbarButtonClassName}
              onClick={scrollToToday}
              type="button"
            >
              Today
            </button>
            <button
              aria-label="Zoom Out"
              className={toolbarButtonClassName}
              disabled={!canZoomOut}
              onClick={() => changeZoom("out")}
              title="Zoom Out"
              type="button"
            >
              <CommandIcon name="zoom-out" />
            </button>
            <button
              aria-label="Zoom In"
              className={toolbarButtonClassName}
              disabled={!canZoomIn}
              onClick={() => changeZoom("in")}
              title="Zoom In"
              type="button"
            >
              <CommandIcon name="zoom-in" />
            </button>
            <button
              aria-label="Fit to Project"
              className={toolbarButtonClassName}
              onClick={fitToProject}
              type="button"
            >
              <CommandIcon name="fit" />
              <span className="hidden xl:inline">Fit</span>
            </button>
            <label className="sr-only" htmlFor="planning-time-scale">
              Time Scale
            </label>
            <select
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              id="planning-time-scale"
              onChange={(event) => {
                setFitTimelineWidth(null);
                setZoom(event.target.value as ZoomMode);
              }}
              value={zoom}
            >
              {zoomModes.map((mode) => (
                <option key={mode} value={mode}>
                  {zoomLabels[mode]}
                </option>
              ))}
            </select>
          </ToolbarGroup>
          <ToolbarGroup label="View">
            <span className="relative" ref={viewMenu.containerRef}>
              <button
                aria-expanded={viewMenu.isOpen}
                aria-haspopup="menu"
                className={toolbarButtonClassName}
                onClick={viewMenu.toggle}
                ref={viewMenu.triggerRef}
                type="button"
              >
                View <span aria-hidden>▾</span>
              </button>
              {viewMenu.isOpen ? (
                <span
                  className="absolute right-0 top-9 z-30 w-44 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg"
                  onClick={viewMenu.onMenuClick}
                  role="menu"
                >
                  {[
                    ["split", "Grid + Timeline"],
                    ["grid", "Grid Only"],
                    ["timeline", "Timeline Only"],
                  ].map(([mode, label]) => (
                    <button
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-50"
                      key={mode}
                      onClick={() => {
                        setViewMode(mode as PlanningViewMode);
                        viewMenu.close();
                      }}
                      role="menuitemradio"
                      aria-checked={viewMode === mode}
                      type="button"
                    >
                      <span>{label}</span>
                      <span aria-hidden>{viewMode === mode ? "*" : ""}</span>
                    </button>
                  ))}
                  <span className="my-1 block border-t border-slate-100" />
                  <button
                    aria-checked={showCriticalPath}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      setShowCriticalPath((isVisible) => !isVisible)
                    }
                    role="menuitemcheckbox"
                    type="button"
                  >
                    <span>Show Critical Path</span>
                    <span aria-hidden>{showCriticalPath ? "*" : ""}</span>
                  </button>
                  <button
                    aria-checked={showFloatColumns}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={toggleFloatColumns}
                    role="menuitemcheckbox"
                    type="button"
                  >
                    <span>Show Float Columns</span>
                    <span aria-hidden>{showFloatColumns ? "*" : ""}</span>
                  </button>
                </span>
              ) : null}
            </span>
            <span className="relative" ref={columnsMenu.containerRef}>
              <button
                aria-expanded={columnsMenu.isOpen}
                aria-haspopup="menu"
                className={toolbarButtonClassName}
                disabled={!showGrid}
                onClick={columnsMenu.toggle}
                ref={columnsMenu.triggerRef}
                type="button"
              >
                Columns <span aria-hidden>▾</span>
              </button>
              {columnsMenu.isOpen ? (
                <span
                  className="absolute right-0 top-9 z-30 w-48 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-lg"
                  onClick={columnsMenu.onMenuClick}
                  role="menu"
                >
                  {optionalGridColumns.map((column) => {
                    const checked =
                      !isCompactViewport &&
                      visibleOptionalColumnIds.includes(column.id);
                    return (
                      <label
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                        key={column.id}
                      >
                        <input
                          checked={checked}
                          disabled={isCompactViewport}
                          onChange={() => toggleOptionalColumn(column.id)}
                          type="checkbox"
                        />
                        <span>{column.label}</span>
                      </label>
                    );
                  })}
                  <button
                    className="mt-1 w-full rounded border-t border-slate-100 px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={restoreDefaultColumns}
                    role="menuitem"
                    type="button"
                  >
                    Restore Defaults
                  </button>
                </span>
              ) : null}
            </span>
            <KeyboardHelp />
          </ToolbarGroup>
        </div>
        {hierarchyError ? (
          <InfoCard
            className="mt-3"
            role="alert"
            title="Planning structure requires attention"
            tone="warning"
          >
            {hierarchyError}
          </InfoCard>
        ) : null}
      </section>

      <section
        aria-label="Scrollable planning workspace"
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white"
        ref={verticalScrollRef}
      >
        <div className="flex min-h-full flex-col 2xl:flex-row">
          <div className="min-w-0 flex-1">
            <div
              aria-label="Planning split workspace"
              className="flex min-h-[560px] min-w-0"
              data-grid-width={Math.round(gridWidth)}
              data-view-mode={viewMode}
              ref={workspaceSplitRef}
            >
              {showGrid ? (
                <div
                  aria-label="Frozen planning grid"
                  className="min-w-0 overflow-x-auto border-r border-slate-200"
                  style={{
                    flex: showTimeline ? `0 0 ${gridWidth}px` : "1 1 auto",
                    width: showTimeline ? gridWidth : "100%",
                  }}
                >
                  <div
                    className="sticky top-0 z-10 grid items-center border-b border-slate-300 bg-slate-50 text-xs font-bold uppercase text-slate-600"
                    style={{
                      gridTemplateColumns,
                      height: headerHeight,
                      width: gridContentWidth,
                    }}
                  >
                    {visibleColumns.map((column) => (
                      <span
                        className={`h-full border-r border-slate-200 px-3 py-3 ${
                          column.align === "right" ? "text-right" : ""
                        }`}
                        key={column.id}
                      >
                        {column.label}
                      </span>
                    ))}
                  </div>
                  {displayRows.map((displayRow) => {
                    if (displayRow.kind === "draft") {
                      const { placement } = displayRow;
                      return (
                        <div
                          aria-label={`Draft planning row ${placement.wbs} ${draftCreateRow?.typeLabel ?? "Task"}`}
                          className="grid items-center border-b border-brand/20 bg-brand/5 text-xs text-slate-700 shadow-[inset_3px_0_0_#0f766e]"
                          key="draft-create-row"
                          role="row"
                          style={{
                            gridTemplateColumns,
                            height: rowHeight,
                            width: gridContentWidth,
                          }}
                        >
                          {visibleColumns.map((column) =>
                            renderDraftGridCell(column, placement),
                          )}
                        </div>
                      );
                    }
                    const row = displayRow.row;
                    const { schedule, wbs } = row;
                    const hasChildren = localSchedules.some(
                      (candidate) => candidate.parentTaskId === schedule.taskId,
                    );
                    const title = getTaskTitle(schedule);
                    const isSummary = schedule.taskKind === "summary";
                    const isMilestone = schedule.taskKind === "milestone";
                    return (
                      <div
                        aria-label={`Planning row ${wbs} ${title}`}
                        aria-selected={selectedTaskId === schedule.taskId}
                        className={`grid items-center border-b border-slate-100 text-xs text-slate-700 transition hover:bg-slate-50 ${
                          isSummary
                            ? "bg-slate-50 font-semibold text-slate-800"
                            : isMilestone
                              ? "bg-white text-slate-700"
                              : ""
                        } ${
                          selectedTaskId === schedule.taskId
                            ? "bg-brand/10 shadow-[inset_3px_0_0_#0f766e] ring-1 ring-inset ring-brand/30"
                            : ""
                        }`}
                        draggable={!editingCell}
                        key={schedule.taskId}
                        onClick={() => {
                          setSelectedTaskId(schedule.taskId);
                          setHierarchyError(null);
                        }}
                        onContextMenu={(event) => {
                          if (schedule.taskKind !== "summary") {
                            return;
                          }
                          event.preventDefault();
                          setSelectedTaskId(schedule.taskId);
                          setWorkPackageContextMenu({
                            sourceTaskId: schedule.taskId,
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        onDragEnd={() => setRowDragState(null)}
                        onDragOver={(event) =>
                          handleRowDragOver(event, schedule)
                        }
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
                          gridTemplateColumns,
                          height: rowHeight,
                          width: gridContentWidth,
                        }}
                        tabIndex={0}
                      >
                        {visibleColumns.map((column) =>
                          renderGridCell(
                            column,
                            row,
                            hasChildren,
                            isSummary,
                            isMilestone,
                            title,
                          ),
                        )}
                      </div>
                    );
                  })}
                  {displayRows.length === 0 ? (
                    <EmptyState
                      compact
                      description="Add a task to start building the project WBS."
                      style={{ width: gridContentWidth }}
                      title="No Tasks"
                    />
                  ) : null}
                </div>
              ) : null}

              {showGrid && showTimeline ? (
                <button
                  aria-label="Resize planning panes"
                  aria-orientation="vertical"
                  aria-valuemax={maxGridWidth}
                  aria-valuemin={minGridWidth}
                  aria-valuenow={Math.round(gridWidth)}
                  className="z-10 w-2 shrink-0 cursor-col-resize border-x border-slate-200 bg-slate-100 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-brand"
                  onKeyDown={adjustSplitterWithKeyboard}
                  onPointerDown={startSplitterDrag}
                  onPointerMove={moveSplitter}
                  role="separator"
                  title="Resize planning panes"
                  type="button"
                />
              ) : null}

              {showTimeline ? (
                <div
                  aria-label="Scrollable timeline pane"
                  className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
                  ref={timelineScrollRef}
                >
                  <div
                    data-testid="timeline-scroll-surface"
                    style={{
                      minWidth: totalWidth,
                      width: totalWidth,
                    }}
                  >
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
                          <text
                            fill="#64748b"
                            fontSize="11"
                            x={tick.x + 6}
                            y={26}
                          >
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

                      {displayRows.map((displayRow, index) => {
                        if (displayRow.kind === "draft") {
                          return (
                            <g key="draft-create-row">
                              <line
                                stroke="#ccfbf1"
                                x1={0}
                                x2={totalWidth}
                                y1={headerHeight + (index + 1) * rowHeight}
                                y2={headerHeight + (index + 1) * rowHeight}
                              />
                            </g>
                          );
                        }
                        const { schedule } = displayRow.row;
                        const title = getTaskTitle(schedule);
                        const y = headerHeight + index * rowHeight + 12;
                        const geometry = getBarGeometry(schedule, timeline);
                        const isCritical = isScheduleCritical(schedule);
                        const shouldRenderScheduleBar =
                          !showCriticalPath ||
                          schedule.taskKind === "summary" ||
                          (schedule.taskKind === "milestone" && isCritical) ||
                          (schedule.taskKind === "standard" && isCritical);
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
                            {geometry && shouldRenderScheduleBar ? (
                              schedule.taskKind === "milestone" ? (
                                <rect
                                  aria-label={`Milestone ${title}`}
                                  fill={getMilestoneFill(schedule, isCritical)}
                                  height={16}
                                  onPointerDown={(event) =>
                                    startDrag(event, schedule, "move")
                                  }
                                  style={{ cursor: "grab" }}
                                  stroke={
                                    selectedTaskId === schedule.taskId
                                      ? "#0f172a"
                                      : "none"
                                  }
                                  strokeWidth={
                                    selectedTaskId === schedule.taskId ? 2 : 0
                                  }
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
                                        ? "#64748b"
                                        : isCritical
                                          ? "#dc2626"
                                          : "#0f766e"
                                    }
                                    stroke={
                                      selectedTaskId === schedule.taskId
                                        ? "#0f172a"
                                        : isCritical
                                          ? "#7f1d1d"
                                          : "none"
                                    }
                                    strokeWidth={
                                      isCritical ||
                                      selectedTaskId === schedule.taskId
                                        ? 2
                                        : 0
                                    }
                                    height={barHeight}
                                    opacity={
                                      schedule.taskKind === "summary" ? 0.65 : 1
                                    }
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
                                    opacity={
                                      schedule.taskKind === "summary"
                                        ? 0.35
                                        : 0.75
                                    }
                                    rx={3}
                                    width={Math.max(
                                      0,
                                      geometry.width *
                                        (Number(schedule.percentComplete) /
                                          100),
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
                            {shouldRenderScheduleBar
                              ? allocations.map(
                                  (allocation, allocationIndex) => {
                                    const allocationY =
                                      y +
                                      barHeight +
                                      3 +
                                      allocationIndex * resourceHeight;
                                    return (
                                      <g key={allocation.id}>
                                        <rect
                                          fill={allocationColor(
                                            allocation.allocationPercent,
                                          )}
                                          height={12}
                                          rx={2}
                                          width={Math.max(
                                            48,
                                            Number(
                                              allocation.allocationPercent,
                                            ),
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
                                  },
                                )
                              : null}
                          </g>
                        );
                      })}

                      {workspace.dependencies.map((dependency) => {
                        const line = getDependencyLine(
                          dependency,
                          displayRows,
                          timeline,
                        );
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
              ) : null}
            </div>

            <section
              className="m-3 grid gap-4 rounded-ui border border-ui-border bg-ui-surface p-4 shadow-ui-subtle lg:grid-cols-[1fr_1fr]"
              ref={dependencySectionRef}
            >
              <form
                className="grid gap-3 sm:grid-cols-4"
                onSubmit={submitDependency}
              >
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
                      <option
                        key={row.schedule.taskId}
                        value={row.schedule.taskId}
                      >
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
                      <option
                        key={row.schedule.taskId}
                        value={row.schedule.taskId}
                      >
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
                        dependencyType: event.target.value as
                          | "FS"
                          | "SS"
                          | "FF",
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
                        {taskName(dependency.predecessorTaskId, localSchedules)}{" "}
                        → {taskName(dependency.successorTaskId, localSchedules)}{" "}
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
          <PlanningDetailPanel
            allocations={selectedAllocations}
            isCritical={Boolean(
              selectedSchedule && isScheduleCritical(selectedSchedule),
            )}
            predecessorCount={selectedPredecessorCount}
            schedule={selectedSchedule}
            successorCount={selectedSuccessorCount}
            wbs={selectedRow?.wbs}
          />
        </div>
      </section>

      {workPackageContextMenu ? (
        <div
          aria-label="Summary Task actions"
          className="fixed z-50 w-60 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-xl"
          onClick={workPackageMenu.onMenuClick}
          onPointerDown={(event) => event.stopPropagation()}
          ref={workPackageMenu.containerRef}
          role="menu"
          style={{
            left: Math.min(workPackageContextMenu.x, window.innerWidth - 256),
            top: Math.min(workPackageContextMenu.y, window.innerHeight - 80),
          }}
        >
          <button
            className="flex w-full items-center justify-between rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={!onDuplicateWorkPackage || isSaving}
            onClick={() => {
              const sourceSchedule = localSchedules.find(
                (schedule) =>
                  schedule.taskId === workPackageContextMenu.sourceTaskId,
              );
              if (sourceSchedule) {
                openDuplicateWorkPackageDialog(sourceSchedule);
              }
            }}
            role="menuitem"
            type="button"
          >
            <span>Duplicate Work Package...</span>
            <span aria-hidden className="text-[10px] text-slate-400">
              ⌘⇧D
            </span>
          </button>
        </div>
      ) : null}

      {duplicateWorkPackageDialog ? (
        <DialogBackdrop>
          <DialogPanel title="Duplicate Work Package">
            <label className="block text-sm font-semibold text-slate-700">
              New Summary Name <span aria-hidden="true">*</span>
              <input
                autoFocus
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                maxLength={255}
                onChange={(event) =>
                  setDuplicateWorkPackageDialog((current) =>
                    current
                      ? {
                          ...current,
                          input: {
                            ...current.input,
                            newSummaryName: event.target.value,
                          },
                        }
                      : current,
                  )
                }
                required
                value={duplicateWorkPackageDialog.input.newSummaryName}
              />
            </label>
            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-bold uppercase text-slate-500">
                Copy options
              </legend>
              {duplicateOptionDefinitions.map((option) => (
                <label
                  className="flex min-h-8 items-start gap-2 text-sm text-slate-700"
                  key={option.key}
                >
                  <input
                    checked={Boolean(
                      duplicateWorkPackageDialog.input[option.key],
                    )}
                    className="mt-0.5 size-4"
                    onChange={(event) =>
                      setDuplicateWorkPackageDialog((current) =>
                        current
                          ? {
                              ...current,
                              input: {
                                ...current.input,
                                [option.key]: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              <label
                className="flex min-h-8 items-start gap-2 text-sm text-slate-400"
                title="Planning tasks do not currently store checklists."
              >
                <input
                  checked
                  disabled
                  className="mt-0.5 size-4"
                  readOnly
                  type="checkbox"
                />
                <span>Preserve checklists (when available)</span>
              </label>
              {unsupportedDuplicateOptions.map((label) => (
                <label
                  className="flex min-h-8 items-start gap-2 text-sm text-slate-400"
                  key={label}
                  title="This content type is not currently stored on Planning tasks."
                >
                  <input disabled className="mt-0.5 size-4" type="checkbox" />
                  <span>{label} (not available)</span>
                </label>
              ))}
            </fieldset>
            <p className="mt-2 text-xs text-slate-500">
              Only dependencies whose predecessor and successor are both copied
              will be preserved. Audit history is never copied.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className={toolbarButtonClassName}
                onClick={() => setDuplicateWorkPackageDialog(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-white disabled:opacity-50"
                disabled={
                  isSaving ||
                  !duplicateWorkPackageDialog.input.newSummaryName.trim()
                }
                onClick={() => void confirmDuplicateWorkPackage()}
                type="button"
              >
                Duplicate
              </button>
            </div>
          </DialogPanel>
        </DialogBackdrop>
      ) : null}

      {summaryDeleteDialog ? (
        <DialogBackdrop>
          <DialogPanel title="Delete Summary">
            <p className="text-sm text-slate-700">
              This Summary contains child items.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={toolbarButtonClassName}
                onClick={() => void deleteSummaryAndMoveChildrenToParent()}
                type="button"
              >
                Move children to parent
              </button>
              <button
                className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                onClick={() => void deleteSummaryAndDescendants()}
                type="button"
              >
                Delete Summary and all descendants
              </button>
              <button
                className={toolbarButtonClassName}
                onClick={() => setSummaryDeleteDialog(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </DialogBackdrop>
      ) : null}

      {moveToSummaryState ? (
        <DialogBackdrop>
          <DialogPanel title="Move to Summary">
            <label className="block text-sm font-semibold text-slate-700">
              Destination Summary
              <select
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) =>
                  setMoveToSummaryState((current) =>
                    current
                      ? {
                          ...current,
                          destinationTaskId: event.target.value,
                        }
                      : current,
                  )
                }
                value={moveToSummaryState.destinationTaskId}
              >
                {moveToSummaryOptions.map((option) => (
                  <option key={option.taskId} value={option.taskId}>
                    {option.wbs} {option.taskTitle}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={toolbarButtonClassName}
                onClick={() => void confirmMoveToSummary()}
                type="button"
              >
                Move
              </button>
              <button
                className={toolbarButtonClassName}
                onClick={() => setMoveToSummaryState(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </DialogBackdrop>
      ) : null}

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
        <span>{localSchedules.length} Tasks</span>
        <span>{summaryTaskIds.size} Summary Tasks</span>
        <span>{milestoneCount} Milestones</span>
        <span>Zoom: {zoomLabels[zoom]}</span>
        <span>Visible Tasks: {rows.length}</span>
      </footer>
    </WorkspaceSection>
  );
}

function clampGridWidth(width: number) {
  return Math.min(maxGridWidth, Math.max(minGridWidth, Math.round(width)));
}

function isKeyboardInputTarget(target: EventTarget) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.matches("button, input, select, textarea, [role='menuitem']"))
  );
}

function buildGridTemplateColumns(
  columns: GridColumnDefinition[],
  contentWidth: number,
) {
  const fixedWidth = columns
    .filter((column) => column.id !== "taskTitle")
    .reduce((width, column) => width + column.minWidth, 0);
  const taskTitleWidth = Math.max(300, contentWidth - fixedWidth);
  return columns
    .map((column) =>
      column.id === "taskTitle"
        ? `${taskTitleWidth}px`
        : `${column.minWidth}px`,
    )
    .join(" ");
}

function readPreference(key: string) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the workspace remains usable without persisted preferences.
  }
}

function readNumberPreference(key: string, fallback: number) {
  const preference = readPreference(key);
  if (preference === null) {
    return fallback;
  }
  const value = Number(preference);
  return Number.isFinite(value) ? clampGridWidth(value) : fallback;
}

function readZoomPreference(): ZoomMode {
  const value = readPreference(preferenceKeys.zoom);
  return zoomModes.includes(value as ZoomMode) ? (value as ZoomMode) : "week";
}

function readViewModePreference(): PlanningViewMode {
  const value = readPreference(preferenceKeys.viewMode);
  return value === "grid" || value === "timeline" || value === "split"
    ? value
    : "split";
}

function readBooleanPreference(key: string) {
  return readPreference(key) === "true";
}

function getDuplicatedSummaryTaskIds(result: ApiDuplicateWorkPackageResult) {
  const copiedTaskIds = new Set(result.copiedTaskIds);
  const duplicateSummaryTaskIds = new Set<string>();
  for (const schedule of result.workspace.schedules) {
    if (copiedTaskIds.has(schedule.taskId) && schedule.taskKind === "summary") {
      duplicateSummaryTaskIds.add(schedule.taskId);
    }
  }
  duplicateSummaryTaskIds.add(result.newSummaryTaskId);
  return [...duplicateSummaryTaskIds];
}

function readVisibleColumnPreference(): GridColumnId[] {
  const value = readPreference(preferenceKeys.columns);
  if (!value) {
    return [];
  }
  const optionalColumnIds = new Set(
    optionalGridColumns.map((column) => column.id),
  );
  return value
    .split(",")
    .filter((columnId): columnId is GridColumnId =>
      optionalColumnIds.has(columnId as GridColumnId),
    );
}

function mergeColumnIds(
  currentColumnIds: GridColumnId[],
  nextColumnIds: GridColumnId[],
) {
  return [...new Set([...currentColumnIds, ...nextColumnIds])];
}

function getPointerClientX(event: React.PointerEvent<SVGElement>) {
  const nativeClientX = (event.nativeEvent as PointerEvent | MouseEvent)
    .clientX;
  return Number.isFinite(event.clientX) ? event.clientX : nativeClientX;
}

function getReactPointerClientX(event: React.PointerEvent<HTMLElement>) {
  const nativeClientX = (event.nativeEvent as PointerEvent | MouseEvent)
    .clientX;
  return Number.isFinite(event.clientX) ? event.clientX : nativeClientX;
}

function StructureMenuButton({
  disabled = false,
  label,
  onClick,
  shortcut,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <span>{label}</span>
      {shortcut ? (
        <span
          aria-hidden="true"
          className="text-[10px] font-medium text-slate-400"
        >
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

function CommandIcon({
  name,
}: {
  name:
    | "delete"
    | "fit"
    | "link"
    | "refresh"
    | "structure"
    | "zoom-in"
    | "zoom-out";
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    delete: (
      <>
        <path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M6.5 7l1 14h9l1-14" />
      </>
    ),
    fit: <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />,
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5" />
      </>
    ),
    structure: (
      <>
        <path d="M6 5h12M6 12h8M6 19h12" />
        <path d="m15 9 3 3-3 3" />
      </>
    ),
    "zoom-in": (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" />
      </>
    ),
    "zoom-out": (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5M7.5 10.5h6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

function DialogBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/20 px-4">
      {children}
    </div>
  );
}

function DialogPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function AddMenuButton({
  disabled = false,
  icon,
  label,
  onClick,
  title,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
      title={title}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TypeBadge({ schedule }: { schedule: ApiPlanningTaskSchedule }) {
  const typeLabel = getTypeLabel(schedule);
  const tooltip = getTypeTooltip(schedule);

  return (
    <span
      aria-label={`Task type: ${typeLabel}`}
      className={`inline-flex size-6 shrink-0 items-center justify-center rounded border ${
        schedule.taskKind === "summary"
          ? "border-slate-300 bg-slate-100 text-slate-700"
          : schedule.taskKind === "milestone"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-teal-200 bg-teal-50 text-teal-800"
      }`}
      title={tooltip}
    >
      {schedule.taskKind === "milestone" ? (
        <MilestoneCategoryIcon category={getMilestoneCategory(schedule)} />
      ) : (
        <TaskTypeIcon taskKind={schedule.taskKind} />
      )}
    </span>
  );
}

function ScheduleStateIcon({ kind }: { kind: "calculated" | "critical" }) {
  const isCritical = kind === "critical";
  const label = isCritical
    ? "Critical task: zero total float"
    : "Calculated from child work";

  return (
    <span
      aria-label={label}
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
        isCritical ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-700"
      }`}
      role="img"
      title={label}
    >
      {isCritical ? "!" : "∑"}
    </span>
  );
}

function TaskTypeIcon({
  taskKind,
}: {
  taskKind: ApiPlanningTaskSchedule["taskKind"];
}) {
  if (taskKind === "summary") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-slate-600"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M3 7.5h7l1.6 2H21v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V7.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M3 7.5V6a1.5 1.5 0 0 1 1.5-1.5h5l1.6 2H21"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (taskKind === "milestone") {
    return <MilestoneCategoryIcon category="standard" />;
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-teal-700"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 7h10M7 12h10M7 17h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <rect
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="14"
        x="5"
        y="3"
      />
    </svg>
  );
}

function MilestoneCategoryIcon({
  category,
}: {
  category: ApiMilestoneCategory;
}) {
  if (category === "release") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-indigo-700"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3c3.2 1.8 5.1 4.6 5.8 8.4l-5.8 5.8-5.8-5.8C6.9 7.6 8.8 4.8 12 3Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M9 18l-3 3M15 18l3 3M12 8.5h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (category === "drop") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-sky-700"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="m4 8.5 8 4.5 8-4.5M12 13v7"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (category === "go_live") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-emerald-700"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 21V4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M6 5h10l-1.5 3L16 11H6"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (category === "decision") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-purple-700"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="m5 13 4 4L19 7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
        <path
          d="M4 20h16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-amber-700"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z" />
    </svg>
  );
}

function KeyboardHelp() {
  const dropdown = useDropdownMenu<HTMLSpanElement>();

  return (
    <span className="relative" ref={dropdown.containerRef}>
      <button
        aria-expanded={dropdown.isOpen}
        aria-label="Keyboard help"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
        onClick={dropdown.toggle}
        ref={dropdown.triggerRef}
        type="button"
      >
        ?
      </button>
      {dropdown.isOpen ? (
        <span className="absolute right-0 top-9 z-30 w-64 rounded-md border border-slate-200 bg-white p-3 text-left text-xs text-slate-600 shadow-lg">
          <span className="block font-semibold text-slate-900">
            Keyboard Shortcuts
          </span>
          <span className="mt-2 block">Arrow Left: collapse summary task</span>
          <span className="block">Arrow Right: expand summary task</span>
          <span className="block">Enter or Space: select row</span>
          <span className="block">Enter: save inline edit</span>
          <span className="block">Escape: cancel inline edit</span>
          <span className="block">
            Cmd/Ctrl + Shift + D: duplicate selected Summary
          </span>
          <span className="block">Cmd/Ctrl + Z: undo duplicate</span>
          <span className="block">Cmd/Ctrl + Shift + Z: redo duplicate</span>
          <span className="block">
            Tab: save and move to next editable cell
          </span>
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
  readOnly = false,
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
  readOnly?: boolean;
  schedule: ApiPlanningTaskSchedule;
}) {
  const editing = isEditing(editingCell, schedule.taskId, field);
  const title = readOnly ? getReadOnlyTooltip(schedule, field) : displayValue;
  return (
    <span
      className={`flex h-full min-w-0 items-center border-r border-slate-100 px-3 ${
        align === "right" ? "justify-end text-right" : ""
      } ${readOnly ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""}`}
      onClick={
        readOnly || editing
          ? undefined
          : (event) => {
              event.stopPropagation();
              onStartEdit();
            }
      }
      title={title}
    >
      {editing && !readOnly ? (
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
  autoFocus = true,
  error,
  field,
  onBlur,
  onChange,
  onCommitValue,
  onKeyDown,
  ownerOptions,
  value,
}: {
  autoFocus?: boolean;
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
    autoFocus,
    className,
    onClick: (event: React.MouseEvent<HTMLElement>) => event.stopPropagation(),
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

function isReadOnlyField(
  schedule: ApiPlanningTaskSchedule,
  field: EditableField,
) {
  if (field === "ownerId" && schedule.taskKind !== "standard") {
    return true;
  }
  if (schedule.taskKind === "summary") {
    return field !== "taskTitle";
  }
  if (
    schedule.taskKind === "milestone" &&
    (field === "plannedFinishDate" ||
      field === "durationDays" ||
      field === "percentComplete" ||
      field === "status")
  ) {
    return true;
  }
  return false;
}

function getReadOnlyTooltip(
  schedule: ApiPlanningTaskSchedule,
  field: EditableField,
) {
  if (schedule.taskKind === "summary") {
    return "Calculated from child work.";
  }
  if (schedule.taskKind === "milestone" && field === "plannedFinishDate") {
    return "Zero-duration scheduling event.";
  }
  if (schedule.taskKind === "milestone" && field === "durationDays") {
    return "Milestones always have zero duration.";
  }
  if (schedule.taskKind === "milestone" && field === "percentComplete") {
    return "Milestone completion is determined by scheduling state.";
  }
  if (schedule.taskKind === "milestone" && field === "status") {
    return "Milestones use event state instead of task workflow status.";
  }
  return "";
}

function formatDateCell(
  schedule: ApiPlanningTaskSchedule,
  field: "plannedStartDate" | "plannedFinishDate",
) {
  if (schedule.taskKind === "milestone" && field === "plannedStartDate") {
    return formatShortDate(schedule.plannedStartDate);
  }
  if (schedule.taskKind === "milestone" && field === "plannedFinishDate") {
    return "Same date";
  }
  return formatShortDate(
    field === "plannedStartDate"
      ? schedule.plannedStartDate
      : schedule.plannedFinishDate,
  );
}

function formatScheduleOffset(
  schedule: ApiPlanningTaskSchedule,
  field: "earlyStart" | "earlyFinish" | "lateStart" | "lateFinish",
) {
  if (schedule.taskKind === "summary") {
    return "";
  }
  const value = schedule[field];
  return typeof value === "number" ? String(value) : "";
}

function formatFloatCell(
  schedule: ApiPlanningTaskSchedule,
  field: "totalFloatDays" | "freeFloatDays",
) {
  if (schedule.taskKind === "summary") {
    return "";
  }
  const value = schedule[field];
  return typeof value === "number" ? `${value}d` : "";
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
    if (schedule.taskKind !== "milestone") {
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

function buildEditPayload(
  editingCell: EditingCell,
): Parameters<PlanningWorkspaceProps["onUpdateSchedule"]>[1] {
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
  const dragged = schedules.find(
    (schedule) => schedule.taskId === draggedTaskId,
  );
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

function reorderScheduleByDirection(
  schedules: ApiPlanningTaskSchedule[],
  taskId: string,
  direction: "up" | "down",
) {
  const siblingContext = getSiblingContext(schedules, taskId);
  if (!siblingContext) {
    return null;
  }

  const targetTaskId =
    direction === "up"
      ? siblingContext.previousTaskId
      : siblingContext.nextTaskId;
  if (!targetTaskId) {
    return null;
  }

  const reordered = reorderSchedulesWithinParent(
    schedules,
    taskId,
    targetTaskId,
  );
  return reordered?.schedules ?? null;
}

function moveScheduleToParent(
  schedules: ApiPlanningTaskSchedule[],
  taskId: string,
  nextParentTaskId: string | null,
  insertIndex?: number,
):
  | ApiPlanningTaskSchedule[]
  | {
      error: string;
    } {
  const taskMap = new Map(
    schedules.map((schedule) => [schedule.taskId, schedule]),
  );
  const movedSchedule = taskMap.get(taskId);
  if (!movedSchedule) {
    return { error: "The selected row could not be found." };
  }

  if (nextParentTaskId === taskId) {
    return { error: "A task cannot be its own parent." };
  }

  if (nextParentTaskId) {
    const targetParent = taskMap.get(nextParentTaskId);
    if (!targetParent) {
      return { error: "The destination parent could not be found." };
    }
    const descendantIds = new Set(collectDescendantTaskIds(schedules, taskId));
    if (descendantIds.has(nextParentTaskId)) {
      return { error: "Task hierarchy cannot contain cycles." };
    }
    if (!canMoveScheduleUnderParent(schedules, movedSchedule, targetParent)) {
      return { error: getMoveToParentError(schedules, targetParent) };
    }
  }

  const currentParentTaskId = movedSchedule.parentTaskId ?? null;
  const sourceSiblings = getOrderedSiblings(
    schedules,
    currentParentTaskId,
  ).filter((schedule) => schedule.taskId !== taskId);
  const targetSiblings =
    currentParentTaskId === nextParentTaskId
      ? sourceSiblings
      : getOrderedSiblings(schedules, nextParentTaskId);
  const destinationIndex = Math.max(
    0,
    Math.min(insertIndex ?? targetSiblings.length, targetSiblings.length),
  );
  const reorderedTargetSiblings = [...targetSiblings];
  reorderedTargetSiblings.splice(destinationIndex, 0, {
    ...movedSchedule,
    parentTaskId: nextParentTaskId,
  });

  const nextByTaskId = new Map<string, ApiPlanningTaskSchedule>();
  if (currentParentTaskId === nextParentTaskId) {
    reorderedTargetSiblings.forEach((schedule, index) => {
      nextByTaskId.set(schedule.taskId, {
        ...schedule,
        parentTaskId: nextParentTaskId,
        sequenceNumber: index + 1,
      });
    });
  } else {
    sourceSiblings.forEach((schedule, index) => {
      nextByTaskId.set(schedule.taskId, {
        ...schedule,
        parentTaskId: currentParentTaskId,
        sequenceNumber: index + 1,
      });
    });
    reorderedTargetSiblings.forEach((schedule, index) => {
      nextByTaskId.set(schedule.taskId, {
        ...schedule,
        parentTaskId: nextParentTaskId,
        sequenceNumber: index + 1,
      });
    });
  }

  return schedules.map(
    (schedule) => nextByTaskId.get(schedule.taskId) ?? schedule,
  );
}

function promoteSummaryChildren(
  schedules: ApiPlanningTaskSchedule[],
  summaryTaskId: string,
) {
  const summarySchedule = schedules.find(
    (schedule) => schedule.taskId === summaryTaskId,
  );
  if (!summarySchedule) {
    return schedules;
  }

  const destinationParentId = summarySchedule.parentTaskId ?? null;
  const directChildren = getOrderedSiblings(schedules, summaryTaskId).map(
    (schedule) => ({
      ...schedule,
      parentTaskId: destinationParentId,
    }),
  );
  const destinationSiblings = getOrderedSiblings(
    schedules,
    destinationParentId,
  ).filter((schedule) => schedule.taskId !== summaryTaskId);
  const summaryIndex = getOrderedSiblings(
    schedules,
    destinationParentId,
  ).findIndex((schedule) => schedule.taskId === summaryTaskId);
  const nextDestinationSiblings = [...destinationSiblings];
  nextDestinationSiblings.splice(summaryIndex, 0, ...directChildren);
  const nextByTaskId = new Map<string, ApiPlanningTaskSchedule>();
  nextDestinationSiblings.forEach((schedule, index) => {
    nextByTaskId.set(schedule.taskId, {
      ...schedule,
      parentTaskId: destinationParentId,
      sequenceNumber: index + 1,
    });
  });

  return schedules
    .filter((schedule) => schedule.taskId !== summaryTaskId)
    .map((schedule) => nextByTaskId.get(schedule.taskId) ?? schedule);
}

function removeSchedulesAndRenumber(
  schedules: ApiPlanningTaskSchedule[],
  removedTaskIds: string[],
) {
  const removedTaskIdSet = new Set(removedTaskIds);
  const remainingSchedules = schedules.filter(
    (schedule) => !removedTaskIdSet.has(schedule.taskId),
  );
  const byParentId = new Map<string | null, ApiPlanningTaskSchedule[]>();
  const sourceIndex = new Map(
    remainingSchedules.map((schedule, index) => [schedule.taskId, index]),
  );

  remainingSchedules.forEach((schedule) => {
    const parentTaskId = schedule.parentTaskId ?? null;
    byParentId.set(parentTaskId, [
      ...(byParentId.get(parentTaskId) ?? []),
      schedule,
    ]);
  });

  const nextByTaskId = new Map<string, ApiPlanningTaskSchedule>();
  byParentId.forEach((items, parentTaskId) => {
    items
      .sort((left, right) => compareScheduleOrder(left, right, sourceIndex))
      .forEach((schedule, index) => {
        nextByTaskId.set(schedule.taskId, {
          ...schedule,
          parentTaskId,
          sequenceNumber: index + 1,
        });
      });
  });

  return remainingSchedules.map(
    (schedule) => nextByTaskId.get(schedule.taskId) ?? schedule,
  );
}

function buildHierarchyUpdatePayloads(
  previousSchedules: ApiPlanningTaskSchedule[],
  nextSchedules: ApiPlanningTaskSchedule[],
  deletedTaskIds: string[],
) {
  const deletedTaskIdSet = new Set(deletedTaskIds);
  const previousByTaskId = new Map(
    previousSchedules.map((schedule) => [schedule.taskId, schedule]),
  );

  return nextSchedules.filter((schedule) => {
    if (deletedTaskIdSet.has(schedule.taskId)) {
      return false;
    }
    const previousSchedule = previousByTaskId.get(schedule.taskId);
    if (!previousSchedule) {
      return false;
    }
    return (
      (previousSchedule.parentTaskId ?? null) !==
        (schedule.parentTaskId ?? null) ||
      (previousSchedule.sequenceNumber ?? null) !==
        (schedule.sequenceNumber ?? null)
    );
  });
}

function getOrderedSiblings(
  schedules: ApiPlanningTaskSchedule[],
  parentTaskId: string | null,
) {
  const sourceIndex = new Map(
    schedules.map((schedule, index) => [schedule.taskId, index]),
  );
  return schedules
    .filter((schedule) => (schedule.parentTaskId ?? null) === parentTaskId)
    .sort((left, right) => compareScheduleOrder(left, right, sourceIndex));
}

function getDirectChildSchedules(
  schedules: ApiPlanningTaskSchedule[],
  parentTaskId: string,
) {
  return getOrderedSiblings(schedules, parentTaskId);
}

function getSiblingContext(
  schedules: ApiPlanningTaskSchedule[],
  taskId: string,
): {
  nextTaskId: string | null;
  previousTaskId: string | null;
} | null {
  const currentSchedule = schedules.find(
    (schedule) => schedule.taskId === taskId,
  );
  if (!currentSchedule) {
    return null;
  }
  const siblings = getOrderedSiblings(
    schedules,
    currentSchedule.parentTaskId ?? null,
  );
  const currentIndex = siblings.findIndex(
    (schedule) => schedule.taskId === taskId,
  );
  if (currentIndex < 0) {
    return null;
  }

  return {
    nextTaskId: siblings[currentIndex + 1]?.taskId ?? null,
    previousTaskId: siblings[currentIndex - 1]?.taskId ?? null,
  };
}

function collectDescendantTaskIds(
  schedules: ApiPlanningTaskSchedule[],
  taskId: string,
): string[] {
  const childrenByParentId = new Map<
    string | null,
    ApiPlanningTaskSchedule[]
  >();
  schedules.forEach((schedule) => {
    const parentTaskId = schedule.parentTaskId ?? null;
    childrenByParentId.set(parentTaskId, [
      ...(childrenByParentId.get(parentTaskId) ?? []),
      schedule,
    ]);
  });

  const descendantTaskIds: string[] = [];
  const visit = (parentTaskId: string) => {
    (childrenByParentId.get(parentTaskId) ?? []).forEach((schedule) => {
      descendantTaskIds.push(schedule.taskId);
      visit(schedule.taskId);
    });
  };
  visit(taskId);
  return descendantTaskIds;
}

function getEligibleSummaryMoveTargets(
  schedules: ApiPlanningTaskSchedule[],
  taskId: string,
) {
  const task = schedules.find((schedule) => schedule.taskId === taskId);
  if (!task) {
    return [];
  }
  const excludedTaskIds = new Set([
    taskId,
    task.parentTaskId ?? "",
    ...collectDescendantTaskIds(schedules, taskId),
  ]);

  return buildVisibleRows(schedules, new Set())
    .filter(
      (row) =>
        row.schedule.taskKind === "summary" &&
        !excludedTaskIds.has(row.schedule.taskId),
    )
    .map((row) => ({
      taskId: row.schedule.taskId,
      taskTitle: getTaskTitle(row.schedule),
      wbs: row.wbs,
    }));
}

function canScheduleContainChildren(
  schedule: ApiPlanningTaskSchedule | null | undefined,
  schedules: ApiPlanningTaskSchedule[],
) {
  if (!schedule) {
    return false;
  }
  if (schedule.taskKind === "summary") {
    return true;
  }
  return (
    schedule.taskKind === "standard" && !isSubtaskSchedule(schedule, schedules)
  );
}

function canMoveScheduleUnderParent(
  schedules: ApiPlanningTaskSchedule[],
  movedSchedule: ApiPlanningTaskSchedule,
  targetParent: ApiPlanningTaskSchedule,
) {
  if (targetParent.taskKind === "summary") {
    return true;
  }
  if (!canScheduleContainChildren(targetParent, schedules)) {
    return false;
  }
  if (movedSchedule.taskKind !== "standard") {
    return false;
  }
  return collectDescendantTaskIds(schedules, movedSchedule.taskId).length === 0;
}

function isSubtaskSchedule(
  schedule: ApiPlanningTaskSchedule,
  schedules: ApiPlanningTaskSchedule[],
) {
  if (!schedule.parentTaskId) {
    return false;
  }
  return schedules.some(
    (candidate) =>
      candidate.taskId === schedule.parentTaskId &&
      candidate.taskKind === "standard",
  );
}

function getMoveToParentError(
  schedules: ApiPlanningTaskSchedule[],
  targetParent: ApiPlanningTaskSchedule,
) {
  if (targetParent.taskKind === "milestone") {
    return "Milestones are scheduling events and cannot contain child items.";
  }
  if (isSubtaskSchedule(targetParent, schedules)) {
    return "Sub-tasks cannot contain child items.";
  }
  if (targetParent.taskKind === "standard") {
    return "Only executable tasks can be moved under a Task, and only when they do not already have children.";
  }
  return "The selected row cannot be moved under this parent.";
}

function getDeletionOrder(
  schedules: ApiPlanningTaskSchedule[],
  taskId: string,
) {
  const rows = buildVisibleRows(schedules, new Set());
  const descendantIdSet = new Set(collectDescendantTaskIds(schedules, taskId));
  return rows
    .filter(
      (row) =>
        row.schedule.taskId === taskId ||
        descendantIdSet.has(row.schedule.taskId),
    )
    .sort((left, right) => right.depth - left.depth)
    .map((row) => row.schedule.taskId);
}

function getFallbackSelectionTaskId(
  previousSchedules: ApiPlanningTaskSchedule[],
  nextSchedules: ApiPlanningTaskSchedule[],
  removedTaskId: string,
) {
  const previousRows = buildVisibleRows(previousSchedules, new Set());
  const removedIndex = previousRows.findIndex(
    (row) => row.schedule.taskId === removedTaskId,
  );
  const nextRows = buildVisibleRows(nextSchedules, new Set());
  if (nextRows.length === 0) {
    return null;
  }
  const fallbackIndex = Math.max(
    0,
    Math.min(removedIndex, nextRows.length - 1),
  );
  return nextRows[fallbackIndex]?.schedule.taskId ?? null;
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

function buildDisplayRows(
  rows: VisibleRow[],
  draftPlacement: DraftCreateRowPlacement | null,
): PlanningDisplayRow[] {
  if (!draftPlacement) {
    return rows.map((row) => ({ kind: "schedule", row }));
  }

  const displayRows: PlanningDisplayRow[] = [];
  rows.forEach((row, index) => {
    if (draftPlacement.insertIndex === index) {
      displayRows.push({ kind: "draft", placement: draftPlacement });
    }
    displayRows.push({ kind: "schedule", row });
  });
  if (draftPlacement.insertIndex >= rows.length) {
    displayRows.push({ kind: "draft", placement: draftPlacement });
  }
  return displayRows;
}

function getDraftCreateRowPlacement(
  rows: VisibleRow[],
  schedules: ApiPlanningTaskSchedule[],
  draft: DraftCreateRowState | null,
): DraftCreateRowPlacement | null {
  if (!draft) {
    return null;
  }

  if (!draft.parentTaskId) {
    const topLevelCount = schedules.filter(
      (schedule) => !schedule.parentTaskId,
    ).length;
    return {
      depth: 0,
      insertIndex: rows.length,
      wbs: String(topLevelCount + 1),
    };
  }

  const parentIndex = rows.findIndex(
    (row) => row.schedule.taskId === draft.parentTaskId,
  );
  if (parentIndex < 0) {
    return null;
  }

  const parentRow = rows[parentIndex];
  const childCount = schedules.filter(
    (schedule) => schedule.parentTaskId === draft.parentTaskId,
  ).length;
  return {
    depth: parentRow.depth + 1,
    insertIndex: getLastVisibleDescendantIndex(rows, parentIndex) + 1,
    wbs: `${parentRow.wbs}.${childCount + 1}`,
  };
}

function getLastVisibleDescendantIndex(rows: VisibleRow[], parentIndex: number) {
  const parentDepth = rows[parentIndex]?.depth ?? 0;
  let lastIndex = parentIndex;
  for (let index = parentIndex + 1; index < rows.length; index += 1) {
    if (rows[index].depth <= parentDepth) {
      break;
    }
    lastIndex = index;
  }
  return lastIndex;
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

function buildTimeline(
  schedules: ApiPlanningTaskSchedule[],
  zoom: ZoomMode,
  fitWidth?: number | null,
) {
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
  const max = addDays(parseDate(latestDate), 21);
  const daysPerUnit =
    zoom === "day" ? 1 : zoom === "week" ? 7 : zoom === "month" ? 30 : 90;
  const baseUnitWidth =
    zoom === "day" ? 34 : zoom === "week" ? 58 : zoom === "month" ? 86 : 120;
  const totalDays = Math.max(1, diffDays(formatDate(min), formatDate(max)));
  const units = Math.ceil(totalDays / daysPerUnit);
  const fittedUnitWidth =
    fitWidth && fitWidth > 0 ? Math.max(8, fitWidth / (units + 1)) : null;
  const unitWidth = fittedUnitWidth
    ? Math.min(baseUnitWidth, fittedUnitWidth)
    : baseUnitWidth;
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
    width: Math.max(fitWidth ?? 900, (units + 1) * unitWidth),
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
  rows: PlanningDisplayRow[],
  timeline: ReturnType<typeof buildTimeline>,
) {
  const predecessorIndex = rows.findIndex(
    (row) =>
      row.kind === "schedule" &&
      row.row.schedule.taskId === dependency.predecessorTaskId,
  );
  const successorIndex = rows.findIndex(
    (row) =>
      row.kind === "schedule" &&
      row.row.schedule.taskId === dependency.successorTaskId,
  );
  if (predecessorIndex < 0 || successorIndex < 0) {
    return null;
  }
  const predecessorRow = rows[predecessorIndex];
  const successorRow = rows[successorIndex];
  if (
    predecessorRow.kind !== "schedule" ||
    successorRow.kind !== "schedule"
  ) {
    return null;
  }
  const predecessor = predecessorRow.row.schedule;
  const successor = successorRow.row.schedule;
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
  if (schedule.taskKind !== "standard") {
    return "—";
  }
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

function formatPriority(schedule: ApiPlanningTaskSchedule) {
  const priority = schedule.task?.priority;
  if (!priority) {
    return "Medium";
  }
  return priority.replaceAll("_", " ");
}

function getMilestoneState(schedule: ApiPlanningTaskSchedule) {
  return schedule.status === "done" ||
    Number(schedule.percentComplete ?? 0) >= 100
    ? "Reached"
    : "Pending";
}

function getMilestoneCategory(
  schedule: Pick<ApiPlanningTaskSchedule, "milestoneCategory" | "task">,
): ApiMilestoneCategory {
  return (
    schedule.milestoneCategory ?? schedule.task?.milestoneCategory ?? "standard"
  );
}

function getMilestoneCategoryLabel(category: ApiMilestoneCategory) {
  const labels: Record<ApiMilestoneCategory, string> = {
    decision: "Decision",
    drop: "Drop",
    go_live: "Go Live",
    release: "Release",
    standard: "Standard",
  };
  return labels[category];
}

function getTypeLabel(schedule: ApiPlanningTaskSchedule) {
  if (schedule.taskKind === "summary") {
    return "Summary";
  }
  if (schedule.taskKind === "milestone") {
    const category = getMilestoneCategory(schedule);
    return category === "standard"
      ? "Milestone"
      : getMilestoneCategoryLabel(category);
  }
  return "Task";
}

function getTypeTooltip(schedule: ApiPlanningTaskSchedule) {
  if (schedule.taskKind === "summary") {
    return "A Summary groups work and derives its schedule from child work.";
  }
  if (schedule.taskKind !== "milestone") {
    return "Task";
  }
  return "A milestone represents an event in the project schedule. Milestones cannot contain child work items.";
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

function getMilestoneFill(
  schedule: ApiPlanningTaskSchedule,
  isCritical: boolean,
) {
  if (isCritical) {
    return "#dc2626";
  }
  const colors: Record<ApiMilestoneCategory, string> = {
    decision: "#7c3aed",
    drop: "#0369a1",
    go_live: "#047857",
    release: "#4338ca",
    standard: "#b45309",
  };
  return colors[getMilestoneCategory(schedule)];
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
