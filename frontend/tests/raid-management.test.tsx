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
});
