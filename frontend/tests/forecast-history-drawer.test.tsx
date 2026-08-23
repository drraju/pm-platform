import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForecastHistoryDrawer } from "@/components/planning/forecast-history-drawer";
import type { ApiForecastHistoryItem } from "@/lib/api/client";

const planningMocks = vi.hoisted(() => ({
  getProjectForecastHistory: vi.fn(),
}));

vi.mock("@/features/planning", () => ({
  getProjectForecastHistory: planningMocks.getProjectForecastHistory,
}));

describe("ForecastHistoryDrawer", () => {
  beforeEach(() => {
    planningMocks.getProjectForecastHistory.mockReset();
    planningMocks.getProjectForecastHistory.mockResolvedValue(historyPage());
  });

  it("renders an accessible right-side Forecast History drawer", async () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });

    const dialog = screen.getByRole("dialog", { name: "Forecast History" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close Forecast History" })).toHaveFocus();
    expect(screen.getByTestId("app-modal-panel")).toHaveClass(
      "max-w-[27rem]",
      "h-full",
      "w-full",
    );
    expect(await screen.findByText("Schedule v3")).toBeInTheDocument();
    expect(planningMocks.getProjectForecastHistory).toHaveBeenCalledWith(
      "project-1",
      { limit: 25 },
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading without flashing the empty state", () => {
    planningMocks.getProjectForecastHistory.mockReturnValue(new Promise(() => {}));
    renderDrawer();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading Forecast History",
    );
    expect(
      screen.queryByText("No Forecasts have been generated yet."),
    ).not.toBeInTheDocument();
  });

  it("shows an actionable empty state without inventing Forecast v0", async () => {
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [],
      nextCursor: null,
    });
    const onClose = vi.fn();
    const onRegenerateForecast = vi.fn();
    renderDrawer({ onClose, onRegenerateForecast });

    expect(
      await screen.findByText("No Forecasts have been generated yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/v0/i)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Regenerate Forecast" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRegenerateForecast).toHaveBeenCalledTimes(1);
  });

  it("shows a concise API error and retries", async () => {
    planningMocks.getProjectForecastHistory
      .mockRejectedValueOnce(new Error("Request failed with 500"))
      .mockResolvedValueOnce(historyPage());
    renderDrawer();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Forecast History could not be loaded. Try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("500");
    fireEvent.click(
      screen.getByRole("button", { name: "Retry Forecast History" }),
    );
    expect(await screen.findByText("Schedule v3")).toBeInTheDocument();
    expect(planningMocks.getProjectForecastHistory).toHaveBeenCalledTimes(2);
  });

  it("preserves backend newest-first ordering and marks Current clearly", async () => {
    renderDrawer();

    const list = await screen.findByTestId("forecast-history-list");
    expect(
      within(list)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Schedule v3", "Schedule v2", "Schedule v1"]);
    expect(within(list).getByText("Current")).toBeInTheDocument();
    expect(within(list).getAllByText("Historical Forecast")).toHaveLength(2);
  });

  it("renders Initial Forecast for a null previous variance", async () => {
    renderDrawer();

    expect(await screen.findByText("Initial Forecast")).toBeInTheDocument();
    expect(screen.queryByText("N/A variance")).not.toBeInTheDocument();
    expect(screen.queryByText("-0 days")).not.toBeInTheDocument();
  });

  it("renders positive, negative, and zero backend variances", async () => {
    planningMocks.getProjectForecastHistory.mockResolvedValue(
      historyPage([
        historyItem({ isCurrent: true, scheduleVersion: 4, variance: 2 }),
        historyItem({ scheduleVersion: 3, variance: -1 }),
        historyItem({ scheduleVersion: 2, variance: 0 }),
        historyItem({ scheduleVersion: 1, variance: null }),
      ]),
    );
    renderDrawer();

    expect(await screen.findByText("+2 days")).toBeInTheDocument();
    expect(screen.getByText("Later than previous")).toBeInTheDocument();
    expect(screen.getByText("-1 day")).toBeInTheDocument();
    expect(screen.getByText("Earlier than previous")).toBeInTheDocument();
    expect(screen.getByText("On previous")).toBeInTheDocument();
    expect(screen.getByText("Finish unchanged")).toBeInTheDocument();
  });

  it("shows generated metadata and PM-relevant counts without internal IDs", async () => {
    renderDrawer();

    expect(
      await screen.findAllByText("Generated 22 Aug 2026, 10:00 · Ram Datla"),
    ).toHaveLength(3);
    expect(screen.getAllByText("12 tasks · 3 critical")).toHaveLength(3);
    expect(screen.queryByText("snapshot-3")).not.toBeInTheDocument();
  });

  it("uses nextCursor pagination and keeps loaded versions visible", async () => {
    const deferred = createDeferred<ReturnType<typeof historyPage>>();
    planningMocks.getProjectForecastHistory
      .mockResolvedValueOnce(
        historyPage(
          [
            historyItem({ isCurrent: true, scheduleVersion: 3, variance: 1 }),
            historyItem({ scheduleVersion: 2, variance: 1 }),
          ],
          { hasMore: true, nextCursor: 2 },
        ),
      )
      .mockReturnValueOnce(deferred.promise);
    renderDrawer();
    await screen.findByText("Schedule v3");

    fireEvent.click(
      screen.getByRole("button", { name: "Load older Forecasts" }),
    );

    expect(screen.getByText("Schedule v3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Loading older Forecasts…" }),
    ).toBeDisabled();
    expect(planningMocks.getProjectForecastHistory).toHaveBeenNthCalledWith(
      2,
      "project-1",
      { beforeVersion: 2, limit: 25 },
    );

    await act(async () => {
      deferred.resolve(
        historyPage([historyItem({ scheduleVersion: 1, variance: null })]),
      );
    });
    expect(await screen.findByText("Schedule v1")).toBeInTheDocument();
    expect(screen.getByText("Schedule v3")).toBeInTheDocument();
  });

  it("does not offer or request another page when hasMore is false", async () => {
    renderDrawer();

    expect(await screen.findByText("All Forecast versions are shown.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Load older Forecasts" }),
    ).not.toBeInTheDocument();
    expect(planningMocks.getProjectForecastHistory).toHaveBeenCalledTimes(1);
  });

  it("selects a historical Forecast for viewing without activation", async () => {
    const onClose = vi.fn();
    const onSelectForecast = vi.fn();
    renderDrawer({ onClose, onSelectForecast });

    fireEvent.click(
      await screen.findByRole("button", { name: "View Schedule v2" }),
    );

    expect(onSelectForecast).toHaveBeenCalledWith(
      "snapshot-2",
      expect.objectContaining({ isCurrent: false, scheduleVersion: 2 }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /activate/i })).not.toBeInTheDocument();
  });
});

function renderDrawer({
  onClose = vi.fn(),
  onRegenerateForecast = vi.fn(),
  onSelectForecast = vi.fn(),
}: {
  onClose?: () => void;
  onRegenerateForecast?: () => void;
  onSelectForecast?: (
    snapshotId: string,
    forecast: ApiForecastHistoryItem,
  ) => void;
} = {}) {
  return render(
    <ForecastHistoryDrawer
      onClose={onClose}
      onRegenerateForecast={onRegenerateForecast}
      onSelectForecast={onSelectForecast}
      projectId="project-1"
    />,
  );
}

function historyPage(
  items = [
    historyItem({ isCurrent: true, scheduleVersion: 3, variance: 2 }),
    historyItem({ scheduleVersion: 2, variance: -1 }),
    historyItem({ scheduleVersion: 1, variance: null }),
  ],
  pagination: { hasMore?: boolean; nextCursor?: number | null } = {},
) {
  return {
    hasMore: pagination.hasMore ?? false,
    items,
    nextCursor: pagination.nextCursor ?? null,
  };
}

function historyItem({
  isCurrent = false,
  scheduleVersion,
  variance,
}: {
  isCurrent?: boolean;
  scheduleVersion: number;
  variance: number | null;
}): ApiForecastHistoryItem {
  return {
    calculatedAt: "2026-08-22T10:00:00.000Z",
    criticalTaskCount: 3,
    finishVarianceFromCurrentActiveBaselineDays: 2,
    finishVarianceFromPreviousDays: variance,
    generatedBy: { id: "user-1", name: "Ram Datla" },
    isCurrent,
    milestoneCount: 2,
    projectFinishDate: "2026-08-27",
    projectStartDate: "2026-08-01",
    scheduleVersion,
    snapshotId: `snapshot-${scheduleVersion}`,
    taskCount: 12,
    unscheduledExecutableTaskCount: 0,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
