import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(app)/dashboard/page";

const dashboardMocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(),
  getDefaultDashboardPath: vi.fn(),
  getMyDashboard: vi.fn(),
  replace: vi.fn(),
  storeAuthMe: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    className,
    href,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className={className} href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: dashboardMocks.replace }),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: dashboardMocks.getAuthMe,
  getDefaultDashboardPath: dashboardMocks.getDefaultDashboardPath,
  storeAuthMe: dashboardMocks.storeAuthMe,
}));

vi.mock("@/features/dashboard", () => ({
  getMyDashboard: dashboardMocks.getMyDashboard,
}));

const dashboard = {
  assignedProjects: [
    {
      health: {
        reasons: ["Milestone forecast moved by 5 days"],
        status: "AMBER",
      },
      id: "project-1",
      name: "Payments Modernisation",
      role: "project_manager",
      status: "active",
    },
  ],
  health: { reasons: ["One project requires attention"], status: "AMBER" },
  openIssues: [],
  openRisks: [],
  overdueTasks: [],
  taskSummary: {
    blocked: 1,
    completed: 4,
    inProgress: 3,
    overdue: 1,
    todo: 2,
    total: 9,
  },
  upcomingTasks: [],
};

describe("Home workspace", () => {
  beforeEach(() => {
    dashboardMocks.getAuthMe.mockReset();
    dashboardMocks.getDefaultDashboardPath.mockReset();
    dashboardMocks.getMyDashboard.mockReset();
    dashboardMocks.replace.mockReset();
    dashboardMocks.storeAuthMe.mockReset();

    dashboardMocks.getAuthMe.mockResolvedValue({
      permissions: [],
      roles: [],
      user: { id: "user-1" },
    });
    dashboardMocks.getDefaultDashboardPath.mockReturnValue("/dashboard");
    dashboardMocks.getMyDashboard.mockResolvedValue(dashboard);
  });

  it("renders a compact horizontal work summary without Overall Health", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Payments Modernisation")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByText("Your work")).not.toBeInTheDocument();
    expect(screen.queryByText(/Home workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Overall Health/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Overall health")).not.toBeInTheDocument();

    const summary = screen.getByLabelText("Work summary");
    expect(summary).toHaveTextContent("Assigned");
    expect(summary).toHaveTextContent("9");
    expect(summary).toHaveTextContent("In Progress");
    expect(summary).toHaveTextContent("3");
    expect(summary).toHaveTextContent("Blocked");
    expect(summary).toHaveTextContent("1");
    expect(summary).toHaveTextContent("Overdue");
    expect(screen.getByRole("link", { name: "Assigned tasks: 9" })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(
      screen.getByRole("link", { name: "Overdue tasks: 1" }),
    ).toHaveAttribute("href", "/tasks?timing=overdue");

    expect(
      screen.getByRole("heading", { name: "Assigned Projects" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open project Payments Modernisation" }),
    ).toHaveAttribute("href", "/projects/project-1");
  });

  it("uses informative empty-state language", async () => {
    dashboardMocks.getMyDashboard.mockResolvedValue({
      ...dashboard,
      assignedProjects: [],
      health: { reasons: [], status: "GREEN" },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("You're clear for the next 7 days.")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "No projects are assigned to you yet. New assignments will appear here.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("You have no open risks to review.")).toBeInTheDocument();
    expect(screen.getByText("You have no open issues to resolve.")).toBeInTheDocument();
  });
});
