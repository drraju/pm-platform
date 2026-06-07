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
    expect(
      screen.getByRole("heading", { name: "Projects Requiring Attention" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Observability Transformation Programme/i,
      }),
    ).toHaveAttribute("href", "/projects/project-amber");
    expect(
      screen.getByRole("link", { name: /Data Centre Exit Programme/i }),
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
    expect(
      screen.getByRole("heading", { name: "Open Issues by Priority" }),
    ).toBeInTheDocument();
    expectSummaryCardValue("Critical Issues", "5");
    expectSummaryCardValue("High Priority Issues", "6");
    expectSummaryCardValue("Medium Priority Issues", "7");
    expectSummaryCardValue("Low Priority Issues", "8");
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
    });

    render(<PortfolioPage />);

    expect(
      await screen.findByText("No amber or red projects require attention."),
    ).toBeInTheDocument();
    expect(screen.getByText("No open risks are currently recorded.")).toBeInTheDocument();
    expect(screen.getByText("No open issues are currently recorded.")).toBeInTheDocument();
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

function expectSummaryCardValue(label: string, value: string) {
  const card = screen.getByText(label).closest("section");

  expect(card).not.toBeNull();
  expect(within(card as HTMLElement).getByText(value)).toBeInTheDocument();
}
