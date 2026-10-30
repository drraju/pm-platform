import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectRaidRegister } from "@/components/projects/project-raid-register";
import type { ApiRaidItem } from "@/lib/api/client";

const items: ApiRaidItem[] = [
  {
    id: "risk-1",
    owner: {
      email: "lead@example.com",
      firstName: "Mina",
      id: "user-1",
      lastName: "Shah",
      status: "active",
    },
    projectId: "project-1",
    status: "monitoring",
    title: "Supplier delay",
    type: "risk",
  },
  {
    dueDate: "2026-12-15",
    id: "issue-1",
    projectId: "project-1",
    status: "in_progress",
    title: "Integration outage",
    type: "issue",
  },
];

describe("ProjectRaidRegister", () => {
  it("shows recorded items in words and hides the add form without permission", () => {
    render(
      <ProjectRaidRegister
        canAdd={false}
        canUpdate={false}
        items={items}
        members={[]}
        onCreate={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Supplier delay")).toBeInTheDocument();
    expect(screen.getByText("Mina Shah")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Doing")).toBeInTheDocument();
    expect(screen.getByText("2026-12-15")).toBeInTheDocument();
    expect(screen.queryByText("in_progress")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
    expect(screen.getByText("No assumptions recorded.")).toBeInTheDocument();
  });

  it("adds a risk with the title the lead typed", async () => {
    const onCreate = vi.fn();
    render(
      <ProjectRaidRegister
        canAdd
        canUpdate
        items={[]}
        members={[
          {
            id: "member-1",
            projectId: "project-1",
            role: "owner",
            user: {
              email: "lead@example.com",
              firstName: "Mina",
              id: "user-1",
              lastName: "Shah",
              status: "active",
            },
            userId: "user-1",
          },
        ]}
        onCreate={onCreate}
        onStatusChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Late hardware" },
    });
    fireEvent.change(screen.getByLabelText("Owner"), {
      target: { value: "user-1" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
    });

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "user-1",
        title: "Late hardware",
        type: "risk",
      }),
    );
  });
});
