export const TODAY_EDITABLE_COLUMNS = [
  "status",
  "owner",
  "priority",
  "targetDate",
  "progress",
  "updateNotes",
  "nextStep",
  "nextOwner",
] as const;

export const TODAY_TEAM_EDITABLE_COLUMNS = [
  "owner",
  "priority",
  "status",
  "targetDate",
  "progress",
  "updateNotes",
  "nextStep",
  "nextOwner",
] as const;

export const TODAY_MINE_EDITABLE_COLUMNS = [
  "status",
  "targetDate",
  "progress",
  "updateNotes",
  "nextStep",
] as const;

export type TodayEditableColumn = (typeof TODAY_EDITABLE_COLUMNS)[number];

export type TodayNavigableRow = {
  hasChildren: boolean;
  task: {
    id: string;
    taskKind?: string | null;
  };
};

export function isEditableTodayTask(task: { taskKind?: string | null }) {
  return task.taskKind !== "summary";
}

export function getEditableTaskIds(rows: readonly TodayNavigableRow[]) {
  return rows
    .filter((row) => isEditableTodayTask(row.task))
    .map((row) => row.task.id);
}

export function getWorkPackageIds(rows: readonly TodayNavigableRow[]) {
  return rows
    .filter(
      (row) => row.task.taskKind === "summary" || row.hasChildren,
    )
    .map((row) => row.task.id);
}

export function getPreferredFocusColumn(task: {
  latestExecutionUpdate?: {
    nextStep?: string | null;
    updateNotes?: string | null;
  } | null;
}): TodayEditableColumn {
  const updateNotes = task.latestExecutionUpdate?.updateNotes?.trim() ?? "";
  if (updateNotes.length > 0) {
    return "nextStep";
  }
  return "updateNotes";
}

export function resolveInheritedUpdateNotes(task: {
  latestExecutionUpdate?: {
    nextStep?: string | null;
    updateNotes?: string | null;
  } | null;
}) {
  const storedUpdate = stripBlockerPrefix(
    task.latestExecutionUpdate?.updateNotes,
  );
  const previousNextStep = task.latestExecutionUpdate?.nextStep?.trim() ?? "";
  if (storedUpdate) {
    return {
      displayValue: storedUpdate,
      inheritedFromNextStep: null as string | null,
      isInherited: false,
    };
  }
  if (!previousNextStep) {
    return {
      displayValue: "",
      inheritedFromNextStep: null as string | null,
      isInherited: false,
    };
  }
  return {
    displayValue: previousNextStep,
    inheritedFromNextStep: previousNextStep,
    isInherited: true,
  };
}

export function getCellSelector(taskId: string, column: TodayEditableColumn) {
  return `[data-today-task-id="${cssEscape(taskId)}"][data-today-column="${column}"]`;
}

export function focusTodayCell(
  root: ParentNode,
  taskId: string,
  column: TodayEditableColumn,
) {
  const element = root.querySelector<HTMLElement>(
    getCellSelector(taskId, column),
  );
  if (!element || isDisabledControl(element)) {
    return false;
  }
  element.focus();
  if (
    element instanceof HTMLInputElement &&
    (element.type === "text" ||
      element.type === "search" ||
      element.type === "number" ||
      !element.type)
  ) {
    element.select?.();
  }
  element.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  return true;
}

export function findAdjacentEditableTaskId(
  editableTaskIds: readonly string[],
  currentTaskId: string,
  direction: 1 | -1,
) {
  const index = editableTaskIds.indexOf(currentTaskId);
  if (index < 0) {
    return null;
  }
  return editableTaskIds[index + direction] ?? null;
}

export function findAdjacentColumn(
  column: TodayEditableColumn,
  direction: 1 | -1,
  columns: readonly TodayEditableColumn[] = TODAY_EDITABLE_COLUMNS,
) {
  const index = columns.indexOf(column);
  if (index < 0) {
    return null;
  }
  return columns[index + direction] ?? null;
}

export function findAdjacentWorkPackageId(
  workPackageIds: readonly string[],
  currentPackageId: string | null,
  direction: 1 | -1,
) {
  if (workPackageIds.length === 0) {
    return null;
  }
  if (!currentPackageId) {
    return direction === 1
      ? workPackageIds[0]
      : workPackageIds[workPackageIds.length - 1];
  }
  const index = workPackageIds.indexOf(currentPackageId);
  if (index < 0) {
    return direction === 1
      ? workPackageIds[0]
      : workPackageIds[workPackageIds.length - 1];
  }
  return workPackageIds[index + direction] ?? null;
}

export function findOwningWorkPackageId(
  rows: readonly TodayNavigableRow[],
  taskId: string,
) {
  let currentPackageId: string | null = null;
  for (const row of rows) {
    if (row.task.taskKind === "summary" || row.hasChildren) {
      currentPackageId = row.task.id;
    }
    if (row.task.id === taskId) {
      return row.task.taskKind === "summary" || row.hasChildren
        ? row.task.id
        : currentPackageId;
    }
  }
  return currentPackageId;
}

export function readTodayCellCoordinates(element: EventTarget | null): {
  column: TodayEditableColumn;
  taskId: string;
} | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  const control = element.closest<HTMLElement>("[data-today-task-id][data-today-column]");
  if (!control) {
    return null;
  }
  const taskId = control.dataset.todayTaskId;
  const column = control.dataset.todayColumn as TodayEditableColumn | undefined;
  if (!taskId || !column || !TODAY_EDITABLE_COLUMNS.includes(column)) {
    return null;
  }
  return { column, taskId };
}

function stripBlockerPrefix(updateNotes?: string | null) {
  if (!updateNotes) {
    return "";
  }
  return updateNotes
    .split("\n")
    .filter((line) => !line.startsWith("Blocker Category:"))
    .join("\n")
    .replace(/^Blocker:\s*/gm, "")
    .trim();
}

function isDisabledControl(element: HTMLElement) {
  return (
    ("disabled" in element && Boolean((element as HTMLButtonElement).disabled)) ||
    element.getAttribute("aria-disabled") === "true"
  );
}

function cssEscape(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}
