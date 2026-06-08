import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExecutiveDashboardPage from "@/app/(dashboard)/executive/page";

const executiveMocks = vi.hoisted(() => ({
  getExecutiveSummary: vi.fn(),
  useAuthorization: vi.fn(),
}));

vi.mock("@/features/executive", () => ({
  getExecutiveSummary: executiveMocks.getExecutiveSummary,
}));

vi.mock("@/features/auth", () => ({
  useAuthorization: executiveMocks.useAuthorization,
}));

describe("Executive Dashboard page", () => {
  beforeEach(() => {
    executiveMocks.getExecutiveSummary.mockReset();
    executiveMocks.useAuthorization.mockReturnValue({
      error: null,
      isAuthorized: true,
      isLoading: false,
    });
  });

  it("renders executive summary sections and attention projects", async () => {
    executiveMocks.getExecutiveSummary.mockResolvedValue({
      portfolioHealth: {
        totalProjects: 4,
        greenProjects: 2,
        amberProjects: 1,
        redProjects: 1,
      },
      delivery: {
        overdueTasks: 7,
        upcomingMilestones: 3,
      },
      governance: {
        openRisks: 5,
        openIssues: 2,
      },
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
    });

    render(<ExecutiveDashboardPage />);

    expect(screen.getByText("Executive Dashboard")).toBeInTheDocument();

    await waitFor(() => {
      expect(executiveMocks.getExecutiveSummary).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("heading", { name: "Portfolio Health" })).toBeInTheDocument();
    expectSummaryCardValue("Total Projects", "4");
    expectSummaryCardValue("Green Projects", "2");
    expectSummaryCardValue("Amber Projects", "1");
    expectSummaryCardValue("Red Projects", "1");

    expect(screen.getByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expectSummaryCardValue("Overdue Tasks", "7");
    expectSummaryCardValue("Upcoming Milestones", "3");

    expect(screen.getByRole("heading", { name: "Governance" })).toBeInTheDocument();
    expectSummaryCardValue("Open Risks", "5");
    expectSummaryCardValue("Open Issues", "2");

    const attentionWidget = getSectionByHeading("Projects Requiring Attention");
    expect(
      within(attentionWidget).getByRole("link", {
        name: /Observability Transformation Programme/i,
      }),
    ).toHaveAttribute("href", "/projects/project-amber");
    expect(
      within(attentionWidget).getByRole("link", {
        name: /Data Centre Exit Programme/i,
      }),
    ).toHaveAttribute("href", "/projects/project-red");
    expect(within(attentionWidget).getByText("Amber")).toBeInTheDocument();
    expect(within(attentionWidget).getByText("Red")).toBeInTheDocument();
    expect(within(attentionWidget).getByText("1 high risk open")).toBeInTheDocument();
    expect(
      within(attentionWidget).getByText("1 critical issue open"),
    ).toBeInTheDocument();
  });

  it("renders a loading state while the summary is pending", () => {
    executiveMocks.getExecutiveSummary.mockReturnValue(new Promise(() => null));

    const { container } = render(<ExecutiveDashboardPage />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(7);
  });

  it("renders an empty state when no executive data exists", async () => {
    executiveMocks.getExecutiveSummary.mockResolvedValue({
      portfolioHealth: {
        totalProjects: 0,
        greenProjects: 0,
        amberProjects: 0,
        redProjects: 0,
      },
      delivery: {
        overdueTasks: 0,
        upcomingMilestones: 0,
      },
      governance: {
        openRisks: 0,
        openIssues: 0,
      },
      projectsRequiringAttention: [],
    });

    render(<ExecutiveDashboardPage />);

    expect(
      await screen.findByText("No projects are available for executive reporting yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No projects currently require executive attention."),
    ).toBeInTheDocument();
  });

  it("renders an error state when the summary cannot load", async () => {
    executiveMocks.getExecutiveSummary.mockRejectedValue(
      new Error("Cannot GET /executive/summary"),
    );

    render(<ExecutiveDashboardPage />);

    expect(
      await screen.findByText("Cannot GET /executive/summary"),
    ).toBeInTheDocument();
  });

  it("renders an authorization error and does not request summary data", async () => {
    executiveMocks.useAuthorization.mockReturnValue({
      error: null,
      isAuthorized: false,
      isLoading: false,
    });

    render(<ExecutiveDashboardPage />);

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(
      screen.getByText("You do not have permission to view the Executive Dashboard."),
    ).toBeInTheDocument();
    expect(executiveMocks.getExecutiveSummary).not.toHaveBeenCalled();
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
