import type { ApiTask } from "@/features/projects";

export const primaryWorkFilters = [
  ["active", "All active"],
  ["overdue", "Overdue"],
  ["today", "Today"],
  ["blocked", "Blocked"],
  ["waiting", "Waiting For Me"],
] as const;
export type WorkAttention = (typeof primaryWorkFilters)[number][0];
export type WorkSecondary = "none" | "next7" | "updated" | "critical";

export function matchesWorkAttention(
  task: ApiTask,
  attention: WorkAttention,
  currentUserId: string | null,
  today: string,
  secondary: WorkSecondary = "none",
) {
  if (task.taskKind === "summary") return false;
  const active = task.status !== "done";
  const due = task.dueDate ?? task.plannedEndDate;
  const updated = task.latestExecutionUpdate?.updatedOn?.slice(0, 10) === today;
  if (secondary === "updated" && !updated) return false;
  if (secondary === "critical" && (!active || task.priority !== "critical"))
    return false;
  if (secondary === "next7") {
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    if (!active || !due || due < today || due > end.toISOString().slice(0, 10))
      return false;
  }
  if (attention === "active") return active || secondary === "updated";
  if (attention === "blocked") return task.status === "blocked";
  if (!active) return false;
  if (attention === "waiting")
    return (
      Boolean(currentUserId) &&
      task.latestExecutionUpdate?.nextActionOwnerId === currentUserId
    );
  return Boolean(due) && (attention === "today" ? due === today : due! < today);
}
