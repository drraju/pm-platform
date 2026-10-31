import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanTimeline } from "@/components/plan/plan-timeline";
import type { ApiTask } from "@/features/projects";

function task(overrides: Partial<ApiTask> & Pick<ApiTask, "id" | "title">): ApiTask {
  return {
    priority: "medium",
    projectId: "project-1",
    status: "todo",
    taskKind: "standard",
    ...overrides,
  };
}

const tasks: ApiTask[] = [
  task({ dueDate: "2026-10-10", id: "task-a", startDate: "2026-10-06", title: "testing" }),
  task({
    dueDate: "2026-10-20",
    id: "task-b",
    startDate: "2026-10-13",
    status: "blocked",
    title: "Read API",
  }),
  task({ dueDate: "2026-10-18", id: "task-c", status: "in_progress", title: "Client" }),
];

describe("Plan timeline", () => {
  it("draws every dependency on the successor and keeps Blocked as the warning color", () => {
    const { container } = render(
      <PlanTimeline
        dependencies={[
          { id: "dep-1", predecessorTaskId: "task-a", successorTaskId: "task-b" },
          { id: "dep-2", predecessorTaskId: "task-c", successorTaskId: "task-b" },
        ]}
        tasks={tasks}
        today="2026-10-30"
      />,
    );

    expect(screen.getByText("testing")).toBeTruthy();
    expect(screen.getByText("testing · Client")).toBeTruthy();
    expect(container.querySelector("[data-dependency-id='dep-1']")).toBeTruthy();
    expect(container.querySelector("[data-dependency-id='dep-2']")).toBeTruthy();
    expect(container.querySelectorAll("[data-task-id='task-b']")).toHaveLength(1);
    expect(container.querySelector("[data-task-id='task-b']")?.getAttribute("fill")).toBe("#fbbf24");
    expect(container.querySelector("[data-task-id='task-c']")?.getAttribute("fill")).toBe("#0284c7");
    expect(container.querySelector("[data-task-id='task-b']")?.getAttribute("stroke")).toBe("#e11d48");
  });
});
