import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  const onAddDependency = vi.fn().mockResolvedValue(undefined);
  const onAddSubtask = vi.fn().mockResolvedValue(undefined);
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  render(
    <TodayProjectBoard
      canAdd
      canEdit={() => true}
      dependencies={[
        {
          id: "dep-1",
          predecessorTaskId: "task-3",
          successorTaskId: "task-1",
        },
      ]}
      isSaving={false}
      onAddDependency={onAddDependency}
      onAddSubtask={onAddSubtask}
      onOpen={vi.fn()}
      onUpdate={onUpdate}
      tasks={tasks}
      today="2026-10-30"
      {...overrides}
    />,
  );
  return { onAddDependency, onAddSubtask, onUpdate };
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

  it("shows the predecessor and adds a dependency", () => {
    const { onAddDependency } = renderBoard();
    expect(screen.getAllByText("Fabrix Pipeline").length).toBeGreaterThan(1);
    fireEvent.change(screen.getByLabelText("Depends on for Test2"), { target: { value: "task-3" } });
    expect(onAddDependency).toHaveBeenCalledWith({
      predecessorTaskId: "task-3",
      successorTaskId: "task-2",
    });
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
