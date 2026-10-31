import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanOutline } from "@/components/plan/plan-outline";
import type { ApiTask } from "@/features/projects";

const tasks = [
  {
    id: "container",
    priority: "medium",
    projectId: "project-1",
    status: "todo",
    taskKind: "summary",
    title: "Integration",
  },
  {
    assignee: { email: "ada@example.com", firstName: "Ada", id: "user-2", lastName: "Lovelace" },
    assigneeId: "user-2",
    dueDate: "2026-10-13",
    id: "mine",
    parentTaskId: "container",
    priority: "medium",
    projectId: "project-1",
    status: "in_progress",
    title: "Read API",
  },
  {
    assigneeId: "user-9",
    dueDate: "2026-10-11",
    id: "theirs",
    parentTaskId: "container",
    priority: "medium",
    projectId: "project-1",
    status: "todo",
    title: "Other work",
  },
] as ApiTask[];

describe("Plan outline", () => {
  it("lets a lead change finish and hides a status menu on a container", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanOutline
        canAdd
        canEditDates
        canEditStatus={() => true}
        isSaving={false}
        onAdd={vi.fn()}
        onReorder={vi.fn()}
        onUpdate={onUpdate}
        tasks={tasks}
        today="2026-10-29"
      />,
    );

    expect(screen.getByRole("button", { name: "Add work" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Status for Integration")).not.toBeInTheDocument();
    expect(screen.getByText("2 of 2 overdue · 1 container")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Finish for Read API"), { target: { value: "2026-11-15" } });
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "mine" }), { dueDate: "2026-11-15" });
    expect(screen.getByLabelText("Reorder Read API")).toBeInTheDocument();
  });

  it("lets a contributor change only their own status", () => {
    render(
      <PlanOutline
        canAdd={false}
        canEditDates={false}
        canEditStatus={(task) => task.assigneeId === "user-2"}
        isSaving={false}
        onAdd={vi.fn()}
        onReorder={vi.fn()}
        onUpdate={vi.fn()}
        tasks={tasks}
        today="2026-10-29"
      />,
    );

    expect(screen.getByLabelText("Status for Read API")).toBeEnabled();
    expect(screen.queryByLabelText("Status for Other work")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Finish for Other work")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Finish for Read API")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Reorder/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add work" })).not.toBeInTheDocument();
    expect(screen.getByText("11 Oct")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
  });

  it("collapses a container without offering it a status", () => {
    render(
      <PlanOutline
        canAdd={false}
        canEditDates
        canEditStatus={() => true}
        isSaving={false}
        onAdd={vi.fn()}
        onReorder={vi.fn()}
        onUpdate={vi.fn()}
        tasks={tasks}
        today="2026-10-29"
      />,
    );

    expect(screen.getByText("0/2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide Integration" }));
    expect(screen.queryByText("Read API")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Integration" })).toBeInTheDocument();
  });

  it("offers Add work when the plan is empty", () => {
    render(
      <PlanOutline
        canAdd
        canEditDates
        canEditStatus={() => false}
        isSaving={false}
        onAdd={vi.fn().mockResolvedValue(undefined)}
        onReorder={vi.fn()}
        onUpdate={vi.fn()}
        tasks={[]}
        today="2026-10-29"
      />,
    );

    expect(screen.getByRole("button", { name: "Add work" })).toBeDisabled();
    expect(screen.getByText("0 of 0 overdue · 0 containers")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Regenerate/i })).not.toBeInTheDocument();
  });

  it("assigns a project member and starts a subtask under a row", () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <PlanOutline
        canAdd
        canEditDates
        canEditStatus={() => true}
        isSaving={false}
        members={[
          {
            role: "contributor",
            user: { email: "ada@example.com", firstName: "Ada", id: "user-2", lastName: "Lovelace" },
            userId: "user-2",
          },
          {
            role: "viewer",
            user: { email: "view@example.com", firstName: "View", id: "user-9", lastName: "Only" },
            userId: "user-9",
          },
        ]}
        onAdd={onAdd}
        onReorder={vi.fn()}
        onUpdate={onUpdate}
        tasks={tasks}
        today="2026-10-29"
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Finish" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Owner for Other work" }));
    expect(screen.queryByRole("option", { name: /View Only/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Ada Lovelace/ }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "theirs" }), { assigneeId: "user-2" });

    fireEvent.click(screen.getByRole("button", { name: "Add subtask under Integration" }));
    fireEvent.change(screen.getByLabelText("Subtask title"), { target: { value: "Contract" } });
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(onAdd).toHaveBeenCalledWith({ parentTaskId: "container", title: "Contract" });
  });

  it("opens a work item without leaving the plan", () => {
    const onOpen = vi.fn();
    render(
      <PlanOutline
        canAdd={false}
        canEditDates={false}
        canEditStatus={() => false}
        isSaving={false}
        onAdd={vi.fn()}
        onOpen={onOpen}
        onReorder={vi.fn()}
        onUpdate={vi.fn()}
        tasks={tasks}
        today="2026-10-29"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read API" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "mine" }));
  });

  it("adds a dependency on the plan row", () => {
    const onAddDependency = vi.fn().mockResolvedValue(undefined);
    const followUp = {
      id: "follow-up",
      priority: "medium",
      projectId: "project-1",
      status: "todo",
      taskKind: "standard",
      title: "Follow up",
    } as ApiTask;
    render(
      <PlanOutline
        canAdd
        canEditDates
        canEditStatus={() => true}
        dependencies={[{ id: "dep-1", predecessorTaskId: "theirs", successorTaskId: "mine" }]}
        isSaving={false}
        onAdd={vi.fn()}
        onAddDependency={onAddDependency}
        onReorder={vi.fn()}
        onUpdate={vi.fn()}
        tasks={[...tasks, followUp]}
        today="2026-10-29"
      />,
    );

    const select = screen.getByLabelText("Depends on for Read API");
    const row = select.closest("tr");
    if (!row) throw new Error("Read API row is missing");
    expect(within(row).getByText("Other work")).toBeTruthy();
    fireEvent.change(select, { target: { value: "follow-up" } });
    expect(onAddDependency).toHaveBeenCalledWith({
      predecessorTaskId: "follow-up",
      successorTaskId: "mine",
    });
  });
});
