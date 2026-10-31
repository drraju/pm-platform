import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodayProjectBoard } from "@/components/today/today-project-board";
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
  task({ id: "group-1", taskKind: "summary", title: "Planning" }),
  task({
    assignee: {
      email: "ben@example.com",
      firstName: "Ben",
      id: "user-2",
      lastName: "Ng",
    },
    assigneeId: "user-2",
    id: "task-1",
    nextStep: "Ship the API",
    parentTaskId: "group-1",
    status: "in_progress",
    title: "Read API",
  }),
  task({
    dueDate: "2026-10-01",
    id: "task-2",
    parentTaskId: "task-1",
    status: "blocked",
    title: "Test2",
  }),
  task({
    id: "task-4",
    parentTaskId: "group-1",
    status: "in_progress",
    title: "Client",
  }),
  task({
    id: "task-3",
    parentTaskId: "group-1",
    status: "done",
    title: "Fabrix Pipeline",
  }),
];

function renderBoard(overrides: Partial<React.ComponentProps<typeof TodayProjectBoard>> = {}) {
  const onAddSubtask = vi.fn().mockResolvedValue(undefined);
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  render(
    <TodayProjectBoard
      canAdd
      canAssign
      canEdit={() => true}
      members={[
        {
          role: "manager",
          user: { email: "ava@example.com", firstName: "Ava", lastName: "Patel" },
          userId: "user-1",
        },
        {
          role: "contributor",
          user: { email: "ben@example.com", firstName: "Ben", lastName: "Ng" },
          userId: "user-2",
        },
        {
          role: "viewer",
          user: { email: "view@example.com", firstName: "View", lastName: "Only" },
          userId: "user-3",
        },
      ]}
      isSaving={false}
      onAddSubtask={onAddSubtask}
      onOpen={vi.fn()}
      onUpdate={onUpdate}
      tasks={tasks}
      today="2026-10-30"
      {...overrides}
    />,
  );
  return { onAddSubtask, onUpdate };
}

describe("Today project board", () => {
  it("shows the group, the subtask, and the colored status", () => {
    renderBoard();

    expect(screen.getByRole("button", { name: /Planning/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Read API" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Test2" })).toBeTruthy();

    const doing = screen.getByLabelText("Status for Client");
    expect(doing.className).toContain("bg-sky-600");
    expect(doing).toHaveValue("in_progress");

    const blocked = screen.getByLabelText("Status for Test2");
    expect(blocked.className).toContain("bg-amber-400");

    const done = screen.getByLabelText("Status for Fabrix Pipeline");
    expect(done.className).toContain("bg-emerald-600");

    expect(screen.queryByLabelText("Status for Planning")).toBeNull();
    expect(screen.queryByLabelText("Status for Read API")).toBeNull();
  });

  it("marks an overdue date without changing the status color", () => {
    renderBoard();
    const due = screen.getByLabelText("Due date for Test2");
    expect(due.className).toContain("text-rose-800");
    expect(screen.getByLabelText("Status for Test2").className).not.toContain("rose");
  });

  it("puts the owner in the column beside the task", () => {
    const { onUpdate } = renderBoard();
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers.slice(0, 3)).toEqual(["Task", "Owner", "Status"]);
    expect(screen.queryByLabelText("Depends on for Read API")).toBeNull();

    const row = screen.getByRole("button", { name: "Read API" }).closest("tr");
    if (!row) throw new Error("Read API row is missing");
    const cells = within(row).getAllByRole("cell");
    expect(within(cells[0]).getByRole("button", { name: "Read API" })).toBeTruthy();
    expect(within(cells[1]).getByLabelText("Owner for Read API")).toBeTruthy();
    expect(within(cells[0]).queryByLabelText("Owner for Read API")).toBeNull();

    const owner = within(cells[1]).getByLabelText("Owner for Read API");
    expect(owner).toHaveValue("user-2");
    expect(within(owner).queryByRole("option", { name: "View Only" })).toBeNull();
    fireEvent.change(owner, { target: { value: "user-1" } });
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-1" }),
      { assigneeId: "user-1" },
    );
  });

  it("adds a subtask and saves the next step", async () => {
    const { onAddSubtask, onUpdate } = renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "Add subtask under Read API" }));
    fireEvent.change(screen.getByLabelText("Subtask under Read API"), { target: { value: "Write the client" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save subtask under Read API" }));
    });
    expect(onAddSubtask).toHaveBeenCalledWith({
      parentTaskId: "task-1",
      title: "Write the client",
    });

    const nextStep = screen.getByLabelText("Next step for Test2");
    fireEvent.change(nextStep, { target: { value: "Review the contract" } });
    fireEvent.blur(nextStep);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task-2" }),
      { nextStep: "Review the contract" },
    );
  });
});
