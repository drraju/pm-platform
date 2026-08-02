import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
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

  it("renders the latest next step with one-line truncation and tooltip", () => {
    const longNextStep =
      "Confirm the revised API owner, prepare the cutover note, and send the final dependency summary to the steering group.";

    render(
      <TaskTable
        emptyMessage="No tasks"
        isLoading={false}
        tasks={[
          {
            dueDate: "2026-06-10",
            id: "task-next-step",
            latestExecutionUpdate: {
              id: "update-2",
              nextStep: longNextStep,
              percentComplete: 40,
              priority: "high",
              projectId: "project-1",
              status: "in_progress",
              taskId: "task-next-step",
            },
            priority: "high",
            project: {
              id: "project-1",
              name: "Customer Experience Platform Upgrade",
              status: "active",
            },
            projectId: "project-1",
            status: "in_progress",
            title: "Confirm release readiness",
          },
          {
            dueDate: "2026-06-12",
            id: "task-no-update",
            priority: "medium",
            project: {
              id: "project-1",
              name: "Customer Experience Platform Upgrade",
              status: "active",
            },
            projectId: "project-1",
            status: "todo",
            title: "Prepare follow-up notes",
          },
        ]}
      />,
    );

    const nextStepCell = screen.getByText(longNextStep);
    expect(nextStepCell).toHaveClass("truncate");
    expect(nextStepCell).toHaveAttribute("title", longNextStep);
    expect(screen.getAllByText("Next Step:")).toHaveLength(2);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("submits inline task operation updates", () => {
    const onUpdateTask = vi.fn();

    render(
      <TaskTable
        currentUserId="user-1"
        emptyMessage="No tasks"
        isLoading={false}
        membersByProjectId={{
          "project-1": [
            {
              id: "member-2",
              role: "contributor",
              user: {
                email: "nora.bennett@example.com",
                firstName: "Nora",
                id: "user-2",
                lastName: "Bennett",
                status: "active",
              },
              userId: "user-2",
            },
          ],
        }}
        onUpdateTask={onUpdateTask}
        permissionKeys={["task.update"]}
        tasks={[
          {
            assigneeId: "user-1",
            dueDate: "2026-06-10",
            id: "task-ops",
            percentComplete: 20,
            priority: "medium",
            project: {
              id: "project-1",
              name: "Customer Experience Platform Upgrade",
              status: "active",
            },
            projectId: "project-1",
            remarks: "Initial note",
            status: "todo",
            title: "Confirm release readiness",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "in_progress" },
    });
    fireEvent.change(screen.getByLabelText(/complete %/i), {
      target: { value: "55" },
    });
    fireEvent.change(screen.getByLabelText(/remarks/i), {
      target: { value: "Validated pilot scope." },
    });
    fireEvent.change(screen.getByLabelText(/reassign/i), {
      target: { value: "user-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save updates/i }));

    expect(onUpdateTask).toHaveBeenCalledWith("task-ops", {
      assigneeId: "user-2",
      percentComplete: 55,
      remarks: "Validated pilot scope.",
      status: "in_progress",
    });
  });

  it("preserves null when inline reassignment clears the assignee", () => {
    const onUpdateTask = vi.fn();

    render(
      <TaskTable
        currentUserId="user-1"
        emptyMessage="No tasks"
        isLoading={false}
        membersByProjectId={{
          "project-1": [
            {
              id: "member-1",
              role: "contributor",
              user: {
                email: "alex.morgan@example.com",
                firstName: "Alex",
                id: "user-1",
                lastName: "Morgan",
                status: "active",
              },
              userId: "user-1",
            },
          ],
        }}
        onUpdateTask={onUpdateTask}
        permissionKeys={["task.update"]}
        tasks={[
          {
            assigneeId: "user-1",
            dueDate: "2026-06-10",
            id: "task-clear-assignee",
            percentComplete: 20,
            priority: "medium",
            project: {
              id: "project-1",
              name: "Customer Experience Platform Upgrade",
              status: "active",
            },
            projectId: "project-1",
            remarks: "Initial note",
            status: "todo",
            title: "Confirm release readiness",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText(/reassign/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save updates/i }));

    expect(onUpdateTask).toHaveBeenCalledWith("task-clear-assignee", {
      assigneeId: null,
      percentComplete: 20,
      remarks: "Initial note",
      status: "todo",
    });
  });
});
