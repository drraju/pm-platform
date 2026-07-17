import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ActionToolbar,
  EmptyState,
  ErrorState,
  HealthIndicator,
  InfoCard,
  InsightCard,
  KPIGrid,
  LoadingState,
  SectionHeader,
  StatusBadge,
  SummaryCard,
  SummaryMetricCard,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceHeaderActions,
  WorkspaceLayout,
  WorkspaceSection,
} from "@/components/foundation";

describe("UI Foundation v2", () => {
  it("composes responsive workspace layout primitives with their defaults", () => {
    render(
      <WorkspaceLayout aria-label="Delivery workspace">
        <WorkspaceContent as="section" aria-label="Workspace content">
          <WorkspaceSection aria-label="Overview section" surface="card">
            Overview content
          </WorkspaceSection>
        </WorkspaceContent>
      </WorkspaceLayout>,
    );

    expect(screen.getByLabelText("Delivery workspace")).toHaveClass("space-y-6");
    expect(screen.getByRole("region", { name: "Workspace content" })).toHaveClass(
      "space-y-6",
    );
    expect(screen.getByRole("region", { name: "Overview section" })).toHaveClass(
      "shadow-ui-subtle",
    );
  });

  it("renders a compact workspace header with metadata, actions, progress, and navigation", () => {
    render(
      <WorkspaceHeader
        actions={
          <WorkspaceHeaderActions>
            <button type="button">Create item</button>
          </WorkspaceHeaderActions>
        }
        eyebrow="Workspace"
        metadata={[
          { id: "owner", label: "Owner", value: "Ava Patel" },
          { id: "finish", label: "Finish", value: "15 Dec 2026" },
        ]}
        navigation={
          <nav aria-label="Workspace navigation">
            <a aria-current="page" href="/overview">
              Overview
            </a>
          </nav>
        }
        progress={{ label: "Completion", value: 42 }}
        status={<StatusBadge tone="warning">At risk</StatusBadge>}
        subtitle="Current delivery context"
        title="Platform Upgrade"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Platform Upgrade" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Workspace actions" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Completion" })).toHaveValue(42);
    expect(screen.getByText("Ava Patel")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeInTheDocument();
  });

  it("renders KPI and metric components with accessible interactive content", () => {
    const onClick = vi.fn();

    render(
      <KPIGrid aria-label="Delivery metrics">
        <SummaryMetricCard
          ariaLabel="Open assigned work"
          delta="2 since yesterday"
          href="/tasks"
          onClick={onClick}
          title="Assigned work"
          trend={{ direction: "up", label: "Increasing" }}
          value={9}
          variant="warning"
        />
        <HealthIndicator label="Delivery health" tone="success" value="Healthy" />
      </KPIGrid>,
    );

    expect(screen.getByLabelText("Delivery metrics")).toHaveClass("xl:grid-cols-4");
    expect(screen.getByRole("link", { name: "Open assigned work" })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByLabelText("Increasing")).toHaveTextContent("Increasing");
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("provides status text and an accessible description without relying on colour", () => {
    render(
      <StatusBadge description="Schedule requires attention" dot tone="critical">
        Critical
      </StatusBadge>,
    );

    expect(screen.getByText("Critical")).toHaveAccessibleDescription(
      "Schedule requires attention",
    );
  });

  it("renders section navigation and toolbar actions using native controls", () => {
    render(
      <>
        <SectionHeader
          badge={<StatusBadge size="sm">3</StatusBadge>}
          description="Items requiring review"
          headingLevel={3}
          link={{ href: "/items", label: "View all" }}
          title="Attention"
        />
        <ActionToolbar
          filters={<button type="button">Filter</button>}
          label="List actions"
          primaryAction={<button type="button">Create</button>}
          search={<input aria-label="Search items" type="search" />}
        />
      </>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Attention" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/items",
    );
    expect(screen.getByRole("group", { name: "List actions" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search items" })).toBeInTheDocument();
  });

  it("composes summary and informational cards with children and actions", () => {
    render(
      <>
        <SummaryCard
          action={<button type="button">Open</button>}
          description="Current summary"
          footer="Updated today"
          title="Delivery"
        >
          Summary content
        </SummaryCard>
        <InfoCard action={<a href="/help">Learn more</a>} title="Information">
          Supporting information
        </InfoCard>
      </>,
    );

    expect(screen.getByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getByText("Summary content")).toBeInTheDocument();
    expect(screen.getByText("Updated today")).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveTextContent(
      "Supporting information",
    );
  });

  it("exposes loading, empty, and error feedback to assistive technology", () => {
    render(
      <>
        <LoadingState label="Loading workspace data" rows={2} />
        <EmptyState
          action={<button type="button">Create first item</button>}
          description="Add an item to begin."
          title="No items"
        />
        <ErrorState message="Unable to load workspace" />
      </>,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading workspace data");
    expect(screen.getByRole("heading", { name: "No items" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load workspace");
  });

  it("renders compact insight lifecycle states and native expandable details", () => {
    const { rerender } = render(
      <InsightCard state="empty" title="Insights" />,
    );

    expect(screen.getByText("No insights are available.")).toBeInTheDocument();

    rerender(
      <InsightCard
        detail="Supporting evidence"
        expandable
        state="available"
        summary="A concise recommendation"
        title="Insights"
      />,
    );

    expect(screen.getByText("A concise recommendation").closest("summary")).toBeInTheDocument();
    expect(screen.getByText("Supporting evidence")).toBeInTheDocument();
  });
});
