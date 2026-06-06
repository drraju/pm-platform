import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskTable } from "@/components/tasks/task-table";

describe("TaskTable", () => {
  it("renders overdue and due-this-week indicators", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));

    render(
      <TaskTable
        emptyMessage="No tasks"
        isLoading={false}
        tasks={[
          {
            dueDate: "2026-06-05",
            id: "task-overdue",
            priority: "high",
            project: {
              id: "project-1",
              name: "Observability Transformation Programme",
              status: "active",
            },
            projectId: "project-1",
            status: "in_progress",
            title: "Resolve collector rollout blocker",
          },
          {
            dueDate: "2026-06-10",
            id: "task-week",
            priority: "medium",
            project: {
              id: "project-2",
              name: "Customer Experience Platform Upgrade",
              status: "active",
            },
            projectId: "project-2",
            status: "todo",
            title: "Confirm release readiness",
          },
        ]}
      />,
    );

    expect(screen.getByText("Resolve collector rollout blocker")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Confirm release readiness")).toBeInTheDocument();
    expect(screen.getByText("Due this week")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders an empty state", () => {
    render(
      <TaskTable
        emptyMessage="No tasks match the current filters."
        isLoading={false}
        tasks={[]}
      />,
    );

    expect(
      screen.getByText("No tasks match the current filters."),
    ).toBeInTheDocument();
  });
});
