import { describe, expect, it } from "vitest";
import { decoratePlanningTasks } from "@/features/projects/planning";
import type { ApiTask } from "@/lib/api/client";

describe("decoratePlanningTasks", () => {
  it("rolls subtask progress into a standard parent without making it a summary", () => {
    const tasks = decoratePlanningTasks([
      {
        assigneeId: "owner-1",
        estimatedHours: 12,
        id: "task-1",
        parentTaskId: null,
        percentComplete: 0,
        status: "todo",
        taskKind: "standard",
        title: "Build integration",
      },
      {
        estimatedHours: 2,
        id: "subtask-1",
        parentTaskId: "task-1",
        percentComplete: 50,
        status: "in_progress",
        taskKind: "standard",
        title: "API mapping",
      },
      {
        estimatedHours: 6,
        id: "subtask-2",
        parentTaskId: "task-1",
        percentComplete: 100,
        status: "done",
        taskKind: "standard",
        title: "Payload tests",
      },
    ] as ApiTask[]);

    expect(tasks.find((task) => task.id === "task-1")).toEqual(
      expect.objectContaining({
        assigneeId: "owner-1",
        childTaskCount: 2,
        estimatedHours: 12,
        percentComplete: 88,
        phaseProgress: null,
        status: "in_progress",
        taskKind: "standard",
      }),
    );
  });

  it("rolls summary progress through task parents without double-counting subtasks", () => {
    const tasks = decoratePlanningTasks([
      {
        id: "summary",
        taskKind: "summary",
        title: "Summary",
      },
      {
        id: "task-a",
        parentTaskId: "summary",
        percentComplete: 0,
        status: "todo",
        taskKind: "standard",
        title: "Task A",
      },
      {
        id: "task-a-1",
        parentTaskId: "task-a",
        percentComplete: 100,
        plannedEndDate: "2026-09-03",
        plannedStartDate: "2026-09-01",
        status: "done",
        taskKind: "standard",
        title: "Task A1",
      },
      {
        id: "task-a-2",
        parentTaskId: "task-a",
        percentComplete: 0,
        plannedEndDate: "2026-09-06",
        plannedStartDate: "2026-09-04",
        status: "todo",
        taskKind: "standard",
        title: "Task A2",
      },
      {
        id: "task-b",
        parentTaskId: "summary",
        percentComplete: 0,
        status: "todo",
        taskKind: "standard",
        title: "Task B",
      },
      {
        id: "task-b-1",
        parentTaskId: "task-b",
        percentComplete: 100,
        plannedEndDate: "2026-09-08",
        plannedStartDate: "2026-09-07",
        status: "done",
        taskKind: "standard",
        title: "Task B1",
      },
      {
        id: "task-b-2",
        parentTaskId: "task-b",
        percentComplete: 100,
        plannedEndDate: "2026-09-10",
        plannedStartDate: "2026-09-09",
        status: "done",
        taskKind: "standard",
        title: "Task B2",
      },
    ] as ApiTask[]);

    expect(tasks.find((task) => task.id === "summary")).toEqual(
      expect.objectContaining({
        percentComplete: 67,
        phaseProgress: 67,
      }),
    );
  });
});
