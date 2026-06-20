import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExecutiveDashboardPage from "@/app/(dashboard)/executive/page";

const portfolioMocks = vi.hoisted(() => ({
  getPortfolioSummary: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: vi.fn(async () => ({
    permissions: [
      { id: "permission-executive-view", key: "executive.view" },
      { id: "permission-project-read", key: "project.read" },
    ],
    roles: [{ id: "role-1", name: "Executive", permissions: [] }],
    user: {
      email: "executive@example.com",
      firstName: "Executive",
      id: "user-1",
      lastName: "User",
      role: { id: "role-1", name: "Executive", permissions: [] },
      status: "active",
    },
  })),
  getStoredPermissionKeys: () => ["executive.view", "project.read"],
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/portfolio", () => ({
  getPortfolioSummary: portfolioMocks.getPortfolioSummary,
}));

describe("Executive dashboard page", () => {
  beforeEach(() => {
    portfolioMocks.getPortfolioSummary.mockReset();
  });

  it("uses the UAT-approved executive widget drilldown destinations", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 3,
      greenProjects: 1,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [],
      openRisksBySeverity: {
        critical: 1,
        high: 2,
        medium: 0,
        low: 0,
      },
      openIssuesByPriority: {
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
      },
      overdueTasks: {
        total: 4,
        projects: [],
      },
      upcomingMilestones: [],
    });

    render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(portfolioMocks.getPortfolioSummary).toHaveBeenCalled();
    });

    const overdueLink = screen.getByText("Overdue Tasks").closest("a");
    expect(overdueLink).toHaveAttribute("href", "/tasks?scope=all&timing=overdue");
    expect(screen.getByText("Open Risks").closest("a")).toHaveAttribute(
      "href",
      "/risks?status=open",
    );
    expect(screen.getByText("Open Issues").closest("a")).toHaveAttribute(
      "href",
      "/issues?status=open",
    );
    expect(screen.getByText("Green Projects").closest("a")).toHaveAttribute(
      "href",
      "/projects?health=GREEN",
    );
    expect(screen.getByText("Amber Projects").closest("a")).toHaveAttribute(
      "href",
      "/projects?health=AMBER&sort=health_desc",
    );
    expect(screen.getByText("Red Projects").closest("a")).toHaveAttribute(
      "href",
      "/projects?health=RED&sort=health_desc",
    );
  });
});
