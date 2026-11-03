import { describe, expect, it } from "vitest";
import { countTodayFilters, doneContainerIds, matchesTodayFilter, todaySections } from "@/features/work/today-outline";

const today = "2026-10-29";

const tasks = [
  { id: "phase", outlineRole: "phase", status: "todo", taskKind: "summary", title: "Phase 1" },
  { id: "gate", outlineRole: "gate", parentTaskId: "phase", status: "todo", taskKind: "milestone", title: "Acceptance" },
  { id: "integrations", parentTaskId: "phase", status: "todo", taskKind: "summary", title: "Integrations" },
  { id: "package", parentTaskId: "integrations", status: "todo", taskKind: "standard", title: "Ansible" },
  { id: "staging", parentTaskId: "package", status: "done", taskKind: "standard", title: "Staging" },
  { dueDate: "2026-10-01", id: "prod", parentTaskId: "package", status: "blocked", taskKind: "standard", title: "Prod" },
  { id: "logs", parentTaskId: "integrations", status: "done", taskKind: "standard", title: "Logs" },
  { id: "loose", status: "in_progress", taskKind: "standard", title: "Loose" },
];

describe("today outline", () => {
  it("counts open work separately from done and overdue", () => {
    expect(countTodayFilters(tasks, today)).toMatchObject({
      all: 4,
      blocked: 1,
      done: 2,
      in_progress: 1,
      open: 2,
      overdue: 1,
      todo: 0,
    });
    expect(matchesTodayFilter(tasks[5], tasks, today, "overdue")).toBe(true);
    expect(matchesTodayFilter(tasks[4], tasks, today, "open")).toBe(false);
  });

  it("keeps a summary as the folder and hides a finished subtask when the filter is open", () => {
    const sections = todaySections(tasks, "open", new Set(), today);
    expect(sections.map((section) => section.title)).toEqual(["Integrations", "Tasks"]);
    expect(sections[0].rows.map((row) => [row.depth, row.task.title, row.foldable])).toEqual([
      [0, "Ansible", true],
      [1, "Prod", false],
    ]);
    expect(sections[0]).toMatchObject({ done: 2, total: 3 });
    expect(sections[1].rows.map((row) => row.task.title)).toEqual(["Loose"]);
  });

  it("folds subtasks and starts a finished package collapsed", () => {
    const collapsed = todaySections(tasks, "all", new Set(["package"]), today);
    expect(collapsed[0].rows.map((row) => row.task.title)).toEqual(["Ansible", "Logs"]);
    expect(doneContainerIds([
      { id: "package", status: "todo", taskKind: "standard", title: "Ansible" },
      { id: "staging", parentTaskId: "package", status: "done", taskKind: "standard", title: "Staging" },
    ])).toEqual(["package"]);
  });
});
