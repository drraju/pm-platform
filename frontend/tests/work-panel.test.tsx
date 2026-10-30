import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkPanel } from "@/components/work/work-panel";
import type { ApiTask } from "@/features/projects";

const task = {
  assignee: { firstName: "Ada", lastName: "Lovelace" },
  id: "task-1",
  status: "in_progress",
  title: "Read API",
} as ApiTask;

describe("Work panel", () => {
  it("keeps a comment from changing status", () => {
    const onComment = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn();
    render(
      <WorkPanel
        canComment
        canEditTitle
        isSaving={false}
        onClose={vi.fn()}
        onComment={onComment}
        onLoadComments={vi.fn().mockResolvedValue([])}
        onUpdate={onUpdate}
        task={task}
      />,
    );

    expect(screen.getByText("Owner: Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/Status stays Doing/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "Asked the vendor" } });
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
    expect(onComment).toHaveBeenCalledWith("task-1", "Asked the vendor");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("lets a lead set the owner without leaving the list", () => {
    const onUpdate = vi.fn();
    render(
      <WorkPanel
        canAssign
        canComment={false}
        canEditTitle
        isSaving={false}
        members={[
          {
            role: "contributor",
            user: { firstName: "Ada", lastName: "Lovelace" },
            userId: "user-2",
          },
          {
            role: "viewer",
            user: { firstName: "View", lastName: "Only" },
            userId: "user-9",
          },
        ]}
        onClose={vi.fn()}
        onComment={vi.fn()}
        onLoadComments={vi.fn()}
        onUpdate={onUpdate}
        task={task}
      />,
    );

    expect(screen.queryByRole("option", { name: "View Only" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Owner"), { target: { value: "user-2" } });
    expect(onUpdate).toHaveBeenCalledWith(task, { assigneeId: "user-2" });
  });

  it("does not offer comments on a container", () => {
    render(
      <WorkPanel
        canComment={false}
        canEditTitle={false}
        isSaving={false}
        onClose={vi.fn()}
        onComment={vi.fn()}
        onLoadComments={vi.fn()}
        onUpdate={vi.fn()}
        task={{ ...task, taskKind: "summary", title: "Integration" }}
      />,
    );

    expect(screen.getByText("A container does not take comments.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add comment" })).not.toBeInTheDocument();
  });
});
