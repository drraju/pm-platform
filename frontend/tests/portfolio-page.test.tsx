import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioPage from "@/app/(app)/portfolio/page";

const portfolioMocks = vi.hoisted(() => ({
  getPortfolioSummary: vi.fn(),
}));

vi.mock("@/features/portfolio", () => ({
  getPortfolioSummary: portfolioMocks.getPortfolioSummary,
}));

describe("Portfolio page", () => {
  beforeEach(() => {
    portfolioMocks.getPortfolioSummary.mockReset();
  });

  it("renders portfolio summary cards", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 4,
      greenProjects: 2,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [
        {
          healthStatus: "AMBER",
          id: "project-amber",
          name: "Observability Transformation Programme",
          reasons: ["1 high risk open"],
        },
        {
          healthStatus: "RED",
          id: "project-red",
          name: "Data Centre Exit Programme",
          reasons: ["1 critical issue open"],
        },
      ],
      openRisksBySeverity: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
      },
      openIssuesByPriority: {
        critical: 5,
        high: 6,
        medium: 7,
        low: 8,
      },
      overdueTasks: {
        total: 12,
        projects: [
          {
            projectId: "project-cxp",
            projectName: "Customer Experience Platform Upgrade",
            overdueTaskCount: 4,
          },
          {
            projectId: "project-observability",
            projectName: "Observability Transformation Programme",
            overdueTaskCount: 5,
          },
          {
            projectId: "project-data-centre",
            projectName: "Data Centre Exit Programme",
            overdueTaskCount: 3,
          },
        ],
      },
      upcomingMilestones: [
        {
          dueDate: "2026-06-09",
          projectId: "project-cxp",
          projectName: "Customer Experience Platform Upgrade",
          taskId: "task-1",
          title: "Complete executive readiness review",
        },
        {
          dueDate: "2026-06-12",
          projectId: "project-observability",
          projectName: "Observability Transformation Programme",
          taskId: "task-2",
          title: "Confirm monitoring cutover",
        },
      ],
    });

    render(<PortfolioPage />);

    expect(screen.getByText("Portfolio")).toBeInTheDocument();

    await waitFor(() => {
      expect(portfolioMocks.getPortfolioSummary).toHaveBeenCalled();
    });

    expectSummaryCardValue("Total Projects", "4");
    expectSummaryCardValue("Green Projects", "2");
    expectSummaryCardValue("Amber Projects", "1");
    expectSummaryCardValue("Red Projects", "1");
    expect(screen.getByText("Green Projects").closest("a")).toHaveAttribute(
      "href",
      "/projects?health=GREEN&sort=health_asc",
    );
    expect(screen.getByText("Amber Projects").closest("a")).toHaveAttribute(
      "href",
      "/projects?health=AMBER&sort=health_desc",
    );
    expect(screen.getByText("Red Projects").closest("a")).toHaveAttribute(
      "href",
      "/projects?health=RED&sort=health_desc",
    );
    expect(
      screen.getByRole("heading", { name: "Projects Requiring Attention" }),
    ).toBeInTheDocument();
    const attentionWidget = getSectionByHeading("Projects Requiring Attention");
    expect(
      within(attentionWidget).getByRole("link", {
        name: /Observability Transformation Programme/i,
      }),
    ).toHaveAttribute("href", "/projects/project-amber");
    expect(
      within(attentionWidget).getByRole("link", { name: /Data Centre Exit Programme/i }),
    ).toHaveAttribute("href", "/projects/project-red");
    expect(screen.getByText("Amber")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("1 high risk open")).toBeInTheDocument();
    expect(screen.getByText("1 critical issue open")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Open Risks by Severity" }),
    ).toBeInTheDocument();
    expectSummaryCardValue("Critical Risks", "1");
    expectSummaryCardValue("High Risks", "2");
    expectSummaryCardValue("Medium Risks", "3");
    expectSummaryCardValue("Low Risks", "4");
    expect(screen.getByText("Critical Risks").closest("a")).toHaveAttribute(
      "href",
      "/risks?severity=critical&status=open",
    );
    expect(
      screen.getByRole("heading", { name: "Open Issues by Priority" }),
    ).toBeInTheDocument();
    expectSummaryCardValue("Critical Issues", "5");
    expectSummaryCardValue("High Priority Issues", "6");
    expectSummaryCardValue("Medium Priority Issues", "7");
    expectSummaryCardValue("Low Priority Issues", "8");
    expect(screen.getByText("Critical Issues").closest("a")).toHaveAttribute(
      "href",
      "/issues?priority=critical&status=open",
    );
    expect(screen.getByRole("heading", { name: "Overdue Tasks" })).toBeInTheDocument();
    const overdueWidget = getSectionByHeading("Overdue Tasks");
    expectSummaryCardValue("Total Overdue Tasks", "12", overdueWidget);
    expect(
      within(overdueWidget).getByRole("link", { name: "12" }),
    ).toHaveAttribute("href", "/tasks?scope=all&timing=overdue");
    expect(
      within(overdueWidget).getByRole("link", {
        name: /Customer Experience Platform Upgrade/i,
      }),
    ).toHaveAttribute("href", "/tasks?scope=all&projectId=project-cxp&timing=overdue");
    expect(
      within(overdueWidget).getByRole("link", {
        name: /Observability Transformation Programme/i,
      }),
    ).toHaveAttribute(
      "href",
      "/tasks?scope=all&projectId=project-observability&timing=overdue",
    );
    expect(
      within(overdueWidget).getByRole("link", {
        name: /Data Centre Exit Programme/i,
      }),
    ).toHaveAttribute(
      "href",
      "/tasks?scope=all&projectId=project-data-centre&timing=overdue",
    );
    expectSummaryCardValue("Customer Experience Platform Upgrade", "4", overdueWidget);
    expectSummaryCardValue(
      "Observability Transformation Programme",
      "5",
      overdueWidget,
    );
    expectSummaryCardValue("Data Centre Exit Programme", "3", overdueWidget);
    expect(
      screen.getByRole("heading", { name: "Upcoming Milestones" }),
    ).toBeInTheDocument();
    const milestonesWidget = getSectionByHeading("Upcoming Milestones");
    expect(
      within(milestonesWidget).getByText("Complete executive readiness review"),
    ).toBeInTheDocument();
    expect(
      within(milestonesWidget).getByRole("link", {
        name: "Customer Experience Platform Upgrade",
      }),
    ).toHaveAttribute("href", "/projects/project-cxp");
    expect(
      within(milestonesWidget).getByText(formatExpectedDate("2026-06-09")),
    ).toBeInTheDocument();
    expect(
      within(milestonesWidget).getByText("Confirm monitoring cutover"),
    ).toBeInTheDocument();
  });

  it("renders a loading state while the summary is pending", () => {
    portfolioMocks.getPortfolioSummary.mockReturnValue(new Promise(() => null));

    const { container } = render(<PortfolioPage />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("renders an empty state when no projects exist", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 0,
      greenProjects: 0,
      amberProjects: 0,
      redProjects: 0,
      projectsRequiringAttention: [],
      openRisksBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      openIssuesByPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      overdueTasks: {
        total: 0,
        projects: [],
      },
      upcomingMilestones: [],
    });

    render(<PortfolioPage />);

    expect(
      await screen.findByText("No projects are available in the portfolio yet."),
    ).toBeInTheDocument();
  });

  it("renders an attention empty state when all projects are green", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 3,
      greenProjects: 3,
      amberProjects: 0,
      redProjects: 0,
      projectsRequiringAttention: [],
      openRisksBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      openIssuesByPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      overdueTasks: {
        total: 0,
        projects: [],
      },
      upcomingMilestones: [],
    });

    render(<PortfolioPage />);

    expect(
      await screen.findByText("No amber or red projects require attention."),
    ).toBeInTheDocument();
    expect(screen.getByText("No open risks are currently recorded.")).toBeInTheDocument();
    expect(screen.getByText("No open issues are currently recorded.")).toBeInTheDocument();
    expect(screen.getByText("No overdue tasks are currently recorded.")).toBeInTheDocument();
    expect(screen.getByText("No upcoming milestones are currently recorded.")).toBeInTheDocument();
  });

  it("renders an error state when the summary cannot load", async () => {
    portfolioMocks.getPortfolioSummary.mockRejectedValue(
      new Error("Cannot GET /portfolio/summary"),
    );

    render(<PortfolioPage />);

    expect(
      await screen.findByText("Cannot GET /portfolio/summary"),
    ).toBeInTheDocument();
  });
});

function expectSummaryCardValue(
  label: string,
  value: string,
  container: HTMLElement = document.body,
) {
  const card = within(container).getByText(label).closest("section, a, div");

  expect(card).not.toBeNull();
  expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
}

function getSectionByHeading(name: string) {
  const section = screen.getByRole("heading", { name }).closest("section");

  expect(section).not.toBeNull();
  return section as HTMLElement;
}

function formatExpectedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
