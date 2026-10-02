import { describe, expect, it } from "vitest";
import {
  matchesWorkAttention,
  primaryWorkFilters,
} from "@/lib/tasks/task-work-filters";
import type { ApiTask } from "@/features/projects";

const today = "2026-12-29";
const task: ApiTask = {
  id: "task",
  projectId: "project",
  title: "Work",
  status: "todo",
  priority: "medium",
};
const update = {
  id: "update",
  taskId: "task",
  projectId: "project",
  priority: "medium",
  percentComplete: 0,
  status: "todo" as const,
};

describe("Today work matching", () => {
  it("excludes summary work and Done from primary filters", () => {
    for (const [attention] of primaryWorkFilters) {
      expect(
        matchesWorkAttention(
          { ...task, taskKind: "summary", dueDate: today },
          attention,
          "me",
          today,
        ),
      ).toBe(false);
      expect(
        matchesWorkAttention(
          { ...task, status: "done", dueDate: today },
          attention,
          "me",
          today,
        ),
      ).toBe(false);
    }
  });
  it("matches active, overdue, due today and blocked with due-date fallback", () => {
    expect(matchesWorkAttention(task, "active", "me", today)).toBe(true);
    expect(
      matchesWorkAttention(
        { ...task, plannedEndDate: "2026-12-28" },
        "overdue",
        "me",
        today,
      ),
    ).toBe(true);
    expect(
      matchesWorkAttention(
        { ...task, plannedEndDate: "2026-12-28", dueDate: today },
        "overdue",
        "me",
        today,
      ),
    ).toBe(false);
    expect(
      matchesWorkAttention({ ...task, dueDate: today }, "today", "me", today),
    ).toBe(true);
    expect(matchesWorkAttention(task, "today", "me", today)).toBe(false);
    expect(
      matchesWorkAttention(
        { ...task, status: "blocked" },
        "blocked",
        "me",
        today,
      ),
    ).toBe(true);
  });
  it("uses only explicit latest nextActionOwnerId for Waiting For Me", () => {
    expect(
      matchesWorkAttention(
        {
          ...task,
          assigneeId: "someone",
          latestExecutionUpdate: { ...update, nextActionOwnerId: "me" },
        },
        "waiting",
        "me",
        today,
      ),
    ).toBe(true);
    for (const latestExecutionUpdate of [
      null,
      {
        ...update,
        nextActionOwnerId: "other",
        nextStep: "me",
        updateNotes: "me",
      },
    ]) {
      expect(
        matchesWorkAttention(
          { ...task, assigneeId: "me", latestExecutionUpdate },
          "waiting",
          "me",
          today,
        ),
      ).toBe(false);
    }
    expect(
      matchesWorkAttention(
        {
          ...task,
          latestExecutionUpdate: { ...update, nextActionOwnerId: null },
        },
        "waiting",
        null,
        today,
      ),
    ).toBe(false);
  });
  it.each([
    ["2026-12-28", false],
    [today, true],
    ["2027-01-04", true],
    ["2027-01-05", false],
  ] as const)(
    "Next 7 days handles %s across year boundaries",
    (dueDate, expected) => {
      expect(
        matchesWorkAttention(
          { ...task, dueDate },
          "active",
          "me",
          today,
          "next7",
        ),
      ).toBe(expected);
    },
  );
  it("Updated today overrides default active but keeps specific attention constraints", () => {
    const completed = {
      ...task,
      status: "done" as const,
      latestExecutionUpdate: { ...update, updatedOn: `${today}T23:59:59Z` },
    };
    expect(
      matchesWorkAttention(completed, "active", "me", today, "updated"),
    ).toBe(true);
    expect(
      matchesWorkAttention(completed, "overdue", "me", today, "updated"),
    ).toBe(false);
    expect(matchesWorkAttention(task, "active", "me", today, "updated")).toBe(
      false,
    );
    expect(
      matchesWorkAttention(
        {
          ...task,
          latestExecutionUpdate: {
            ...update,
            updatedOn: "2026-12-28T23:59:59Z",
          },
        },
        "active",
        "me",
        today,
        "updated",
      ),
    ).toBe(false);
  });
  it("Critical matches active work and composes with primary attention", () => {
    expect(
      matchesWorkAttention(
        { ...task, priority: "critical" },
        "active",
        "me",
        today,
        "critical",
      ),
    ).toBe(true);
    expect(
      matchesWorkAttention(
        { ...task, priority: "critical", status: "done" },
        "active",
        "me",
        today,
        "critical",
      ),
    ).toBe(false);
    expect(
      matchesWorkAttention(
        { ...task, priority: "critical", dueDate: today },
        "overdue",
        "me",
        today,
        "critical",
      ),
    ).toBe(false);
  });
});
