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
    parentTaskId: "group-1",
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
    fireEvent.click(screen.getByRole("button", { name: "All 4" }));

    expect(screen.getByRole("button", { name: "Hide Planning" })).toBeTruthy();
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
    expect(screen.getByLabelText("Status for Read API")).toHaveValue("in_progress");
  });

  it("keeps the summary as a folder and folds a task's subtasks", () => {
    renderBoard({
      tasks: [
        ...tasks,
        task({ id: "phase", outlineRole: "phase", taskKind: "summary", title: "Phase 1" }),
        task({ id: "gate", outlineRole: "gate", taskKind: "milestone", title: "Acceptance" }),
        task({ id: "package", parentTaskId: "group-1", title: "Integration 1" }),
        task({ id: "child", parentTaskId: "package", status: "todo", title: "Map source fields" }),
      ],
    });

    expect(screen.queryByText("Phase 1")).toBeNull();
    expect(screen.queryByText("Acceptance")).toBeNull();
    expect(screen.getByRole("button", { name: "Hide Planning" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Integration 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Map source fields" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Fabrix Pipeline" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Hide subtasks of Integration 1" }));
    expect(screen.queryByRole("button", { name: "Map source fields" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show subtasks of Integration 1" }));
    expect(screen.getByRole("button", { name: "Map source fields" })).toBeTruthy();
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

  it("shows who the task is waiting on, and whether that work is blocked, overdue, or done", () => {
    const late = task({
      assignee: { email: "ava@example.com", firstName: "Ava", id: "user-1", lastName: "Patel" },
      assigneeId: "user-1",
      dueDate: "2026-10-01",
      id: "task-late",
      parentTaskId: "group-1",
      status: "in_progress",
      title: "Late review",
    });
    const finished = task({
      assignee: { email: "ben@example.com", firstName: "Ben", id: "user-2", lastName: "Ng" },
      assigneeId: "user-2",
      id: "task-finished",
      parentTaskId: "group-1",
      status: "done",
      title: "Signed off",
    });
    renderBoard({
      dependencies: [
        { id: "dep-blocked", predecessorTaskId: "task-2", successorTaskId: "task-1" },
        { id: "dep-open", predecessorTaskId: "task-4", successorTaskId: "task-1" },
        { id: "dep-late", predecessorTaskId: "task-late", successorTaskId: "task-4" },
        { id: "dep-done", predecessorTaskId: "task-finished", successorTaskId: "task-3" },
      ],
      tasks: [...tasks, late, finished],
    });
    fireEvent.click(screen.getByRole("button", { name: "All 6" }));

    const readApi = screen.getByRole("button", { name: "Read API" }).closest("tr");
    if (!readApi) throw new Error("Read API row is missing");
    expect(within(readApi).getByText("Waiting on Test2 · Blocked · Unassigned")).toBeTruthy();
    expect(within(readApi).getByText("Waiting on Client · On track · Unassigned")).toBeTruthy();
    expect(within(readApi).queryByLabelText("Depends on for Read API")).toBeNull();

    const client = screen.getByRole("button", { name: "Client" }).closest("tr");
    if (!client) throw new Error("Client row is missing");
    expect(within(client).getByText("Waiting on Late review · Overdue · Ava Patel")).toBeTruthy();

    const fabrix = screen.getByRole("button", { name: "Fabrix Pipeline" }).closest("tr");
    if (!fabrix) throw new Error("Fabrix Pipeline row is missing");
    expect(within(fabrix).getByText("Waiting on Signed off · Done · Ben Ng")).toBeTruthy();

    const test2 = screen.getByRole("button", { name: "Test2" }).closest("tr");
    if (!test2) throw new Error("Test2 row is missing");
    expect(within(test2).getByText("Holding up Read API · Ben Ng")).toBeTruthy();
    expect(screen.getByRole("img", { name: "2 Done, 3 Doing, 1 Blocked" })).toBeTruthy();
  });

  it("limits the board and its counts to one phase", () => {
    renderBoard({
      phaseId: "use-cases",
      tasks: [
        task({ id: "integrations", outlineRole: "phase", taskKind: "summary", title: "Integrations" }),
        task({ id: "oem", outlineRole: "summary", parentTaskId: "integrations", taskKind: "summary", title: "OEM Correlation" }),
        task({ id: "oem-task", parentTaskId: "oem", title: "OEM Staging Rules" }),
        task({ id: "use-cases", outlineRole: "phase", taskKind: "summary", title: "Use cases" }),
        task({ id: "billing", outlineRole: "summary", parentTaskId: "use-cases", taskKind: "summary", title: "Billing" }),
        task({ id: "bill-task", parentTaskId: "billing", status: "in_progress", title: "Map invoices" }),
      ],
    });

    expect(screen.getByRole("button", { name: "Open 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide Billing" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Map invoices" })).toBeTruthy();
    expect(screen.queryByText("OEM Correlation")).toBeNull();
    expect(screen.queryByRole("button", { name: "OEM Staging Rules" })).toBeNull();
  });

  it("collapses and expands only the groups in the current phase", () => {
    const phased = [
      task({ id: "integrations", outlineRole: "phase", taskKind: "summary", title: "Integrations" }),
      task({ id: "oem", outlineRole: "summary", parentTaskId: "integrations", taskKind: "summary", title: "OEM Correlation" }),
      task({ id: "oem-task", parentTaskId: "oem", title: "OEM Staging Rules" }),
      task({ id: "child", parentTaskId: "oem-task", title: "Check the mapping" }),
      task({ id: "use-cases", outlineRole: "phase", taskKind: "summary", title: "Use cases" }),
      task({ id: "billing", outlineRole: "summary", parentTaskId: "use-cases", taskKind: "summary", title: "Billing" }),
      task({ id: "bill-task", parentTaskId: "billing", title: "Map invoices" }),
      task({ id: "finished", outlineRole: "summary", parentTaskId: "use-cases", taskKind: "summary", title: "Finished" }),
      task({ id: "shipped", parentTaskId: "finished", status: "done", title: "Shipped" }),
    ];
    const { rerender } = render(
      <TodayProjectBoard
        canAdd
        canEdit={() => true}
        isSaving={false}
        onAddSubtask={vi.fn()}
        onOpen={vi.fn()}
        onUpdate={vi.fn()}
        phaseId="integrations"
        tasks={phased}
        today="2026-10-30"
        viewCommand={{ action: "collapse", id: 1 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Show OEM Correlation" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "OEM Staging Rules" })).toBeNull();

    rerender(
      <TodayProjectBoard
        canAdd
        canEdit={() => true}
        isSaving={false}
        onAddSubtask={vi.fn()}
        onOpen={vi.fn()}
        onUpdate={vi.fn()}
        phaseId="integrations"
        tasks={phased}
        today="2026-10-30"
        viewCommand={{ action: "expand", id: 2 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Hide OEM Correlation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "OEM Staging Rules" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check the mapping" })).toBeTruthy();

    rerender(
      <TodayProjectBoard
        canAdd
        canEdit={() => true}
        isSaving={false}
        onAddSubtask={vi.fn()}
        onOpen={vi.fn()}
        onUpdate={vi.fn()}
        phaseId="use-cases"
        tasks={phased}
        today="2026-10-30"
        viewCommand={{ action: "expand", id: 2 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Hide Billing" })).toBeTruthy();
    expect(screen.queryByText("OEM Correlation")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "All 2" }));
    expect(screen.getByRole("button", { name: "Show Finished" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Shipped" })).toBeNull();
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
