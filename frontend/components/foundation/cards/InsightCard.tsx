import React from "react";
import { classNames } from "@/components/ui/classnames";
import { EmptyState } from "../feedback/EmptyState";
import { ErrorState } from "../feedback/ErrorState";
import { LoadingState } from "../feedback/LoadingState";

export type InsightCardState =
  | "available"
  | "empty"
  | "error"
  | "loading"
  | "unavailable";

export interface InsightCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  detail?: React.ReactNode;
  emptyMessage?: string;
  errorMessage?: string;
  expandable?: boolean;
  loadingLabel?: string;
  state: InsightCardState;
  summary?: React.ReactNode;
  title: React.ReactNode;
  unavailableMessage?: string;
}

export function InsightCard({
  action,
  className,
  detail,
  emptyMessage = "No insights are available.",
  errorMessage = "Unable to load insights.",
  expandable = false,
  loadingLabel = "Loading insights",
  state,
  summary,
  title,
  unavailableMessage = "Insights are currently unavailable.",
  ...props
}: InsightCardProps) {
  return (
    <section
      className={classNames(
        "min-w-0 rounded-ui border border-slate-200/80 bg-ui-surface p-5 shadow-ui-subtle",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-ui-section text-slate-950">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3">
        {state === "loading" ? <LoadingState compact label={loadingLabel} /> : null}
        {state === "empty" ? (
          <EmptyState compact description={emptyMessage} title="No insights" />
        ) : null}
        {state === "unavailable" ? (
          <EmptyState
            compact
            description={unavailableMessage}
            title="Insights unavailable"
          />
        ) : null}
        {state === "error" ? <ErrorState message={errorMessage} /> : null}
        {state === "available" && expandable && detail ? (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-sm text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30">
              {summary}
              <span className="ml-2 font-semibold text-brand group-open:hidden">
                Show details
              </span>
              <span className="ml-2 hidden font-semibold text-brand group-open:inline">
                Hide details
              </span>
            </summary>
            <div className="mt-3 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-700">
              {detail}
            </div>
          </details>
        ) : null}
        {state === "available" && (!expandable || !detail) ? (
          <div className="text-sm leading-6 text-slate-700">{summary}</div>
        ) : null}
      </div>
    </section>
  );
}
