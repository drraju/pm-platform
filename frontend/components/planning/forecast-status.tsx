"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ErrorState,
  LoadingState,
  StatusBadge,
  WorkspaceSection,
} from "@/components/foundation";
import { ForecastHistoryDrawer } from "@/components/planning/forecast-history-drawer";
import {
  getProjectForecastOverview,
  regeneratePlanningWorkspace,
  type ApiForecastHistoryItem,
  type ApiForecastOverview,
} from "@/features/planning";

type ForecastStatusProps = {
  onWorkspaceRefresh: () => Promise<void>;
  projectId: string;
};

const primaryButtonClassName =
  "inline-flex min-h-9 items-center justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function ForecastStatus({
  onWorkspaceRefresh,
  projectId,
}: ForecastStatusProps) {
  const [overview, setOverview] = useState<ApiForecastOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedForecast, setSelectedForecast] =
    useState<ApiForecastHistoryItem | null>(null);

  const loadOverview = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      setOverview(await getProjectForecastOverview(projectId));
    } catch (requestError) {
      setError(toForecastErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function regenerateForecast() {
    setError(null);
    setSuccessMessage(null);
    setIsRegenerating(true);
    try {
      await regeneratePlanningWorkspace(projectId);
      const [nextOverview] = await Promise.all([
        getProjectForecastOverview(projectId),
        onWorkspaceRefresh(),
      ]);
      setOverview(nextOverview);
      setSuccessMessage("Forecast regenerated successfully.");
    } catch (requestError) {
      setError(toRegenerationErrorMessage(requestError));
    } finally {
      setIsRegenerating(false);
    }
  }

  const currentForecast = overview?.currentForecast ?? null;
  const activeBaseline = overview?.activeBaseline ?? null;
  const variance = overview?.finishVarianceFromCurrentActiveBaselineDays ?? null;

  return (
    <>
      <WorkspaceSection
        aria-labelledby="forecast-status-heading"
        className="overflow-hidden"
        padding="compact"
        surface="card"
      >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-sm font-semibold text-slate-950"
              id="forecast-status-heading"
            >
              {selectedForecast ? "Historical Forecast" : "Forecast"}
            </h2>
            {selectedForecast ? (
              <StatusBadge size="sm" tone="neutral">
                Read only
              </StatusBadge>
            ) : currentForecast ? (
              <StatusBadge dot size="sm" tone="success">
                Current
              </StatusBadge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {selectedForecast
              ? `Schedule v${selectedForecast.scheduleVersion} is selected for review. The Working Schedule below remains live.`
              : "Authoritative projection compared with the Active Baseline."}
          </p>
        </div>
        <div
          aria-label="Forecast actions"
          className="flex flex-wrap items-center gap-2"
          role="group"
        >
          {selectedForecast ? (
            <button
              className={primaryButtonClassName}
              onClick={() => setSelectedForecast(null)}
              type="button"
            >
              Back to Current Forecast
            </button>
          ) : (
            <button
              className={primaryButtonClassName}
              disabled={isLoading || isRegenerating}
              onClick={() => void regenerateForecast()}
              type="button"
            >
              {isRegenerating
                ? "Regenerating Forecast…"
                : "Regenerate Forecast"}
            </button>
          )}
          <button
            className={secondaryButtonClassName}
            disabled={isRegenerating}
            onClick={() => setHistoryOpen(true)}
            type="button"
          >
            Forecast History
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState
          className="mt-3 border-t border-slate-100 pt-3"
          compact
          label="Loading Forecast status"
          rows={2}
        />
      ) : null}

      {!isLoading && error ? (
        <ErrorState
          action={
            <button
              className={secondaryButtonClassName}
              onClick={() => void loadOverview()}
              type="button"
            >
              Retry Forecast status
            </button>
          }
          className="mt-3"
          message={error}
          title="Unable to show Forecast status"
        />
      ) : null}

      {selectedForecast ? (
        <HistoricalForecastSelection forecast={selectedForecast} />
      ) : !isLoading && overview ? (
        <div className="mt-3 grid min-w-0 gap-3 border-t border-slate-100 pt-3 md:grid-cols-3 md:divide-x md:divide-slate-200">
          <div className="min-w-0 md:pr-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Forecast
            </p>
            {currentForecast ? (
              <>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Schedule v{currentForecast.scheduleVersion}
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {formatDate(
                    currentForecast.projectFinishDate,
                    "Not scheduled",
                  )}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {formatGeneratedBy(currentForecast)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  No forecast generated
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Regenerate Forecast to publish the first authoritative
                  projection.
                </p>
              </>
            )}
          </div>

          <div className="min-w-0 border-t border-slate-200 pt-3 md:border-t-0 md:px-4 md:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active Baseline
            </p>
            {activeBaseline ? (
              <>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                    {activeBaseline.name} · v{activeBaseline.versionNumber}
                  </p>
                  <StatusBadge size="sm" tone="success">
                    Approved
                  </StatusBadge>
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatDate(activeBaseline.projectFinishDate, "Not scheduled")}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Not established
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  No Active Baseline has been set for this project.
                </p>
              </>
            )}
          </div>

          <div className="min-w-0 border-t border-slate-200 pt-3 md:border-t-0 md:pl-4 md:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Forecast vs Baseline
            </p>
            <VarianceStatus
              baselineFinishDate={activeBaseline?.projectFinishDate}
              forecastFinishDate={currentForecast?.projectFinishDate}
              variance={variance}
            />
          </div>
        </div>
      ) : null}

      <div
        aria-live="polite"
        className={successMessage ? "mt-2 text-xs" : "sr-only"}
      >
        {successMessage ? (
          <span className="font-medium text-status-success-strong">
            {successMessage}
          </span>
        ) : null}
      </div>
      </WorkspaceSection>

      {historyOpen ? (
        <ForecastHistoryDrawer
          onClose={() => setHistoryOpen(false)}
          onRegenerateForecast={() => void regenerateForecast()}
          onSelectForecast={(forecast) =>
            setSelectedForecast(forecast.isCurrent ? null : forecast)
          }
          projectId={projectId}
        />
      ) : null}
    </>
  );
}

function HistoricalForecastSelection({
  forecast,
}: {
  forecast: ApiForecastHistoryItem;
}) {
  return (
    <div className="mt-3 grid min-w-0 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
      <div className="min-w-0 sm:pr-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Selected Version
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          Schedule v{forecast.scheduleVersion}
        </p>
        <p className="mt-1 text-xl font-semibold text-slate-950">
          {formatDate(forecast.projectFinishDate, "Not scheduled")}
        </p>
      </div>
      <div className="min-w-0 border-t border-slate-200 pt-3 sm:border-t-0 sm:px-4 sm:pt-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Change from Previous
        </p>
        <HistoricalVariance
          variance={forecast.finishVarianceFromPreviousDays}
        />
      </div>
      <div className="min-w-0 border-t border-slate-200 pt-3 sm:border-t-0 sm:pl-4 sm:pt-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Capture Details
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900">
          {formatGeneratedByHistory(forecast)}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Read-only summary. Historical Gantt rendering is reserved for the
          comparison workspace.
        </p>
      </div>
    </div>
  );
}

function HistoricalVariance({ variance }: { variance: number | null }) {
  if (variance === null) {
    return <p className="mt-1 text-sm font-medium text-slate-900">Initial Forecast</p>;
  }
  if (variance === 0) {
    return (
      <div className="mt-1">
        <StatusBadge size="sm" tone="neutral">
          On previous
        </StatusBadge>
      </div>
    );
  }

  const absoluteDays = Math.abs(variance);
  return (
    <div className="mt-1">
      <StatusBadge size="sm" tone={variance > 0 ? "warning" : "success"}>
        {variance > 0 ? "+" : "-"}
        {absoluteDays} {absoluteDays === 1 ? "day" : "days"}
      </StatusBadge>
      <p className="mt-2 text-xs text-slate-600">
        {variance > 0 ? "Later than previous" : "Earlier than previous"}
      </p>
    </div>
  );
}

function VarianceStatus({
  baselineFinishDate,
  forecastFinishDate,
  variance,
}: {
  baselineFinishDate?: string | null;
  forecastFinishDate?: string | null;
  variance: number | null;
}) {
  if (!baselineFinishDate || !forecastFinishDate || variance === null) {
    return (
      <>
        <p className="mt-1 text-sm font-semibold text-slate-900">Not available</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Forecast and Active Baseline finish dates are required.
        </p>
      </>
    );
  }

  if (variance === 0) {
    return (
      <div className="mt-1">
        <StatusBadge size="sm" tone="neutral">
          On baseline
        </StatusBadge>
        <p className="mt-2 text-xs text-slate-600">
          Both finish {formatDate(forecastFinishDate, "on the same date")}.
        </p>
      </div>
    );
  }

  const absoluteDays = Math.abs(variance);
  const label = `${variance > 0 ? "+" : "-"}${absoluteDays} ${absoluteDays === 1 ? "day" : "days"}`;
  const context =
    variance > 0 ? "Later than baseline" : "Earlier than baseline";

  return (
    <div className="mt-1">
      <StatusBadge size="sm" tone={variance > 0 ? "warning" : "success"}>
        {label}
      </StatusBadge>
      <p className="mt-2 text-xs font-medium text-slate-700">{context}</p>
      <p className="mt-1 text-xs text-slate-600">
        Baseline {formatDate(baselineFinishDate, "not scheduled")}
      </p>
    </div>
  );
}

function formatGeneratedByHistory(forecast: ApiForecastHistoryItem) {
  const generatedDate = formatDate(forecast.calculatedAt, null);
  const generatedBy = forecast.generatedBy?.name ?? null;
  if (!generatedDate && !generatedBy) return "Generation details unavailable";
  if (!generatedDate) return `Generated by ${generatedBy}`;
  if (!generatedBy) return `Generated ${generatedDate}`;
  return `Generated ${generatedDate} · ${generatedBy}`;
}

function formatGeneratedBy(
  forecast: NonNullable<ApiForecastOverview["currentForecast"]>,
) {
  const generatedDate = formatDate(forecast.calculatedAt, null);
  const generatedBy = forecast.generatedBy?.name ?? null;
  if (!generatedDate && !generatedBy) return "Generation details unavailable";
  if (!generatedDate) return `Generated by ${generatedBy}`;
  if (!generatedBy) return `Generated ${generatedDate}`;
  return `Generated ${generatedDate} · ${generatedBy}`;
}

function formatDate(value: string | null | undefined, fallback: string | null) {
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

function toForecastErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("Active baseline lifecycle invariant violated")
  ) {
    return "Forecast status is unavailable because the Active Baseline configuration is invalid. Contact a project administrator.";
  }
  return "Forecast status could not be loaded. Try again.";
}

function toRegenerationErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("Active baseline lifecycle invariant violated")
  ) {
    return toForecastErrorMessage(error);
  }
  return "Forecast could not be regenerated. Your existing Forecast and Working Schedule are unchanged.";
}
