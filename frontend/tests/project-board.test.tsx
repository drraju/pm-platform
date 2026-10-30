import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectBoard } from "@/components/board/project-board";
import type { ApiTask } from "@/features/projects";

const tasks = [
  { id: "container", status: "todo", taskKind: "summary", title: "Integration" },
  {
    assignee: { firstName: "Ada", lastName: "Lovelace" },
    assigneeId: "ada",
    dueDate: "2026-10-11",
    id: "late",
    status: "todo",
    title: "Test2",
  },
  {
    assigneeId: "ada",
    dueDate: "2026-11-01",
    id: "soon",
    status: "in_progress",
    title: "Read API",
  },
] as ApiTask[];

describe("Project board", () => {
  it("keeps containers off the board and clears overdue when a card is done", () => {
    const onMove = vi.fn();
    const { rerender } = render(
      <ProjectBoard canMove={() => true} isSaving={false} onMove={onMove} tasks={tasks} today="2026-10-29" />,
    );

    expect(screen.queryByText("Integration")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Not started column" })).toHaveTextContent("Test2");
    expect(screen.getByRole("region", { name: "Doing column" })).toHaveTextContent("Read API");
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 overdue · 1 container excluded")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move Test2" }));
    fireEvent.click(screen.getByRole("option", { name: "Done" }));
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: "late" }), { status: "done" });

    rerender(
      <ProjectBoard
        canMove={() => true}
        isSaving={false}
        onMove={onMove}
        tasks={tasks.map((task) => (task.id === "late" ? { ...task, status: "done" } : task))}
        today="2026-10-29"
      />,
    );
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(screen.getByText("0 of 2 overdue · 1 container excluded")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Done column" })).toHaveTextContent("Test2");
  });

  it("asks for a next step before a card can land in Blocked", () => {
    const onMove = vi.fn();
    render(<ProjectBoard canMove={() => true} isSaving={false} onMove={onMove} tasks={tasks} today="2026-10-29" />);

    fireEvent.click(screen.getByRole("button", { name: "Move Test2" }));
    fireEvent.click(screen.getByRole("option", { name: "Blocked" }));
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onMove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Move Test2" }));
    fireEvent.click(screen.getByRole("option", { name: "Blocked" }));
    fireEvent.change(screen.getByLabelText("Next step for Test2"), { target: { value: "Wait for the vendor" } });
    fireEvent.click(screen.getByRole("button", { name: "Move to Blocked" }));
    expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ id: "late" }), {
      nextStep: "Wait for the vendor",
      status: "blocked",
    });
  });

  it("lets a viewer read the board and only the owner move their card", () => {
    const { rerender } = render(
      <ProjectBoard canMove={() => false} isSaving={false} onMove={vi.fn()} tasks={tasks} today="2026-10-29" />,
    );
    expect(screen.getByText("Test2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move / })).not.toBeInTheDocument();

    rerender(
      <ProjectBoard
        canMove={(task) => task.assigneeId === "ada"}
        isSaving={false}
        onMove={vi.fn()}
        tasks={[...tasks, { id: "other", status: "todo", title: "Someone else" } as ApiTask]}
        today="2026-10-29"
      />,
    );
    expect(screen.getByRole("button", { name: "Move Test2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move Someone else" })).not.toBeInTheDocument();
  });
});
