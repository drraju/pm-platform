import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectHealthCard } from "@/components/projects/project-health-card";
import { ProjectSummary } from "@/components/project/project-summary";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  ProjectWorkspaceRegisterSection,
  formatRaidDate,
  formatRaidLabel,
  formatRaidOwner,
} from "@/components/projects/project-workspace-register-section";
import { ProjectWorkspaceBaselines } from "@/components/projects/project-workspace-baselines";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTable } from "@/components/projects/project-workspace-table";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";

describe("Project workspace components", () => {
  it("renders an action-oriented project overview", () => {
    render(
      <ProjectWorkspaceOverview
        project={{
          description: "Upgrade customer-facing platform capabilities.",
          id: "project-1",
          assumptions: [
            {
              id: "assumption-1",
              projectId: "project-1",
              status: "open",
              title: "Vendor contract will be approved",
              type: "assumption",
            },
            {
              id: "decision-1",
              projectId: "project-1",
              status: "approved",
              title: "Decision: Use phased rollout",
              type: "assumption",
            },
          ],
          businessOwner: {
            email: "bo@example.com",
            firstName: "Maya",
            id: "business-owner-1",
            lastName: "Singh",
            status: "active",
          },
          dependencies: [
            {
              id: "dependency-1",
              projectId: "project-1",
              status: "open",
              title: "Security review",
              type: "dependency",
            },
          ],
          health: {
            reasons: ["Supplier onboarding requires attention"],
            status: "AMBER",
          },
          issues: [
            {
              id: "issue-1",
              projectId: "project-1",
              status: "closed",
              title: "Environment outage",
              type: "issue",
            },
          ],
          members: [
            {
              createdAt: "2026-05-02",
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
          risks: [
            {
              id: "risk-1",
              projectId: "project-1",
              status: "open",
              title: "Supplier delay",
              type: "risk",
            },
          ],
          startDate: "2026-05-01",
          status: "at_risk",
          targetEndDate: "2026-12-15",
          tasks: [
            {
              actualEndDate: "2026-05-10",
              id: "task-1",
              percentComplete: 100,
              priority: "medium",
              projectId: "project-1",
              status: "done",
              title: "Complete discovery",
            },
            {
              assignee: {
                email: "li.chen@example.com",
                firstName: "Li",
                id: "user-2",
                lastName: "Chen",
                status: "active",
              },
              id: "milestone-1",
              milestoneCategory: "release",
              plannedEndDate: "2026-09-15",
              priority: "high",
              projectId: "project-1",
              status: "todo",
              taskKind: "milestone",
              title: "Beta Release",
            },
            {
              id: "milestone-2",
              milestoneCategory: "go_live",
              plannedEndDate: "2026-11-20",
              priority: "high",
              projectId: "project-1",
              status: "todo",
              taskKind: "milestone",
              title: "Go Live",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Project Health")).toBeInTheDocument();
    expect(screen.getByText("Overall Health")).toBeInTheDocument();
    expect(screen.getByText("Amber")).toHaveAccessibleDescription(
      "Supplier onboarding requires attention",
    );
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Project Manager")).toBeInTheDocument();
    expect(screen.getByText("Completion")).toBeInTheDocument();
    expect(screen.getByText("Timeline Snapshot")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", { name: "Project timeline checkpoints" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(5);
    expect(screen.queryByText("AI Insights")).not.toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Milestones")).toBeInTheDocument();
    expect(screen.getByText("Open Risks & Issues")).toBeInTheDocument();
    expect(screen.getByText("Resource Summary")).toBeInTheDocument();
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
    expect(screen.getByText("Beta Release")).toBeInTheDocument();
    expect(screen.getAllByText("Supplier delay")).toHaveLength(2);
    expect(screen.queryByText("Executive Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Business Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("RAID Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Summary")).not.toBeInTheDocument();
  });

  it("shows up to five milestones and the latest meaningful activity", () => {
    render(
      <ProjectWorkspaceOverview
        project={{
          assumptions: [
            {
              id: "assumption-1",
              projectId: "project-1",
              status: "open",
              title: "Vendor approval assumption",
              type: "assumption",
            },
          ],
          dependencies: [
            {
              id: "dependency-1",
              projectId: "project-1",
              status: "open",
              title: "Security dependency",
              type: "dependency",
            },
          ],
          id: "project-1",
          issues: [
            {
              id: "issue-1",
              projectId: "project-1",
              status: "open",
              title: "Integration issue",
              type: "issue",
            },
          ],
          members: [],
          name: "Customer Experience Platform Upgrade",
          risks: [
            {
              id: "risk-1",
              projectId: "project-1",
              status: "open",
              title: "Supplier delay",
              type: "risk",
            },
          ],
          status: "active",
          tasks: [
            {
              actualEndDate: "2026-05-13",
              id: "done-1",
              priority: "medium",
              projectId: "project-1",
              status: "done",
              title: "Activity One",
            },
            {
              actualEndDate: "2026-05-12",
              id: "done-2",
              priority: "medium",
              projectId: "project-1",
              status: "done",
              title: "Activity Two",
            },
            {
              actualEndDate: "2026-05-11",
              id: "done-3",
              priority: "medium",
              projectId: "project-1",
              status: "done",
              title: "Activity Three",
            },
            ...Array.from({ length: 6 }).map((_, index) => ({
              id: `milestone-${index + 1}`,
              plannedEndDate: `2026-06-${String(index + 1).padStart(2, "0")}`,
              priority: "high",
              projectId: "project-1",
              status: "todo" as const,
              taskKind: "milestone" as const,
              title: `Milestone ${index + 1}`,
            })),
          ],
        }}
      />,
    );

    const activityPanel = screen
      .getByText("Recent Activity")
      .closest("section");
    const milestonePanel = screen
      .getByText("Upcoming Milestones")
      .closest("section");
    expect(activityPanel).not.toHaveClass("h-[210px]");
    expect(milestonePanel).not.toHaveClass("h-[210px]");
    expect(screen.getByText("View All Activity")).toHaveAttribute(
      "href",
      "/projects/project-1/reports",
    );
    expect(screen.getByText("Activity One")).toBeInTheDocument();
    expect(screen.getByText("Activity Two")).toBeInTheDocument();
    expect(screen.getByText("Activity Three")).toBeInTheDocument();
    expect(screen.getByText("Milestone 5")).toBeInTheDocument();
    expect(screen.queryByText("Milestone 6")).not.toBeInTheDocument();
    expect(screen.getAllByText("Supplier delay")).toHaveLength(2);
    expect(screen.getByText("Integration issue")).toBeInTheDocument();
    expect(
      screen.queryByText("Vendor approval assumption"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Security dependency")).not.toBeInTheDocument();
  });

  it("removes duplicate project summary and planning widgets from overview", () => {
    render(
      <ProjectWorkspaceOverview
        project={{
          description: "Upgrade customer-facing platform capabilities.",
          id: "project-1",
          members: [],
          name: "Customer Experience Platform Upgrade",
          status: "active",
          tasks: [
            {
              id: "phase-1",
              priority: "medium",
              projectId: "project-1",
              sequenceNumber: 1,
              status: "todo",
              taskKind: "summary",
              title: "Planning",
            },
            {
              assignee: {
                email: "li.chen@example.com",
                firstName: "Li",
                id: "user-1",
                lastName: "Chen",
                status: "active",
              },
              id: "task-1",
              parentTaskId: "phase-1",
              priority: "high",
              projectId: "project-1",
              sequenceNumber: 1,
              status: "in_progress",
              title: "Requirements",
            },
            {
              id: "summary-2",
              parentTaskId: "phase-1",
              priority: "medium",
              projectId: "project-1",
              sequenceNumber: 2,
              status: "todo",
              taskKind: "summary",
              title: "Development",
            },
            {
              id: "task-2",
              parentTaskId: "summary-2",
              priority: "medium",
              projectId: "project-1",
              sequenceNumber: 1,
              status: "todo",
              title: "Backend",
            },
          ],
        }}
      />,
    );

    expect(screen.queryByText("Project Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Project summary")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Work Breakdown Structure"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Plan Items")).not.toBeInTheDocument();
    expect(screen.queryByText("Phases")).not.toBeInTheDocument();
  });

  it("links operational summaries to owning modules without duplicate actions", () => {
    render(
      <ProjectWorkspaceOverview
        project={{
          dependencies: [],
          id: "project-1",
          issues: [],
          members: [],
          name: "Customer Experience Platform Upgrade",
          risks: [],
          status: "active",
          tasks: [],
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Open Risks: 0" }),
    ).toHaveAttribute("href", "/projects/project-1/raid");
    expect(screen.getByRole("link", { name: "Open Team" })).toHaveAttribute(
      "href",
      "/projects/project-1/team",
    );
    expect(screen.getByRole("link", { name: "Open Planning" })).toHaveAttribute(
      "href",
      "/projects/project-1/planning",
    );
    expect(screen.getByRole("link", { name: "Open RAID" })).toHaveAttribute(
      "href",
      "/projects/project-1/raid",
    );
    expect(screen.queryByRole("link", { name: "Open Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Reports" })).not.toBeInTheDocument();
  });

  it("renders responsive two-column operational regions", () => {
    render(
      <ProjectWorkspaceOverview
        project={{
          id: "project-1",
          members: [],
          name: "Customer Experience Platform Upgrade",
          status: "active",
          tasks: [],
        }}
      />,
    );

    expect(screen.getByLabelText("Project overview")).toHaveClass("space-y-6");
    expect(
      screen.getByLabelText("Project health and timeline"),
    ).toHaveClass("grid", "xl:grid-cols-2");
    expect(
      screen.getByLabelText("Upcoming milestones and recent activity"),
    ).toHaveClass("grid", "xl:grid-cols-2");
    expect(screen.getByLabelText("Operational attention")).toHaveClass(
      "grid",
      "xl:grid-cols-2",
    );
    expect(
      screen.getByRole("list", { name: "Project timeline checkpoints" }),
    ).toHaveClass("grid", "xl:grid-cols-5");
  });

  it("renders summary metrics", () => {
    render(
      <ProjectWorkspaceSummary
        taskCounts={{ milestones: 0, phases: 1, tasks: 2 }}
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

    expect(screen.getByText("Summaries")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Milestones")).toBeInTheDocument();
  });

  it("renders zero planning metrics after the final task is removed", () => {
    render(
      <>
        <ProjectSummary
          project={{
            id: "project-1",
            name: "Empty Project",
            status: "active",
            taskCounts: { milestones: 0, phases: 0, tasks: 0 },
            tasks: [],
          }}
        />
        <ProjectWorkspaceSummary
          taskCounts={{ milestones: 4, phases: 3, tasks: 25 }}
          tasks={[]}
        />
      </>,
    );

    expect(screen.getByText("Completion")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Summaries").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Tasks").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Milestones").nextSibling).toHaveTextContent("0");
    expect(screen.getByText("Planning Items").nextSibling).toHaveTextContent(
      "0",
    );
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
              id: "task-1",
              plannedEndDate: "2026-06-30",
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
    expect(
      screen.getByRole("columnheader", { name: "WBS" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Planned End" }),
    ).toBeInTheDocument();
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

    const memberRow = screen
      .getByText("ava.patel@example.com")
      .closest("article");
    expect(memberRow).not.toBeNull();
    fireEvent.change(
      within(memberRow as HTMLElement).getByDisplayValue("Contributor"),
      {
        target: { value: "viewer" },
      },
    );
    expect(onUpdateMember).toHaveBeenCalledWith("member-1", {
      role: "viewer",
    });

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onRemoveMember).toHaveBeenCalledWith("member-1");
  });

  it("supports project task create, edit, reassign, and delete controls", () => {
    const onCreateTask = vi.fn();
    const onDeleteTask = vi.fn();
    const onUpdateTask = vi.fn();
    const members = [
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
      {
        id: "member-2",
        role: "contributor",
        user: {
          email: "li.chen@example.com",
          firstName: "Li",
          id: "user-2",
          lastName: "Chen",
          status: "active",
        },
        userId: "user-2",
      },
    ];

    render(
      <ProjectWorkspaceTasks
        canManageTasks
        members={members}
        onCreateTask={onCreateTask}
        onDeleteTask={onDeleteTask}
        onUpdateTask={onUpdateTask}
        tasks={[
          {
            childTaskCount: 1,
            description: "Phase container.",
            phaseEndDate: "2026-06-28",
            phaseProgress: 25,
            phaseStartDate: "2026-06-10",
            id: "summary-1",
            plannedEndDate: "2026-06-30",
            plannedStartDate: "2026-06-01",
            priority: "medium",
            projectId: "project-1",
            sequenceNumber: 1,
            status: "todo",
            taskKind: "summary",
            title: "Planning",
          },
          {
            assigneeId: "user-1",
            assignee: members[0].user,
            description: "Initial release plan.",
            id: "task-1",
            parentTaskId: "summary-1",
            percentComplete: 25,
            plannedEndDate: "2026-06-28",
            plannedStartDate: "2026-06-10",
            priority: "high",
            projectId: "project-1",
            remarks: "Draft is ready.",
            sequenceNumber: 10,
            status: "todo",
            taskKind: "standard",
            title: "Prepare release plan",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));
    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/title/i), {
      target: { value: "Mobilise team" },
    });
    fireEvent.change(within(dialog).getByLabelText(/description/i), {
      target: { value: "Create the launch working group." },
    });
    fireEvent.change(within(dialog).getByRole("combobox", { name: /type/i }), {
      target: { value: "standard" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^assignee$/i), {
      target: { value: "user-2" },
    });
    fireEvent.change(within(dialog).getByLabelText(/priority/i), {
      target: { value: "critical" },
    });
    fireEvent.change(within(dialog).getByLabelText(/status/i), {
      target: { value: "in_progress" },
    });
    fireEvent.change(within(dialog).getByLabelText(/planned start/i), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(within(dialog).getByLabelText(/planned end/i), {
      target: { value: "2026-07-14" },
    });
    fireEvent.change(within(dialog).getByLabelText(/actual start/i), {
      target: { value: "2026-07-02" },
    });
    fireEvent.change(within(dialog).getByLabelText(/estimated hours/i), {
      target: { value: "24" },
    });
    fireEvent.change(within(dialog).getByLabelText(/remaining hours/i), {
      target: { value: "18" },
    });
    fireEvent.change(within(dialog).getByLabelText(/sequence/i), {
      target: { value: "20" },
    });
    fireEvent.change(within(dialog).getByLabelText(/percent complete/i), {
      target: { value: "10" },
    });
    fireEvent.change(within(dialog).getByLabelText(/remarks/i), {
      target: { value: "Kickoff scheduled." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    expect(onCreateTask).toHaveBeenCalledWith({
      assigneeId: "user-2",
      actualEndDate: null,
      actualStartDate: "2026-07-02",
      description: "Create the launch working group.",
      estimatedHours: 24,
      parentTaskId: null,
      percentComplete: 10,
      plannedEndDate: "2026-07-14",
      plannedStartDate: "2026-07-01",
      priority: "critical",
      remainingHours: 18,
      remarks: "Kickoff scheduled.",
      sequenceNumber: 20,
      status: "in_progress",
      taskKind: "standard",
      title: "Mobilise team",
    });

    const taskRow = screen.getByText("Prepare release plan").closest("tr");
    expect(taskRow).not.toBeNull();
    fireEvent.click(
      within(taskRow as HTMLElement).getByRole("button", { name: /edit/i }),
    );
    dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/title/i), {
      target: { value: "Prepare updated release plan" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^assignee$/i), {
      target: { value: "user-2" },
    });
    fireEvent.change(within(dialog).getByLabelText(/estimated hours/i), {
      target: { value: "40" },
    });
    fireEvent.change(within(dialog).getByLabelText(/remaining hours/i), {
      target: { value: "16" },
    });
    fireEvent.change(within(dialog).getByLabelText(/status/i), {
      target: { value: "blocked" },
    });
    fireEvent.change(within(dialog).getByLabelText(/priority/i), {
      target: { value: "medium" },
    });
    fireEvent.change(within(dialog).getByLabelText(/percent complete/i), {
      target: { value: "60" },
    });
    fireEvent.change(within(dialog).getByLabelText(/remarks/i), {
      target: { value: "Plan is under review." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      assigneeId: "user-2",
      actualEndDate: null,
      actualStartDate: null,
      description: "Initial release plan.",
      estimatedHours: 40,
      parentTaskId: "summary-1",
      percentComplete: 60,
      plannedEndDate: "2026-06-28",
      plannedStartDate: "2026-06-10",
      priority: "medium",
      remainingHours: 16,
      remarks: "Plan is under review.",
      sequenceNumber: 10,
      status: "blocked",
      taskKind: "standard",
      title: "Prepare updated release plan",
    });

    fireEvent.click(
      within(taskRow as HTMLElement).getByRole("button", { name: /reassign/i }),
    );
    dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^assignee$/i), {
      target: { value: "user-2" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    expect(onUpdateTask).toHaveBeenLastCalledWith("task-1", {
      assigneeId: "user-2",
    });

    fireEvent.click(
      within(taskRow as HTMLElement).getByRole("button", { name: /delete/i }),
    );
    expect(onDeleteTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(onDeleteTask).toHaveBeenCalledWith("task-1");
  });

  it("autosaves inline task assignment, status, progress, and comments", () => {
    const onUpdateTask = vi.fn();
    const members = [
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
      {
        id: "member-2",
        role: "contributor",
        user: {
          email: "li.chen@example.com",
          firstName: "Li",
          id: "user-2",
          lastName: "Chen",
          status: "active",
        },
        userId: "user-2",
      },
    ];

    render(
      <ProjectWorkspaceTasks
        canEditTasks
        canManageTasks
        canReassignTasks
        members={members}
        onUpdateTask={onUpdateTask}
        tasks={[
          {
            assigneeId: "user-1",
            id: "task-1",
            percentComplete: 20,
            priority: "medium",
            projectId: "project-1",
            remarks: "Draft",
            status: "todo",
            title: "Prepare release plan",
          },
        ]}
      />,
    );

    const taskRow = screen.getByText("Prepare release plan").closest("tr");
    expect(taskRow).not.toBeNull();

    fireEvent.change(
      within(taskRow as HTMLElement).getByLabelText("Assigned To"),
      { target: { value: "user-2" } },
    );
    fireEvent.change(
      within(taskRow as HTMLElement).getByLabelText(
        "Status Prepare release plan",
      ),
      { target: { value: "in_progress" } },
    );
    fireEvent.change(
      within(taskRow as HTMLElement).getByLabelText(
        "Progress Prepare release plan",
      ),
      { target: { value: "55" } },
    );
    fireEvent.blur(
      within(taskRow as HTMLElement).getByLabelText(
        "Progress Prepare release plan",
      ),
    );
    fireEvent.change(
      within(taskRow as HTMLElement).getByLabelText(
        "Comments Prepare release plan",
      ),
      { target: { value: "Ready for review" } },
    );
    fireEvent.blur(
      within(taskRow as HTMLElement).getByLabelText(
        "Comments Prepare release plan",
      ),
    );

    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      assigneeId: "user-2",
    });
    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      status: "in_progress",
    });
    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      percentComplete: 55,
    });
    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      remarks: "Ready for review",
    });
  });

  it("keeps the Tasks module focused on execution instead of planning structure", () => {
    render(
      <ProjectWorkspaceTasks
        canEditTasks
        canReassignTasks
        dependencies={[
          {
            dependencyType: "FS",
            id: "dependency-1",
            lagDays: 0,
            predecessorTaskId: "task-1",
            successorTaskId: "task-2",
          },
        ]}
        mode="execution"
        onUpdateTask={vi.fn()}
        tasks={[
          {
            id: "task-1",
            plannedEndDate: "2026-06-30",
            plannedStartDate: "2026-06-01",
            priority: "high",
            projectId: "project-1",
            status: "todo",
            title: "Prepare release plan",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create task/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Dependencies" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Start Prepare release plan"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Finish Prepare release plan"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Jun 01, 2026")).toBeInTheDocument();
    expect(screen.getByText("Jun 30, 2026")).toBeInTheDocument();
  });

  it("treats summaries as read-only planning containers in the editor", () => {
    render(
      <ProjectWorkspaceTasks
        canManageTasks
        tasks={[
          {
            childTaskCount: 2,
            description: "Summary container.",
            id: "summary-1",
            phaseEndDate: "2026-06-28",
            phaseProgress: 50,
            phaseStartDate: "2026-06-10",
            plannedEndDate: "2026-06-30",
            plannedStartDate: "2026-06-01",
            priority: "medium",
            projectId: "project-1",
            sequenceNumber: 1,
            status: "todo",
            taskKind: "summary",
            title: "Planning",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).queryByLabelText(/^assignee$/i),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/status/i)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText(/estimated hours/i),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText("Calculated Progress")).toBeInTheDocument();
    expect(within(dialog).getByText("50%")).toBeInTheDocument();
  });

  it("renders project task actions as view-only without permissions", () => {
    render(
      <ProjectWorkspaceTasks
        canManageTasks={false}
        currentUserId="user-3"
        tasks={[
          {
            assigneeId: "user-1",
            id: "task-1",
            plannedEndDate: "2026-06-30",
            priority: "high",
            projectId: "project-1",
            status: "todo",
            title: "Prepare release plan",
          },
        ]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /create task/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
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
    expect(screen.getByText("No plan items yet.")).toBeInTheDocument();
    expect(screen.getByText("No risks yet.")).toBeInTheDocument();
  });

  it("renders derived WBS numbering with expand and collapse controls", () => {
    render(
      <ProjectWorkspaceTasks
        canManageTasks
        onCreateTask={vi.fn()}
        tasks={[
          {
            id: "summary-1",
            priority: "medium",
            projectId: "project-1",
            sequenceNumber: 10,
            status: "todo",
            taskKind: "summary",
            title: "Planning",
          },
          {
            id: "task-1",
            parentTaskId: "summary-1",
            priority: "high",
            projectId: "project-1",
            sequenceNumber: 20,
            status: "todo",
            taskKind: "standard",
            title: "Prepare release plan",
          },
          {
            id: "milestone-1",
            parentTaskId: "summary-1",
            priority: "high",
            projectId: "project-1",
            sequenceNumber: 30,
            status: "todo",
            taskKind: "milestone",
            title: "Approval checkpoint",
          },
        ]}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1.1")).toBeInTheDocument();
    expect(screen.getByText("1.2")).toBeInTheDocument();
    expect(screen.getByText("[SUMMARY]")).toBeInTheDocument();
    expect(screen.getByText("[MILESTONE]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /collapse planning/i }));
    expect(screen.queryByText("Prepare release plan")).not.toBeInTheDocument();
    expect(screen.queryByText("◆ Approval checkpoint")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand planning/i }));
    expect(screen.getByText("Prepare release plan")).toBeInTheDocument();
    expect(screen.getByText("◆ Approval checkpoint")).toBeInTheDocument();
  });

  it("creates child tasks from summary rows and supports summary and milestone shortcuts", () => {
    const onCreateTask = vi.fn();

    render(
      <ProjectWorkspaceTasks
        canManageTasks
        members={[]}
        onCreateTask={onCreateTask}
        tasks={[
          {
            id: "summary-1",
            priority: "medium",
            projectId: "project-1",
            sequenceNumber: 10,
            status: "todo",
            taskKind: "summary",
            title: "Planning",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /create summary/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create milestone/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /child task/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/parent summary/i)).toHaveValue(
      "summary-1",
    );
    fireEvent.change(within(dialog).getByLabelText(/title/i), {
      target: { value: "Define scope" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    expect(onCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        parentTaskId: "summary-1",
        taskKind: "standard",
        title: "Define scope",
      }),
    );
  });

  it("limits assigned team members to progress-safe edits", () => {
    const onUpdateTask = vi.fn();

    render(
      <ProjectWorkspaceTasks
        currentUserId="user-2"
        onUpdateTask={onUpdateTask}
        tasks={[
          {
            assigneeId: "user-2",
            id: "task-1",
            percentComplete: 25,
            priority: "high",
            projectId: "project-1",
            remarks: "Waiting for review",
            status: "todo",
            taskKind: "standard",
            title: "Prepare release plan",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /update progress/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/title/i)).toBeDisabled();
    expect(within(dialog).getByLabelText(/planned start/i)).toBeDisabled();
    expect(within(dialog).getByLabelText(/estimated hours/i)).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/percent complete/i), {
      target: { value: "60" },
    });
    fireEvent.change(within(dialog).getByLabelText(/remarks/i), {
      target: { value: "Ready for review" },
    });
    fireEvent.change(within(dialog).getByLabelText(/status/i), {
      target: { value: "in_progress" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save changes/i }),
    );

    expect(onUpdateTask).toHaveBeenCalledWith("task-1", {
      assigneeId: "user-2",
      percentComplete: 60,
      remarks: "Ready for review",
      status: "in_progress",
    });
  });

  it("manages task dependencies from the plan workspace", () => {
    const onCreateDependency = vi.fn();
    const onUpdateDependency = vi.fn();
    const onDeleteDependency = vi.fn();

    render(
      <ProjectWorkspaceTasks
        canManageDependencies
        dependencies={[
          {
            dependencyType: "FS",
            id: "dependency-1",
            lagDays: 2,
            predecessorTask: {
              id: "task-1",
              priority: "high",
              projectId: "project-1",
              status: "todo",
              taskKind: "standard",
              title: "Prepare release plan",
            },
            predecessorTaskId: "task-1",
            successorTask: {
              id: "task-2",
              priority: "medium",
              projectId: "project-1",
              status: "todo",
              taskKind: "milestone",
              title: "Executive checkpoint",
            },
            successorTaskId: "task-2",
          },
        ]}
        onCreateDependency={onCreateDependency}
        onDeleteDependency={onDeleteDependency}
        onUpdateDependency={onUpdateDependency}
        tasks={[
          {
            id: "task-1",
            priority: "high",
            projectId: "project-1",
            sequenceNumber: 10,
            status: "todo",
            taskKind: "standard",
            title: "Prepare release plan",
          },
          {
            id: "task-2",
            priority: "medium",
            projectId: "project-1",
            sequenceNumber: 20,
            status: "todo",
            taskKind: "milestone",
            title: "Executive checkpoint",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Dependencies" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 days")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add dependency/i }));
    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^predecessor$/i), {
      target: { value: "task-1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^successor$/i), {
      target: { value: "task-2" },
    });
    fireEvent.change(within(dialog).getByLabelText(/lag days/i), {
      target: { value: "3" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save dependency/i }),
    );

    expect(onCreateDependency).toHaveBeenCalledWith({
      dependencyType: "FS",
      lagDays: 3,
      predecessorTaskId: "task-1",
      successorTaskId: "task-2",
    });

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/dependency type/i), {
      target: { value: "SS" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /save dependency/i }),
    );

    expect(onUpdateDependency).toHaveBeenCalledWith("dependency-1", {
      dependencyType: "SS",
      lagDays: 2,
      predecessorTaskId: "task-1",
      successorTaskId: "task-2",
    });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(onDeleteDependency).toHaveBeenCalledWith("dependency-1");
  });

  it("renders baseline snapshots with variance against the current plan", () => {
    render(
      <ProjectWorkspaceBaselines
        baselines={[
          {
            capturedAt: "2026-06-01T10:00:00.000Z",
            capturedById: "user-1",
            id: "baseline-1",
            isCurrent: true,
            name: "Approved Delivery Baseline",
            projectId: "project-1",
            status: "approved",
            tasks: [
              {
                estimatedHours: 24,
                id: "baseline-task-1",
                parentTaskId: null,
                percentComplete: 10,
                plannedEndDate: "2026-06-14",
                plannedStartDate: "2026-06-01",
                projectBaselineId: "baseline-1",
                projectId: "project-1",
                sequenceNumber: 10,
                taskId: "task-1",
                taskKind: "standard",
                taskTitle: "Prepare release plan",
              },
            ],
            versionNumber: 1,
          },
        ]}
        currentTasks={[
          {
            estimatedHours: 30,
            id: "task-1",
            plannedEndDate: "2026-06-18",
            plannedStartDate: "2026-06-02",
            priority: "high",
            projectId: "project-1",
            sequenceNumber: 10,
            status: "todo",
            taskKind: "standard",
            title: "Prepare release plan",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Baselines" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Approved Delivery Baseline")).toHaveLength(2);
    expect(screen.getByText("+4 days")).toBeInTheDocument();
    expect(screen.getByText("+6h")).toBeInTheDocument();
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
            {
              header: "Status",
              render: (risk) => formatRaidLabel(risk.status),
            },
            {
              header: "Probability",
              render: (risk) => formatRaidLabel(risk.probability),
            },
            {
              header: "Impact",
              render: (risk) => formatRaidLabel(risk.impact),
            },
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
              render: (assumption) =>
                formatRaidLabel(assumption.validationStatus),
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

    const risks = screen
      .getByRole("heading", { name: "Risks" })
      .closest("section");
    const issues = screen
      .getByRole("heading", { name: "Issues" })
      .closest("section");
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

    expect(
      within(risks as HTMLElement).getByRole("columnheader", {
        name: "Probability",
      }),
    ).toBeInTheDocument();
    expect(
      within(risks as HTMLElement).getByRole("columnheader", {
        name: "Impact",
      }),
    ).toBeInTheDocument();
    expect(
      within(risks as HTMLElement).getByText("Supplier onboarding delay"),
    ).toBeInTheDocument();
    expect(
      within(risks as HTMLElement).getByText("Maria Garcia"),
    ).toBeInTheDocument();

    expect(
      within(issues as HTMLElement).getByRole("columnheader", {
        name: "Severity",
      }),
    ).toBeInTheDocument();
    expect(
      within(issues as HTMLElement).getByText("Integration outage"),
    ).toBeInTheDocument();
    expect(
      within(issues as HTMLElement).getByText("critical"),
    ).toBeInTheDocument();

    expect(
      within(assumptions as HTMLElement).getByRole("columnheader", {
        name: "Validation Status",
      }),
    ).toBeInTheDocument();
    expect(
      within(assumptions as HTMLElement).getByText(
        "Vendor API remains available",
      ),
    ).toBeInTheDocument();
    expect(
      within(assumptions as HTMLElement).getByText("validated"),
    ).toBeInTheDocument();

    expect(
      within(dependencies as HTMLElement).getByRole("columnheader", {
        name: "Depends On",
      }),
    ).toBeInTheDocument();
    expect(
      within(dependencies as HTMLElement).getByRole("columnheader", {
        name: "Due Date",
      }),
    ).toBeInTheDocument();
    expect(
      within(dependencies as HTMLElement).getByText("Security review"),
    ).toBeInTheDocument();
    expect(
      within(dependencies as HTMLElement).getByText(
        formatRaidDate("2026-06-30"),
      ),
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

    expect(
      screen.getByRole("columnheader", { name: "Title" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No records yet.")).not.toBeInTheDocument();
  });
});
