import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectHealthCard } from "@/components/projects/project-health-card";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  ProjectWorkspaceRegisterSection,
  formatRaidDate,
  formatRaidLabel,
  formatRaidOwner,
} from "@/components/projects/project-workspace-register-section";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTable } from "@/components/projects/project-workspace-table";
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

  it("renders project health status and reasons", () => {
    render(
      <ProjectHealthCard
        health={{
          reasons: ["2 overdue tasks", "1 high risk"],
          status: "AMBER",
        }}
      />,
    );

    expect(screen.getByText("Health Status")).toBeInTheDocument();
    expect(screen.getByText("Amber")).toBeInTheDocument();
    expect(screen.getByText("Reasons")).toBeInTheDocument();
    expect(screen.getByText("2 overdue tasks")).toBeInTheDocument();
    expect(screen.getByText("1 high risk")).toBeInTheDocument();
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

  it("supports project team add, role update, and remove controls", () => {
    const onAddMember = vi.fn();
    const onRemoveMember = vi.fn();
    const onUpdateMember = vi.fn();

    render(
      <ProjectWorkspaceTeam
        availableUsers={[
          {
            email: "nora.bennett@example.com",
            firstName: "Nora",
            id: "user-2",
            lastName: "Bennett",
            status: "active",
          },
        ]}
        members={[
          {
            id: "member-1",
            role: "contributor",
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
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
        onUpdateMember={onUpdateMember}
      />,
    );

    fireEvent.change(screen.getByLabelText(/add member/i), {
      target: { value: "user-2" },
    });
    fireEvent.change(screen.getByLabelText(/role in project/i), {
      target: { value: "manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(onAddMember).toHaveBeenCalledWith({
      role: "manager",
      userId: "user-2",
    });

    const memberRow = screen.getByText("ava.patel@example.com").closest("article");
    expect(memberRow).not.toBeNull();
    fireEvent.change(within(memberRow as HTMLElement).getByDisplayValue("Contributor"), {
      target: { value: "viewer" },
    });
    expect(onUpdateMember).toHaveBeenCalledWith("member-1", {
      role: "viewer",
    });

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onRemoveMember).toHaveBeenCalledWith("member-1");
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
            header: "Probability",
            render: (risk) => formatRaidLabel(risk.probability),
          },
          {
            header: "Impact",
            render: (risk) => formatRaidLabel(risk.impact),
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
            impact: "high",
            probability: "medium",
            projectId: "project-1",
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
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders Phase 2 register sections with required columns and values", () => {
    render(
      <div>
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (risk) => risk.title },
            { header: "Status", render: (risk) => formatRaidLabel(risk.status) },
            {
              header: "Probability",
              render: (risk) => formatRaidLabel(risk.probability),
            },
            { header: "Impact", render: (risk) => formatRaidLabel(risk.impact) },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Project risks with ownership and current status."
          emptyMessage="No risks yet."
          items={[
            {
              id: "risk-1",
              impact: "high",
              owner: {
                email: "maria.garcia@example.com",
                firstName: "Maria",
                id: "user-3",
                lastName: "Garcia",
                status: "active",
              },
              probability: "medium",
              projectId: "project-1",
              status: "open",
              title: "Supplier onboarding delay",
              type: "risk",
            },
          ]}
          title="Risks"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (issue) => issue.title },
            {
              header: "Status",
              render: (issue) => formatRaidLabel(issue.status),
            },
            {
              header: "Severity",
              render: (issue) => formatRaidLabel(issue.severity),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Open and tracked issues affecting delivery."
          emptyMessage="No issues yet."
          items={[
            {
              id: "issue-1",
              owner: {
                email: "li.chen@example.com",
                firstName: "Li",
                id: "user-2",
                lastName: "Chen",
                status: "active",
              },
              projectId: "project-1",
              severity: "critical",
              status: "open",
              title: "Integration outage",
              type: "issue",
            },
          ]}
          title="Issues"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (assumption) => assumption.title },
            {
              header: "Status",
              render: (assumption) => formatRaidLabel(assumption.status),
            },
            {
              header: "Validation Status",
              render: (assumption) => formatRaidLabel(assumption.validationStatus),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Delivery assumptions and their validation state."
          emptyMessage="No assumptions yet."
          items={[
            {
              id: "assumption-1",
              owner: {
                email: "ava.patel@example.com",
                firstName: "Ava",
                id: "user-1",
                lastName: "Patel",
                status: "active",
              },
              projectId: "project-1",
              status: "active",
              title: "Vendor API remains available",
              type: "assumption",
              validationStatus: "validated",
            },
          ]}
          title="Assumptions"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (dependency) => dependency.title },
            {
              header: "Status",
              render: (dependency) => formatRaidLabel(dependency.status),
            },
            {
              header: "Depends On",
              render: (dependency) => dependency.dependsOn ?? "Not set",
            },
            {
              header: "Due Date",
              render: (dependency) => formatRaidDate(dependency.dueDate),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Internal and external dependencies for the project."
          emptyMessage="No dependencies yet."
          items={[
            {
              dependsOn: "Security review",
              dueDate: "2026-06-30",
              id: "dependency-1",
              owner: {
                email: "noah.smith@example.com",
                firstName: "Noah",
                id: "user-4",
                lastName: "Smith",
                status: "active",
              },
              projectId: "project-1",
              status: "pending",
              title: "IAM approval",
              type: "dependency",
            },
          ]}
          title="Dependencies"
        />
      </div>,
    );

    const risks = screen.getByRole("heading", { name: "Risks" }).closest("section");
    const issues = screen.getByRole("heading", { name: "Issues" }).closest("section");
    const assumptions = screen
      .getByRole("heading", { name: "Assumptions" })
      .closest("section");
    const dependencies = screen
      .getByRole("heading", { name: "Dependencies" })
      .closest("section");

    expect(risks).not.toBeNull();
    expect(issues).not.toBeNull();
    expect(assumptions).not.toBeNull();
    expect(dependencies).not.toBeNull();

    expect(within(risks as HTMLElement).getByRole("columnheader", { name: "Probability" })).toBeInTheDocument();
    expect(within(risks as HTMLElement).getByRole("columnheader", { name: "Impact" })).toBeInTheDocument();
    expect(within(risks as HTMLElement).getByText("Supplier onboarding delay")).toBeInTheDocument();
    expect(within(risks as HTMLElement).getByText("Maria Garcia")).toBeInTheDocument();

    expect(within(issues as HTMLElement).getByRole("columnheader", { name: "Severity" })).toBeInTheDocument();
    expect(within(issues as HTMLElement).getByText("Integration outage")).toBeInTheDocument();
    expect(within(issues as HTMLElement).getByText("critical")).toBeInTheDocument();

    expect(within(assumptions as HTMLElement).getByRole("columnheader", { name: "Validation Status" })).toBeInTheDocument();
    expect(within(assumptions as HTMLElement).getByText("Vendor API remains available")).toBeInTheDocument();
    expect(within(assumptions as HTMLElement).getByText("validated")).toBeInTheDocument();

    expect(within(dependencies as HTMLElement).getByRole("columnheader", { name: "Depends On" })).toBeInTheDocument();
    expect(within(dependencies as HTMLElement).getByRole("columnheader", { name: "Due Date" })).toBeInTheDocument();
    expect(within(dependencies as HTMLElement).getByText("Security review")).toBeInTheDocument();
    expect(
      within(dependencies as HTMLElement).getByText(formatRaidDate("2026-06-30")),
    ).toBeInTheDocument();
  });

  it("renders workspace table loading state", () => {
    render(
      <ProjectWorkspaceTable
        columns={[{ header: "Title", render: (item) => item.title }]}
        emptyMessage="No records yet."
        isLoading
        items={[]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Title" })).toBeInTheDocument();
    expect(screen.queryByText("No records yet.")).not.toBeInTheDocument();
  });
});
