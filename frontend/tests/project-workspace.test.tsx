import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  ProjectWorkspaceRegisterSection,
  formatRaidLabel,
  formatRaidOwner,
} from "@/components/projects/project-workspace-register-section";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";

describe("Project workspace components", () => {
  it("renders the overview with team size", () => {
    render(
      <ProjectWorkspaceOverview
        project={{
          description: "Upgrade customer-facing platform capabilities.",
          id: "project-1",
          members: [
            { id: "member-1", role: "manager", userId: "user-1" },
            { id: "member-2", role: "contributor", userId: "user-2" },
          ],
          name: "Customer Experience Platform Upgrade",
          owner: {
            email: "owner@example.com",
            firstName: "Ava",
            id: "owner-1",
            lastName: "Patel",
            status: "active",
          },
          status: "at_risk",
        }}
      />,
    );

    expect(screen.getByText("Project Name")).toBeInTheDocument();
    expect(
      screen.getByText("Customer Experience Platform Upgrade"),
    ).toBeInTheDocument();
    expect(screen.getByText("Team Size")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders summary metrics", () => {
    render(
      <ProjectWorkspaceSummary
        tasks={[
          {
            id: "task-1",
            priority: "medium",
            projectId: "project-1",
            status: "done",
            title: "Complete discovery",
          },
          {
            id: "task-2",
            priority: "high",
            projectId: "project-1",
            status: "blocked",
            title: "Resolve data dependency",
          },
        ]}
      />,
    );

    expect(screen.getByText("Total Tasks")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("renders team members and tasks", () => {
    render(
      <>
        <ProjectWorkspaceTeam
          members={[
            {
              id: "member-1",
              role: "manager",
              user: {
                email: "ava.patel@example.com",
                firstName: "Ava",
                id: "user-1",
                lastName: "Patel",
                status: "active",
              },
              userId: "user-1",
            },
          ]}
        />
        <ProjectWorkspaceTasks
          tasks={[
            {
              assignee: {
                email: "li.chen@example.com",
                firstName: "Li",
                id: "user-2",
                lastName: "Chen",
                status: "active",
              },
              dueDate: "2026-06-30",
              id: "task-1",
              priority: "high",
              projectId: "project-1",
              status: "in_progress",
              title: "Prepare release plan",
            },
          ]}
        />
      </>,
    );

    expect(screen.getByText("ava.patel@example.com")).toBeInTheDocument();
    expect(screen.getByText("manager")).toBeInTheDocument();
    expect(screen.getByText("Prepare release plan")).toBeInTheDocument();
    expect(screen.getByText("Li Chen")).toBeInTheDocument();
  });

  it("renders empty states", () => {
    render(
      <>
        <ProjectWorkspaceTeam members={[]} />
        <ProjectWorkspaceTasks tasks={[]} />
        <ProjectWorkspaceRegisterSection
          columns={[{ header: "Title", render: (risk) => risk.title }]}
          description="Project risks."
          emptyMessage="No risks yet."
          items={[]}
          title="Risks"
        />
      </>,
    );

    expect(screen.getByText("No members yet.")).toBeInTheDocument();
    expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
    expect(screen.getByText("No risks yet.")).toBeInTheDocument();
  });

  it("renders reusable register sections", () => {
    render(
      <ProjectWorkspaceRegisterSection
        columns={[
          { header: "Title", render: (risk) => risk.title },
          {
            header: "Severity",
            render: (risk) => formatRaidLabel(risk.severity),
          },
          { header: "Owner", render: formatRaidOwner },
          { header: "Status", render: (risk) => formatRaidLabel(risk.status) },
        ]}
        description="Project risks with ownership and current status."
        emptyMessage="No risks yet."
        items={[
          {
            id: "risk-1",
            owner: {
              email: "maria.garcia@example.com",
              firstName: "Maria",
              id: "user-3",
              lastName: "Garcia",
              status: "active",
            },
            projectId: "project-1",
            severity: "high",
            status: "open",
            title: "Supplier onboarding delay",
            type: "risk",
          },
        ]}
        title="Risks"
      />,
    );

    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Supplier onboarding delay")).toBeInTheDocument();
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });
});
