import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  RaidManagement,
} from "@/components/raid/raid-management";

const projects = [
  {
    id: "project-1",
    name: "Customer Experience Platform Upgrade",
    status: "active",
  },
];

const users = [
  {
    email: "owner@example.com",
    firstName: "Ava",
    id: "user-1",
    lastName: "Patel",
  },
];

const permissions = {
  canCreate: true,
  canDelete: true,
  canUpdate: true,
  currentUserId: "user-1",
};

describe("RaidManagement", () => {
  it("creates a risk from the modal", async () => {
    const onCreate = vi.fn();

    render(
      <RaidManagement
        emptyMessage="No risks yet."
        fixedProjectId="project-1"
        fixedType="risk"
        items={[]}
        onCreate={onCreate}
        permissions={permissions}
        projects={projects}
        title="Risks"
        users={users}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create risk/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Supplier onboarding delay" },
    });
    fireEvent.change(screen.getByLabelText(/mitigation/i), {
      target: { value: "Escalate with procurement" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mitigationPlan: "Escalate with procurement",
          projectId: "project-1",
          title: "Supplier onboarding delay",
          type: "risk",
        }),
      );
    });
  });

  it("limits owner choices to the current project team when members are provided", () => {
    render(
      <RaidManagement
        emptyMessage="No risks yet."
        fixedProjectId="project-1"
        fixedType="risk"
        items={[]}
        onCreate={vi.fn()}
        permissions={permissions}
        projectMembers={[
          {
            id: "member-2",
            role: "contributor",
            user: {
              email: "team@example.com",
              firstName: "Team",
              id: "user-2",
              lastName: "Member",
              status: "active",
            },
            userId: "user-2",
          },
        ]}
        projects={projects}
        title="Risks"
        users={[
          ...users,
          {
            email: "outsider@example.com",
            firstName: "Outside",
            id: "user-out",
            lastName: "User",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create risk/i }));

    const ownerSelect = within(screen.getByRole("dialog")).getByLabelText(/owner/i);
    expect(within(ownerSelect).getByRole("option", { name: "Team Member" })).toBeInTheDocument();
    expect(
      within(ownerSelect).queryByRole("option", { name: "Outside User" }),
    ).not.toBeInTheDocument();
  });

  it("edits an issue", async () => {
    const onUpdate = vi.fn();

    render(
      <RaidManagement
        emptyMessage="No issues yet."
        fixedProjectId="project-1"
        fixedType="issue"
        items={[
          {
            id: "issue-1",
            ownerId: "user-1",
            projectId: "project-1",
            status: "open",
            title: "Integration outage",
            type: "issue",
          },
        ]}
        onUpdate={onUpdate}
        permissions={permissions}
        projects={projects}
        title="Issues"
        users={users}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Integration outage resolved" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        "issue-1",
        expect.objectContaining({
          title: "Integration outage resolved",
          type: "issue",
        }),
      );
    });
  });

  it("confirms delete before deleting a dependency", async () => {
    const onDelete = vi.fn();

    render(
      <RaidManagement
        emptyMessage="No dependencies yet."
        fixedProjectId="project-1"
        fixedType="dependency"
        items={[
          {
            id: "dependency-1",
            projectId: "project-1",
            status: "pending",
            title: "IAM approval",
            type: "dependency",
          },
        ]}
        onDelete={onDelete}
        permissions={permissions}
        projects={projects}
        title="Dependencies"
        users={users}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /^delete$/i,
      }),
    );

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith("dependency-1");
    });
  });

  it("shows RAID comments and history when editing an item and lets users add comments", async () => {
    const onAddComment = vi.fn();

    render(
      <RaidManagement
        emptyMessage="No risks yet."
        fixedProjectId="project-1"
        fixedType="risk"
        items={[
          {
            comments: [
              {
                author: {
                  email: "owner@example.com",
                  firstName: "Ava",
                  id: "user-1",
                  lastName: "Patel",
                  status: "active",
                },
                authorId: "user-1",
                body: "Need procurement mitigation by Friday.",
                createdAt: "2026-06-13T09:00:00.000Z",
                id: "comment-1",
                projectId: "project-1",
                raidItemId: "risk-1",
                raidType: "risk",
                updatedAt: "2026-06-13T09:00:00.000Z",
              },
            ],
            history: [
              {
                action: "status_changed",
                actor: {
                  email: "owner@example.com",
                  firstName: "Ava",
                  id: "user-1",
                  lastName: "Patel",
                  status: "active",
                },
                actorId: "user-1",
                createdAt: "2026-06-13T10:00:00.000Z",
                id: "history-1",
                nextValue: "mitigating",
                previousValue: "open",
                projectId: "project-1",
                raidItemId: "risk-1",
                raidType: "risk",
                updatedAt: "2026-06-13T10:00:00.000Z",
              },
            ],
            id: "risk-1",
            ownerId: "user-1",
            projectId: "project-1",
            status: "open",
            title: "Supplier onboarding delay",
            type: "risk",
          },
        ]}
        onAddComment={onAddComment}
        onUpdate={vi.fn()}
        permissions={permissions}
        projects={projects}
        title="Risks"
        users={users}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByText(/need procurement mitigation by friday/i)).toBeInTheDocument();
    expect(screen.getByText(/status changed/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/add comment/i), {
      target: { value: "Escalated with procurement lead." },
    });
    fireEvent.click(screen.getByRole("button", { name: /add comment/i }));

    await waitFor(() => {
      expect(onAddComment).toHaveBeenCalledWith(
        "risk-1",
        "Escalated with procurement lead.",
      );
    });
  });
});
