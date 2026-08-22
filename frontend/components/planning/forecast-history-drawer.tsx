"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "@/components/foundation";
import { AppModal } from "@/components/ui/app-modal";
import {
  getProjectForecastHistory,
  type ApiForecastHistoryItem,
} from "@/features/planning";

const historyPageSize = 25;
const actionButtonClassName =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60";

type ForecastHistoryDrawerProps = {
  onClose: () => void;
  onRegenerateForecast: () => void;
  onSelectForecast: (forecast: ApiForecastHistoryItem) => void;
  projectId: string;
};

export function ForecastHistoryDrawer({
  onClose,
  onRegenerateForecast,
  onSelectForecast,
  projectId,
}: ForecastHistoryDrawerProps) {
  const [items, setItems] = useState<ApiForecastHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const loadingMoreRef = useRef(false);

  const loadInitialHistory = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await getProjectForecastHistory(projectId, {
        limit: historyPageSize,
      });
      setItems(response.items);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (requestError) {
      setError(toHistoryErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadInitialHistory();
  }, [loadInitialHistory]);

  async function loadMoreHistory() {
    if (loadingMoreRef.current || !hasMore || nextCursor === null) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const response = await getProjectForecastHistory(projectId, {
        beforeVersion: nextCursor,
        limit: historyPageSize,
      });
      setItems((currentItems) => [...currentItems, ...response.items]);
      setHasMore(response.hasMore);
      setNextCursor(response.nextCursor);
    } catch (requestError) {
      setLoadMoreError(toHistoryErrorMessage(requestError));
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }

  return (
    <AppModal
      bodyClassName="bg-slate-50"
      description="Deliberate Forecast captures, newest first."
      labelledById="forecast-history-title"
      onClose={onClose}
      placement="right"
      title="Forecast History"
      widthClassName="max-w-[27rem]"
    >
      {isLoading ? (
        <LoadingState compact label="Loading Forecast History" rows={5} />
      ) : null}

      {!isLoading && error ? (
        <ErrorState
          action={
            <button
              className={actionButtonClassName}
              onClick={() => void loadInitialHistory()}
              type="button"
            >
              Retry Forecast History
            </button>
          }
          message={error}
          title="Unable to show Forecast History"
        />
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          action={
            <button
              className={actionButtonClassName}
              onClick={() => {
                onClose();
                onRegenerateForecast();
              }}
              type="button"
            >
              Regenerate Forecast
            </button>
          }
          compact
          description="The Working Schedule can be turned into the first authoritative Forecast."
          title="No Forecasts have been generated yet."
        />
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <div className="space-y-3" data-testid="forecast-history-list">
          {items.map((item) => (
            <ForecastHistoryEntry
              forecast={item}
              key={item.snapshotId}
              onView={() => {
                onSelectForecast(item);
                onClose();
              }}
            />
          ))}

          {loadMoreError ? (
            <ErrorState
              action={
                <button
                  className={actionButtonClassName}
                  onClick={() => void loadMoreHistory()}
                  type="button"
                >
                  Retry loading older Forecasts
                </button>
              }
              message={loadMoreError}
              title="Unable to load older Forecasts"
            />
          ) : null}

          {hasMore && !loadMoreError ? (
            <button
              className={`${actionButtonClassName} w-full`}
              disabled={isLoadingMore}
              onClick={() => void loadMoreHistory()}
              type="button"
            >
              {isLoadingMore ? "Loading older Forecasts…" : "Load older Forecasts"}
            </button>
          ) : !hasMore ? (
            <p className="py-1 text-center text-xs text-slate-500">
              All Forecast versions are shown.
            </p>
          ) : null}
        </div>
      ) : null}
    </AppModal>
  );
}

function ForecastHistoryEntry({
  forecast,
  onView,
}: {
  forecast: ApiForecastHistoryItem;
  onView: () => void;
}) {
  return (
    <article
      className={`rounded-md border p-4 ${
        forecast.isCurrent
          ? "border-brand/30 bg-brand/5"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {forecast.isCurrent ? (
            <StatusBadge dot size="sm" tone="success">
              Current
            </StatusBadge>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Historical Forecast
            </p>
          )}
          <h3 className="mt-2 text-sm font-semibold text-slate-950">
            Schedule v{forecast.scheduleVersion}
          </h3>
        </div>
        <button
          className={actionButtonClassName}
          onClick={onView}
          type="button"
        >
          {forecast.isCurrent
            ? "View Current"
            : `View Schedule v${forecast.scheduleVersion}`}
        </button>
      </div>

      <p className="mt-3 text-xl font-semibold text-slate-950">
        {formatDate(forecast.projectFinishDate, "Not scheduled")}
      </p>
      <PreviousVariance variance={forecast.finishVarianceFromPreviousDays} />
      <p className="mt-3 text-xs leading-5 text-slate-600">
        {formatGeneratedBy(forecast)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {formatCount(forecast.taskCount, "task")} · {forecast.criticalTaskCount}{" "}
        critical
      </p>
    </article>
  );
}

function PreviousVariance({ variance }: { variance: number | null }) {
  if (variance === null) {
    return <p className="mt-2 text-sm font-medium text-slate-700">Initial Forecast</p>;
  }

  if (variance === 0) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge size="sm" tone="neutral">
          On previous
        </StatusBadge>
        <span className="text-xs text-slate-600">Finish unchanged</span>
      </div>
    );
  }

  const absoluteDays = Math.abs(variance);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <StatusBadge size="sm" tone={variance > 0 ? "warning" : "success"}>
        {variance > 0 ? "+" : "-"}
        {absoluteDays} {absoluteDays === 1 ? "day" : "days"}
      </StatusBadge>
      <span className="text-xs text-slate-600">
        {variance > 0 ? "Later than previous" : "Earlier than previous"}
      </span>
    </div>
  );
}

function formatGeneratedBy(forecast: ApiForecastHistoryItem) {
  const generatedAt = formatDateTime(forecast.calculatedAt);
  const generatedBy = forecast.generatedBy?.name ?? null;
  if (!generatedAt && !generatedBy) return "Generation details unavailable";
  if (!generatedAt) return `Generated by ${generatedBy}`;
  if (!generatedBy) return `Generated ${generatedAt}`;
  return `Generated ${generatedAt} · ${generatedBy}`;
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatCount(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function toHistoryErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("Active baseline lifecycle invariant violated")
  ) {
    return "Forecast History is unavailable because the Active Baseline configuration is invalid. Contact a project administrator.";
  }
  return "Forecast History could not be loaded. Try again.";
}
