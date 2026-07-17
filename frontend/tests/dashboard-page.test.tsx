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

  it("presents action-oriented metrics and a scannable assigned project row", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Payments Modernisation")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Your work" })).toBeInTheDocument();
    expect(screen.getByLabelText("Work summary")).toHaveTextContent("Assigned9");
    expect(screen.queryByText("Total Tasks")).not.toBeInTheDocument();
    expect(screen.getAllByText("project manager")).toHaveLength(2);
    expect(screen.getAllByText("Amber")).toHaveLength(2);
    expect(
      screen.getByText("Milestone forecast moved by 5 days"),
    ).toBeInTheDocument();
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
