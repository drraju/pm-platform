import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForecastStatus } from "@/components/planning/forecast-status";
import type {
  ApiForecastHistoryItem,
  ApiForecastOverview,
} from "@/lib/api/client";

const planningMocks = vi.hoisted(() => ({
  getProjectForecastHistory: vi.fn(),
  getProjectForecastOverview: vi.fn(),
  regeneratePlanningWorkspace: vi.fn(),
}));

vi.mock("@/features/planning", () => ({
  getProjectForecastHistory: planningMocks.getProjectForecastHistory,
  getProjectForecastOverview: planningMocks.getProjectForecastOverview,
  regeneratePlanningWorkspace: planningMocks.regeneratePlanningWorkspace,
}));

describe("Forecast status", () => {
  beforeEach(() => {
    planningMocks.getProjectForecastHistory.mockReset();
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [],
      nextCursor: null,
    });
    planningMocks.getProjectForecastOverview.mockReset();
    planningMocks.getProjectForecastOverview.mockResolvedValue(overview());
    planningMocks.regeneratePlanningWorkspace.mockReset();
    planningMocks.regeneratePlanningWorkspace.mockResolvedValue({});
  });

  it("presents the Current Forecast and generated-by details", async () => {
    renderStatus();

    expect(await screen.findByText("Schedule v3")).toBeInTheDocument();
    expect(screen.getByText("27 Aug 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Generated 22 Aug 2026 · Ram Datla"),
    ).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.queryByText("forecast-3")).not.toBeInTheDocument();
  });

  it("presents the approved Active Baseline", async () => {
    renderStatus();

    expect(
      await screen.findByText("Delivery Commitment · v1"),
    ).toBeInTheDocument();
    expect(screen.getByText("25 Aug 2026")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("uses the backend positive variance without recalculating it", async () => {
    renderStatus();

    expect(await screen.findByText("+2 days")).toBeInTheDocument();
    expect(screen.getByText("Later than baseline")).toBeInTheDocument();
  });

  it("presents a negative variance as earlier than baseline", async () => {
    planningMocks.getProjectForecastOverview.mockResolvedValue(
      overview({ variance: -2 }),
    );

    renderStatus();

    expect(await screen.findByText("-2 days")).toBeInTheDocument();
    expect(screen.getByText("Earlier than baseline")).toBeInTheDocument();
  });

  it("presents zero variance as on baseline", async () => {
    const alignedBaseline = baseline();
    alignedBaseline.projectFinishDate = "2026-08-27";
    planningMocks.getProjectForecastOverview.mockResolvedValue(
      overview({ activeBaseline: alignedBaseline, variance: 0 }),
    );

    renderStatus();

    expect(await screen.findByText("On baseline")).toBeInTheDocument();
    expect(screen.getByText("Both finish 27 Aug 2026.")).toBeInTheDocument();
  });

  it("treats no Active Baseline as a normal unavailable comparison", async () => {
    planningMocks.getProjectForecastOverview.mockResolvedValue(
      overview({ activeBaseline: null, variance: null }),
    );

    renderStatus();

    expect(await screen.findByText("Not established")).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("makes regeneration the clear next action when no Forecast exists", async () => {
    planningMocks.getProjectForecastOverview.mockResolvedValue(
      overview({ currentForecast: null, variance: null }),
    );

    renderStatus();

    expect(await screen.findByText("No forecast generated")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    ).toBeEnabled();
  });

  it("shows an accessible loading state without flashing an empty Forecast", () => {
    planningMocks.getProjectForecastOverview.mockReturnValue(
      new Promise(() => {}),
    );

    renderStatus();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading Forecast status",
    );
    expect(screen.queryByText("No forecast generated")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    ).toBeDisabled();
  });

  it("uses the Foundation error state and retries Forecast loading", async () => {
    planningMocks.getProjectForecastOverview
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(overview());

    renderStatus();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Forecast status could not be loaded. Try again.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry Forecast status" }),
    );
    expect(await screen.findByText("Schedule v3")).toBeInTheDocument();
    expect(planningMocks.getProjectForecastOverview).toHaveBeenCalledTimes(2);
  });

  it("turns an invalid Active Baseline response into a concise integrity error", async () => {
    planningMocks.getProjectForecastOverview.mockRejectedValue(
      new Error(
        "Active baseline lifecycle invariant violated for project 11111111-1111-4111-8111-111111111111",
      ),
    );

    renderStatus();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Active Baseline configuration is invalid");
    expect(alert).not.toHaveTextContent("11111111");
  });

  it("prevents duplicate regeneration while the operation is running", async () => {
    const deferred = createDeferred();
    planningMocks.regeneratePlanningWorkspace.mockReturnValue(deferred.promise);
    renderStatus();
    await screen.findByText("Schedule v3");

    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    );

    expect(
      screen.getByRole("button", { name: "Regenerating Forecast…" }),
    ).toBeDisabled();
    expect(planningMocks.regeneratePlanningWorkspace).toHaveBeenCalledTimes(1);
    deferred.resolve({});
    expect(
      await screen.findByText("Forecast regenerated successfully."),
    ).toBeInTheDocument();
  });

  it("refreshes Forecast status and the Working Schedule after regeneration", async () => {
    const refreshedOverview = overview();
    refreshedOverview.currentForecast!.scheduleVersion = 4;
    planningMocks.getProjectForecastOverview
      .mockResolvedValueOnce(overview())
      .mockResolvedValueOnce(refreshedOverview);
    const onWorkspaceRefresh = vi.fn().mockResolvedValue(undefined);
    renderStatus(onWorkspaceRefresh);
    await screen.findByText("Schedule v3");

    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    );

    expect(await screen.findByText("Schedule v4")).toBeInTheDocument();
    expect(onWorkspaceRefresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Forecast regenerated successfully."),
    ).toBeInTheDocument();
  });

  it("fetches fresh History after Forecast regeneration", async () => {
    const refreshedOverview = overview();
    refreshedOverview.currentForecast!.scheduleVersion = 4;
    planningMocks.getProjectForecastOverview
      .mockResolvedValueOnce(overview())
      .mockResolvedValueOnce(refreshedOverview);
    planningMocks.getProjectForecastHistory
      .mockResolvedValueOnce({
        hasMore: false,
        items: [historyItem({ isCurrent: true, scheduleVersion: 3 })],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        hasMore: false,
        items: [historyItem({ isCurrent: true, scheduleVersion: 4 })],
        nextCursor: null,
      });
    renderStatus();
    await screen.findByText("Schedule v3");

    fireEvent.click(screen.getByRole("button", { name: "Forecast History" }));
    let dialog = await screen.findByRole("dialog", { name: "Forecast History" });
    expect(within(dialog).getByText("Schedule v3")).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close Forecast History" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    );
    expect(await screen.findByText("Schedule v4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Forecast History" }));
    dialog = await screen.findByRole("dialog", { name: "Forecast History" });
    expect(within(dialog).getByText("Schedule v4")).toBeInTheDocument();
    expect(planningMocks.getProjectForecastHistory).toHaveBeenCalledTimes(2);
  });

  it("preserves displayed Forecast state and reports regeneration failure", async () => {
    planningMocks.regeneratePlanningWorkspace.mockRejectedValue(
      new Error("Unable to schedule"),
    );
    renderStatus();
    await screen.findByText("Schedule v3");

    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "existing Forecast and Working Schedule are unchanged",
    );
    expect(screen.getByText("Schedule v3")).toBeInTheDocument();
  });

  it("opens Forecast History from its accessible entry point", async () => {
    renderStatus();
    await screen.findByText("Schedule v3");

    const history = screen.getByRole("button", { name: "Forecast History" });
    expect(history).toBeEnabled();
    fireEvent.click(history);

    expect(
      await screen.findByRole("dialog", { name: "Forecast History" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Close Forecast History" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Schedule v3")).toBeInTheDocument();
  });

  it("enters and exits a read-only historical Forecast selection", async () => {
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [historyItem({ scheduleVersion: 2 })],
      nextCursor: null,
    });
    renderStatus();
    await screen.findByText("Schedule v3");

    fireEvent.click(screen.getByRole("button", { name: "Forecast History" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "View Schedule v2" }),
    );

    expect(
      screen.getByRole("heading", { name: "Historical Forecast" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Read only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /activate/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Read-only historical snapshot. The Working Schedule below remains live.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to Current Forecast" }),
    );
    expect(
      screen.getByRole("heading", { name: "Forecast" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Schedule v3")).toBeInTheDocument();
  });

  it("keeps the authoritative Current Forecast when Current is selected from History", async () => {
    const onSelectHistoricalForecast = vi.fn();
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [historyItem({ isCurrent: true, scheduleVersion: 3 })],
      nextCursor: null,
    });
    renderStatus(vi.fn().mockResolvedValue(undefined), {
      onSelectHistoricalForecast,
    });
    await screen.findByText("Schedule v3");

    fireEvent.click(screen.getByRole("button", { name: "Forecast History" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "View Current" }),
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Forecast" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Historical Forecast" }),
    ).not.toBeInTheDocument();
    expect(onSelectHistoricalForecast).not.toHaveBeenCalled();
  });

  it("announces localized historical loading without hiding current Planning state", async () => {
    renderStatus(
      vi.fn().mockResolvedValue(undefined),
      {
        isHistoricalForecastLoading: true,
        selectedHistoricalForecastSummary: historyItem({ scheduleVersion: 2 }),
      },
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Loading Schedule v2 historical Forecast",
    );
    expect(
      screen.getByText(
        "Read-only historical snapshot. The Working Schedule below remains live.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Current Forecast" })).toBeEnabled();
  });

  it("offers an accessible retry for a historical snapshot error", async () => {
    const onRetryHistoricalForecast = vi.fn();
    renderStatus(
      vi.fn().mockResolvedValue(undefined),
      {
        historicalForecastError:
          "Historical Forecast could not be loaded. Try again.",
        onRetryHistoricalForecast,
        selectedHistoricalForecastSummary: historyItem({ scheduleVersion: 2 }),
      },
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Historical Forecast could not be loaded. Try again.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry historical Forecast" }),
    );
    expect(onRetryHistoricalForecast).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        "Read-only historical snapshot. The Working Schedule below remains live.",
      ),
    ).toBeInTheDocument();
  });

  it("uses responsive stacking without horizontal overflow", async () => {
    const { container } = renderStatus();
    await screen.findByText("Schedule v3");

    expect(container.querySelector(".md\\:grid-cols-3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Forecast" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Forecast actions" }),
    ).toBeInTheDocument();
  });
});

function renderStatus(
  onWorkspaceRefresh = vi.fn().mockResolvedValue(undefined),
  props: Partial<React.ComponentProps<typeof ForecastStatus>> = {},
) {
  function ControlledForecastStatus() {
    const [selectedForecast, setSelectedForecast] =
      React.useState<ApiForecastHistoryItem | null>(
        props.selectedHistoricalForecastSummary ?? null,
      );

    return (
      <ForecastStatus
        {...props}
        onClearHistoricalForecast={() => {
          setSelectedForecast(null);
          props.onClearHistoricalForecast?.();
        }}
        onSelectHistoricalForecast={(snapshotId, forecast) => {
          setSelectedForecast(forecast);
          props.onSelectHistoricalForecast?.(snapshotId, forecast);
        }}
        onWorkspaceRefresh={onWorkspaceRefresh}
        projectId="project-1"
        selectedHistoricalForecastSummary={selectedForecast}
      />
    );
  }

  return render(
    <ControlledForecastStatus />,
  );
}

function overview({
  activeBaseline = baseline(),
  currentForecast = forecast(),
  variance = 2,
}: {
  activeBaseline?: ApiForecastOverview["activeBaseline"];
  currentForecast?: ApiForecastOverview["currentForecast"];
  variance?: number | null;
} = {}): ApiForecastOverview {
  return {
    activeBaseline,
    availability: {
      activeBaseline: Boolean(activeBaseline),
      currentForecast: Boolean(currentForecast),
      originalBaseline: Boolean(activeBaseline),
      previousForecast: false,
    },
    currentForecast,
    finishVarianceFromCurrentActiveBaselineDays: variance,
    finishVarianceFromPreviousDays: null,
    originalBaseline: activeBaseline,
    previousForecast: null,
    projectId: "project-1",
    warnings: [],
    workingOutputState: "not_requested",
  };
}

function baseline(): NonNullable<ApiForecastOverview["activeBaseline"]> {
  return {
    capturedAt: "2026-08-20T10:00:00.000Z",
    capturedBy: { id: "user-1", name: "Ram Datla" },
    id: "baseline-1",
    isCurrent: true,
    milestoneCount: 2,
    name: "Delivery Commitment",
    projectFinishDate: "2026-08-25",
    projectId: "project-1",
    projectStartDate: "2026-08-01",
    status: "approved",
    taskCount: 10,
    unscheduledExecutableTaskCount: 0,
    versionNumber: 1,
  };
}

function forecast(): NonNullable<ApiForecastOverview["currentForecast"]> {
  return {
    calculatedAt: "2026-08-22T10:00:00.000Z",
    calculationStatus: "calculated",
    criticalTaskCount: 2,
    generatedBy: { id: "user-1", name: "Ram Datla" },
    isCurrent: true,
    milestoneCount: 2,
    projectFinishDate: "2026-08-27",
    projectId: "project-1",
    projectStartDate: "2026-08-01",
    scheduleAnchorDate: "2026-08-01",
    scheduleVersion: 3,
    snapshotId: "forecast-3",
    taskCount: 10,
    unscheduledExecutableTaskCount: 0,
  };
}

function historyItem({
  isCurrent = false,
  scheduleVersion,
}: {
  isCurrent?: boolean;
  scheduleVersion: number;
}): ApiForecastHistoryItem {
  return {
    calculatedAt: "2026-08-21T10:00:00.000Z",
    criticalTaskCount: 1,
    finishVarianceFromCurrentActiveBaselineDays: 0,
    finishVarianceFromPreviousDays: 1,
    generatedBy: { id: "user-1", name: "Ram Datla" },
    isCurrent,
    milestoneCount: 2,
    projectFinishDate: "2026-08-25",
    projectStartDate: "2026-08-01",
    scheduleVersion,
    snapshotId: `forecast-${scheduleVersion}`,
    taskCount: 10,
    unscheduledExecutableTaskCount: 0,
  };
}

function createDeferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
