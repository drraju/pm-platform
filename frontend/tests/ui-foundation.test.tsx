import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ActionGroup,
  ContentGrid,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  MetricCard,
  SectionCard,
  SectionHeader,
  StatusBadge,
  ToolbarGroup,
} from "@/components/ui";

describe("shared UI foundation", () => {
  it("composes a standard section card and header without hiding semantics", () => {
    render(
      <SectionCard aria-label="Delivery section">
        <SectionHeader count={3} description="Current delivery items" title="Delivery" />
        <p>Section content</p>
      </SectionCard>,
    );

    expect(screen.getByRole("region", { name: "Delivery section" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getByText("Current delivery items")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("provides reusable metric and status semantics", () => {
    render(
      <>
        <MetricCard href="/tasks" label="Assigned" tone="warning" value={9} />
        <StatusBadge dot title="Schedule requires attention" tone="warning">
          Amber
        </StatusBadge>
      </>,
    );

    expect(screen.getByRole("link", { name: /assigned 9/i })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByText("Amber").closest("span")).toHaveAttribute(
      "title",
      "Schedule requires attention",
    );
  });

  it("retains accessible state and layout contracts", () => {
    render(
      <>
        <ErrorState>Unable to load workspace</ErrorState>
        <EmptyState variant="dashed">No items yet.</EmptyState>
        <LoadingSkeleton className="h-8" />
        <ContentGrid aria-label="Summary grid" columns={3}>
          <div>Grid content</div>
        </ContentGrid>
        <ActionGroup>
          <button type="button">Save</button>
        </ActionGroup>
        <ToolbarGroup label="View">
          <button type="button">Fit</button>
        </ToolbarGroup>
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to load workspace");
    expect(screen.getByText("No items yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("Summary grid")).toHaveClass("xl:grid-cols-3");
    expect(screen.getByRole("group", { name: "View commands" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
