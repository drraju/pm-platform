import type { ApiTask } from "@/lib/api/client";

/** Legacy single-dimension filter IDs (persisted prefs / chip model). */
export type DeliveryFilter =
  | "all"
  | "active"
  | "mine"
  | "in_progress"
  | "blocked"
  | "due_today"
  | "due_week"
  | "overdue"
  | "updated_today"
  | "awaiting_update"
  | "waiting_customer"
  | "completed";

export type DeliveryStatusFilter =
  | "all"
  | "active"
  | "in_progress"
  | "blocked"
  | "completed";

export type DeliveryOwnerFilter = "all" | "mine";

export type DeliveryPriorityFilter =
  | "all"
  | "critical"
  | "high"
  | "medium"
  | "low";

export type DeliveryAttentionFilter =
  | "none"
  | "due_today"
  | "due_week"
  | "overdue"
  | "updated_today"
  | "awaiting_update"
  | "waiting_customer";

export type DeliveryFilterState = {
  attention: DeliveryAttentionFilter;
  owner: DeliveryOwnerFilter;
  priority: DeliveryPriorityFilter;
  status: DeliveryStatusFilter;
};

export const deliveryFilters: Array<{ id: DeliveryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "mine", label: "Mine" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "due_today", label: "Due Today" },
  { id: "due_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "updated_today", label: "Updated Today" },
  { id: "awaiting_update", label: "Awaiting Update" },
  { id: "waiting_customer", label: "Waiting Customer" },
  { id: "completed", label: "Completed" },
];

export const deliveryStatusFilters: Array<{
  id: DeliveryStatusFilter;
  label: string;
}> = [
  { id: "all", label: "All statuses" },
  { id: "active", label: "Active" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "completed", label: "Completed" },
];

export const deliveryOwnerFilters: Array<{
  id: DeliveryOwnerFilter;
  label: string;
}> = [
  { id: "all", label: "All owners" },
  { id: "mine", label: "Mine" },
];

export const deliveryPriorityFilters: Array<{
  id: DeliveryPriorityFilter;
  label: string;
}> = [
  { id: "all", label: "All priorities" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export const deliveryAttentionFilters: Array<{
  id: DeliveryAttentionFilter;
  label: string;
}> = [
  { id: "none", label: "None" },
  { id: "due_today", label: "Due Today" },
  { id: "due_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "updated_today", label: "Updated Today" },
  { id: "awaiting_update", label: "Awaiting Update" },
  { id: "waiting_customer", label: "Waiting Customer" },
];

const deliveryFilterIds = new Set(deliveryFilters.map((filter) => filter.id));

export function isDeliveryFilter(value: string): value is DeliveryFilter {
  return deliveryFilterIds.has(value as DeliveryFilter);
}

export function createDefaultDeliveryFilterState(): DeliveryFilterState {
  return {
    attention: "none",
    owner: "all",
    priority: "all",
    status: "all",
  };
}

/** Map legacy single-filter prefs into the composable filter state. */
export function deliveryFilterToState(
  filter: DeliveryFilter,
): DeliveryFilterState {
  const defaults = createDefaultDeliveryFilterState();
  if (filter === "all") {
    return defaults;
  }
  if (filter === "mine") {
    return { ...defaults, owner: "mine" };
  }
  if (
    filter === "active" ||
    filter === "in_progress" ||
    filter === "blocked" ||
    filter === "completed"
  ) {
    return { ...defaults, status: filter };
  }
  return { ...defaults, attention: filter };
}

export function deliveryStateToLegacyFilter(
  state: DeliveryFilterState,
): DeliveryFilter {
  if (state.attention !== "none") {
    return state.attention;
  }
  if (state.owner === "mine" && state.status === "all" && state.priority === "all") {
    return "mine";
  }
  if (state.status !== "all" && state.owner === "all" && state.priority === "all") {
    return state.status;
  }
  if (
    state.status === "all" &&
    state.owner === "all" &&
    state.priority === "all" &&
    state.attention === "none"
  ) {
    return "all";
  }
  // Composed state: persist as "all" for legacy readers; new fields carry truth.
  return "all";
}

export function getDeliveryAttentionSummary(
  tasks: ApiTask[],
  currentUserId: string | null,
) {
  const counts = getDeliveryFilterCounts(tasks, currentUserId);
  return {
    active: counts.active ?? 0,
    blocked: counts.blocked ?? 0,
    overdue: counts.overdue ?? 0,
    total: counts.all ?? 0,
  };
}

export function getDeliveryFilterCounts(
  tasks: ApiTask[],
  currentUserId: string | null,
): Partial<Record<DeliveryFilter, number>> {
  return {
    all: tasks.length,
    active: tasks.filter((task) => task.status !== "done").length,
    awaiting_update: tasks.filter(
      (task) => task.status !== "done" && !wasUpdatedToday(task),
    ).length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    completed: tasks.filter((task) => task.status === "done").length,
    due_today: tasks.filter(
      (task) => getTaskDueDate(task) === getDateOnly(new Date()),
    ).length,
    due_week: tasks.filter((task) => isDueThisWeek(task)).length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    mine: tasks.filter((task) => task.assigneeId === currentUserId).length,
    overdue: tasks.filter((task) => isOverdue(task)).length,
    updated_today: tasks.filter((task) => wasUpdatedToday(task)).length,
    waiting_customer: tasks.filter(isWaitingCustomerTask).length,
  };
}

export function filterDeliveryTasks(
  tasks: ApiTask[],
  filter: DeliveryFilter,
  currentUserId: string | null,
  searchTerm = "",
) {
  return filterDeliveryTasksByState(
    tasks,
    deliveryFilterToState(filter),
    currentUserId,
    searchTerm,
  );
}

export function filterDeliveryTasksByState(
  tasks: ApiTask[],
  state: DeliveryFilterState,
  currentUserId: string | null,
  searchTerm = "",
) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return tasks.filter((task) => {
    if (
      normalizedSearchTerm &&
      !matchesDeliverySearch(task, normalizedSearchTerm)
    ) {
      return false;
    }
    if (!matchesStatusFilter(task, state.status)) {
      return false;
    }
    if (state.owner === "mine" && task.assigneeId !== currentUserId) {
      return false;
    }
    if (
      state.priority !== "all" &&
      (task.priority ?? "").toLowerCase() !== state.priority
    ) {
      return false;
    }
    if (!matchesAttentionFilter(task, state.attention)) {
      return false;
    }
    return true;
  });
}

export function getActiveDeliveryFilterLabels(state: DeliveryFilterState) {
  const labels: string[] = [];
  if (state.status !== "all") {
    const status = deliveryStatusFilters.find((item) => item.id === state.status);
    if (status) {
      labels.push(status.label);
    }
  }
  if (state.owner !== "all") {
    labels.push("Mine");
  }
  if (state.priority !== "all") {
    const priority = deliveryPriorityFilters.find(
      (item) => item.id === state.priority,
    );
    if (priority) {
      labels.push(priority.label);
    }
  }
  if (state.attention !== "none") {
    const attention = deliveryAttentionFilters.find(
      (item) => item.id === state.attention,
    );
    if (attention) {
      labels.push(attention.label);
    }
  }
  return labels;
}

function matchesStatusFilter(task: ApiTask, status: DeliveryStatusFilter) {
  if (status === "all") {
    return true;
  }
  if (status === "active") {
    return task.status !== "done";
  }
  if (status === "completed") {
    return task.status === "done";
  }
  return task.status === status;
}

function matchesAttentionFilter(
  task: ApiTask,
  attention: DeliveryAttentionFilter,
) {
  if (attention === "none") {
    return true;
  }
  if (attention === "due_today") {
    return getTaskDueDate(task) === getDateOnly(new Date());
  }
  if (attention === "due_week") {
    return isDueThisWeek(task);
  }
  if (attention === "overdue") {
    return isOverdue(task);
  }
  if (attention === "updated_today") {
    return wasUpdatedToday(task);
  }
  if (attention === "awaiting_update") {
    return task.status !== "done" && !wasUpdatedToday(task);
  }
  return isWaitingCustomerTask(task);
}

function isOverdue(task: ApiTask) {
  const dueDate = getTaskDueDate(task);
  const today = getDateOnly(new Date());
  return Boolean(dueDate && today && dueDate < today && task.status !== "done");
}

function isDueThisWeek(task: ApiTask) {
  const dueDate = getTaskDueDate(task);
  if (!dueDate || task.status === "done") {
    return false;
  }

  const today = getDateOnly(new Date());
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndDate = getDateOnly(weekEnd);

  return Boolean(
    today && weekEndDate && dueDate >= today && dueDate <= weekEndDate,
  );
}

function wasUpdatedToday(task: ApiTask) {
  return (
    getDateOnly(task.latestExecutionUpdate?.updatedOn) ===
    getDateOnly(new Date())
  );
}

function isWaitingCustomerTask(task: ApiTask) {
  return Boolean(
    task.latestExecutionUpdate?.updateNotes
      ?.toLowerCase()
      .includes("waiting for customer"),
  );
}

function matchesDeliverySearch(task: ApiTask, searchTerm: string) {
  return [
    task.title,
    task.description,
    task.assignee?.displayName,
    task.assignee?.firstName,
    task.assignee?.lastName,
    task.assignee?.email,
    task.latestExecutionUpdate?.nextStep,
    task.latestExecutionUpdate?.updateNotes,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchTerm));
}

export function getTaskDueDate(task: ApiTask) {
  return getDateOnly(
    task.latestExecutionUpdate?.targetCompletionDate ??
      task.dueDate ??
      task.plannedEndDate,
  );
}

export function getDateOnly(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}
