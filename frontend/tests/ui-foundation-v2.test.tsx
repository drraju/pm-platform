import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
      <>
        <WorkspaceLayout aria-label="Delivery workspace">
          <WorkspaceContent as="section" aria-label="Workspace content">
            <WorkspaceSection aria-label="Overview section" surface="card">
              Overview content
            </WorkspaceSection>
          </WorkspaceContent>
        </WorkspaceLayout>
        <WorkspaceLayout
          aria-label="Legacy compact workspace"
          density="compact"
        />
      </>,
    );

    expect(screen.getByLabelText("Delivery workspace")).toHaveClass("space-y-6");
    expect(screen.getByRole("region", { name: "Workspace content" })).toHaveClass(
      "space-y-6",
    );
    expect(screen.getByRole("region", { name: "Overview section" })).toHaveClass(
      "shadow-ui-subtle",
    );
    expect(screen.getByLabelText("Legacy compact workspace")).toHaveClass(
      "space-y-4",
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
        density="compact"
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
    ).toHaveClass("text-xl");
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
          title="Assigned work"
          trend={{ direction: "up", label: "Increasing" }}
          value={9}
          variant="warning"
        />
        <SummaryMetricCard
          ariaLabel="Refresh capacity"
          onClick={onClick}
          title="Available capacity"
          value={4}
        />
        <SummaryMetricCard title="Budget" value="On track" />
        <HealthIndicator label="Delivery health" tone="success" value="Healthy" />
      </KPIGrid>,
    );

    expect(screen.getByLabelText("Delivery metrics")).toHaveClass("xl:grid-cols-4");
    expect(screen.getByRole("link", { name: "Open assigned work" })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByLabelText("Increasing")).toHaveTextContent("Increasing");
    fireEvent.click(screen.getByRole("button", { name: "Refresh capacity" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Budget").closest("section")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("supports semantic roots and flexible heading levels", () => {
    render(
      <>
        <SummaryCard as="article" headingLevel={3} title="Summary heading">
          Summary content
        </SummaryCard>
        <EmptyState as="div" headingLevel={4} title="Empty heading" />
        <InfoCard as="section" headingLevel={5} title="Information heading">
          Information content
        </InfoCard>
        <InsightCard
          as="article"
          headingLevel={3}
          state="available"
          summary="Insight content"
          title="Insight heading"
        />
      </>,
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Summary heading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "Empty heading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 5, name: "Information heading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Insight heading" }),
    ).toBeInTheDocument();
  });

  it("forwards refs from layout and card primitives", () => {
    const contentRef = React.createRef<HTMLElement>();
    const infoRef = React.createRef<HTMLElement>();
    const layoutRef = React.createRef<HTMLDivElement>();
    const sectionRef = React.createRef<HTMLElement>();
    const summaryRef = React.createRef<HTMLElement>();

    render(
      <WorkspaceLayout ref={layoutRef} spacing="none">
        <WorkspaceContent ref={contentRef} spacing="none">
          <WorkspaceSection ref={sectionRef}>Section</WorkspaceSection>
          <SummaryCard ref={summaryRef} title="Summary">
            Content
          </SummaryCard>
          <InfoCard ref={infoRef} title="Information">
            Content
          </InfoCard>
        </WorkspaceContent>
      </WorkspaceLayout>,
    );

    expect(layoutRef.current).toBeInstanceOf(HTMLDivElement);
    expect(layoutRef.current).not.toHaveClass("space-y-6");
    expect(contentRef.current).toBeInstanceOf(HTMLDivElement);
    expect(sectionRef.current).toBeInstanceOf(HTMLElement);
    expect(summaryRef.current).toBeInstanceOf(HTMLElement);
    expect(infoRef.current).toBeInstanceOf(HTMLElement);
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
    const { container } = render(
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
    expect(container.querySelector(".animate-pulse")).toHaveClass(
      "motion-reduce:animate-none",
    );
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

    rerender(
      <InsightCard
        errorMessage="Insight service failed"
        state="error"
        title="Insights"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Insight service failed",
    );
  });
});
