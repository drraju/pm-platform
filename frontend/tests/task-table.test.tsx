import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskTable } from "@/components/tasks/task-table";

describe("TaskTable", () => {
  it("renders compact My Tasks columns with Priority and without Owner", () => {
    render(
      <TaskTable
        emptyMessage="No tasks"
        isLoading={false}
        tasks={[
          {
            dueDate: "2026-06-05",
            id: "task-overdue",
            latestExecutionUpdate: {
              id: "update-1",
              nextStep: "Confirm API owner",
              percentComplete: 40,
              priority: "high",
              projectId: "project-1",
              status: "in_progress",
              taskId: "task-overdue",
            },
            percentComplete: 40,
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
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Next Step" })).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Owner" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Next Owner" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
    expect(screen.getByText("Confirm API owner")).toBeInTheDocument();
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

  it("keeps Priority read-only for Team Members", () => {
    render(
      <TaskTable
        currentUserId="user-1"
        emptyMessage="No tasks"
        isLoading={false}
        onRecordExecutionUpdate={vi.fn()}
        permissionKeys={["project.read", "task.update"]}
        roleNames={["TEAM_MEMBER"]}
        tasks={[
          {
            assigneeId: "user-1",
            dueDate: "2026-06-10",
            id: "task-1",
            percentComplete: 20,
            priority: "high",
            project: {
              id: "project-1",
              name: "ERP",
              status: "active",
            },
            projectId: "project-1",
            status: "todo",
            title: "Ship assigned work",
          },
        ]}
      />,
    );

    expect(screen.queryByLabelText("Priority for Ship assigned work")).not.toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("allows Project Managers to edit Priority", async () => {
    const onRecordExecutionUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskTable
        currentUserId="user-pm"
        emptyMessage="No tasks"
        isLoading={false}
        membersByProjectId={{
          "project-1": [
            {
              id: "member-1",
              role: "manager",
              userId: "user-pm",
              user: {
                email: "pm@example.com",
                firstName: "Pat",
                id: "user-pm",
                lastName: "Manager",
                status: "active",
              },
            },
          ],
        }}
        onRecordExecutionUpdate={onRecordExecutionUpdate}
        permissionKeys={[
          "project.read",
          "project.update",
          "task.update",
          "task.reassign",
        ]}
        roleNames={["PROJECT_MANAGER"]}
        tasks={[
          {
            assigneeId: "user-pm",
            dueDate: "2026-06-10",
            id: "task-1",
            percentComplete: 20,
            priority: "medium",
            project: {
              id: "project-1",
              name: "ERP",
              status: "active",
            },
            projectId: "project-1",
            status: "todo",
            title: "Ship assigned work",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Priority for Ship assigned work"), {
      target: { value: "high" },
    });
    fireEvent.blur(screen.getByLabelText("Priority for Ship assigned work"));

    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "task-1" }),
        expect.objectContaining({
          priority: "high",
        }),
      );
    });
  });

  it("saves assigned execution updates through the shared payload path", async () => {
    const onRecordExecutionUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskTable
        currentUserId="user-1"
        emptyMessage="No tasks"
        isLoading={false}
        onRecordExecutionUpdate={onRecordExecutionUpdate}
        permissionKeys={["project.read", "task.update"]}
        roleNames={["TEAM_MEMBER"]}
        tasks={[
          {
            assigneeId: "user-1",
            dueDate: "2026-06-10",
            id: "task-1",
            percentComplete: 20,
            priority: "medium",
            project: {
              id: "project-1",
              name: "ERP",
              status: "active",
            },
            projectId: "project-1",
            status: "todo",
            title: "Ship assigned work",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Status for Ship assigned work"), {
      target: { value: "in_progress" },
    });
    fireEvent.change(screen.getByLabelText("Next step for Ship assigned work"), {
      target: { value: "Complete unit tests" },
    });
    fireEvent.blur(screen.getByLabelText("Next step for Ship assigned work"));

    await waitFor(() => {
      expect(onRecordExecutionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "task-1" }),
        expect.objectContaining({
          nextStep: "Complete unit tests",
          percentComplete: 20,
          priority: "medium",
          status: "in_progress",
        }),
      );
    });
  });
});
