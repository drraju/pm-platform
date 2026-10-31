import { describe, expect, it } from "vitest";
import { containerStatusMix, countWork, isOverdueWork, statusMix } from "@/features/work/work-count";

const today = "2026-10-29";

describe("work count", () => {
  const tasks = [
    {
      dueDate: "2026-10-01",
      id: "container",
      status: "in_progress",
      taskKind: "summary",
    },
    {
      dueDate: "2026-10-01",
      id: "parent",
      status: "in_progress",
      taskKind: "standard",
    },
    {
      dueDate: "2026-10-28",
      id: "overdue",
      parentTaskId: "parent",
      status: "in_progress",
      taskKind: "standard",
    },
    {
      dueDate: "2026-10-01",
      id: "done",
      parentTaskId: "parent",
      status: "done",
      taskKind: "standard",
    },
    {
      dueDate: "2026-10-30",
      id: "future",
      status: "todo",
      taskKind: "standard",
    },
    {
      dueDate: "2026-10-20",
      id: "backlog",
      status: "backlog",
      taskKind: "standard",
    },
  ];

  it("uses one overdue rule and skips containers", () => {
    expect(countWork(tasks, today)).toEqual({
      line: "2 of 4 overdue",
      operational: 4,
      overdue: 2,
    });
    expect(isOverdueWork(tasks[1], tasks, today)).toBe(false);
  });

  it("clears overdue when the item is done", () => {
    const finished = tasks.map((task) =>
      task.id === "overdue" ? { ...task, status: "done" } : task,
    );
    expect(countWork(finished, today).line).toBe("1 of 4 overdue");
  });

  it("counts the four statuses on the leaves of a group", () => {
    expect(containerStatusMix("parent", tasks)).toEqual({
      blocked: 0,
      doing: 1,
      done: 1,
      notStarted: 0,
      total: 2,
    });
    expect(statusMix([{ id: "a", status: "blocked" }, { id: "b", status: "todo" }])).toEqual({
      blocked: 1,
      doing: 0,
      done: 0,
      notStarted: 1,
      total: 2,
    });
  });
});
