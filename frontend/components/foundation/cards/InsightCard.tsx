import React from "react";
import { classNames } from "@/components/ui/classnames";
import { EmptyState } from "../feedback/EmptyState";
import { ErrorState } from "../feedback/ErrorState";
import { LoadingState } from "../feedback/LoadingState";
import type {
  FoundationHeadingLevel,
  FoundationSectionElement,
} from "../types";

export type InsightCardState =
  | "available"
  | "empty"
  | "error"
  | "loading"
  | "unavailable";

interface InsightCardCommonProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  as?: FoundationSectionElement;
  headingLevel?: FoundationHeadingLevel;
  title: React.ReactNode;
}

interface AvailableInsightCardProps {
  detail?: never;
  emptyMessage?: never;
  errorMessage?: never;
  expandable?: false;
  loadingLabel?: never;
  state: "available";
  summary: React.ReactNode;
  unavailableMessage?: never;
}

interface ExpandableInsightCardProps {
  detail: React.ReactNode;
  emptyMessage?: never;
  errorMessage?: never;
  expandable: true;
  loadingLabel?: never;
  state: "available";
  summary: React.ReactNode;
  unavailableMessage?: never;
}

interface EmptyInsightCardProps {
  detail?: never;
  emptyMessage?: React.ReactNode;
  errorMessage?: never;
  expandable?: never;
  loadingLabel?: never;
  state: "empty";
  summary?: never;
  unavailableMessage?: never;
}

interface ErrorInsightCardProps {
  detail?: never;
  emptyMessage?: never;
  errorMessage?: React.ReactNode;
  expandable?: never;
  loadingLabel?: never;
  state: "error";
  summary?: never;
  unavailableMessage?: never;
}

interface LoadingInsightCardProps {
  detail?: never;
  emptyMessage?: never;
  errorMessage?: never;
  expandable?: never;
  loadingLabel?: string;
  state: "loading";
  summary?: never;
  unavailableMessage?: never;
}

interface UnavailableInsightCardProps {
  detail?: never;
  emptyMessage?: never;
  errorMessage?: never;
  expandable?: never;
  loadingLabel?: never;
  state: "unavailable";
  summary?: never;
  unavailableMessage?: React.ReactNode;
}

export type InsightCardProps = InsightCardCommonProps &
  (
    | AvailableInsightCardProps
    | EmptyInsightCardProps
    | ErrorInsightCardProps
    | ExpandableInsightCardProps
    | LoadingInsightCardProps
    | UnavailableInsightCardProps
  );

export function InsightCard({
  action,
  as = "section",
  className,
  detail,
  emptyMessage = "No insights are available.",
  errorMessage = "Unable to load insights.",
  expandable,
  headingLevel = 2,
  loadingLabel = "Loading insights",
  state,
  summary,
  title,
  unavailableMessage = "Insights are currently unavailable.",
  ...props
}: InsightCardProps) {
  const heading = React.createElement(
    `h${headingLevel}`,
    { className: "text-ui-section text-slate-950" },
    title,
  );

  return React.createElement(
    as,
    {
      ...props,
      className: classNames(
        "min-w-0 rounded-ui border border-slate-200/80 bg-ui-surface p-5 shadow-ui-subtle",
        className,
      ),
    },
    <>
      <div className="flex items-start justify-between gap-4">
        {heading}
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3">
        {state === "loading" ? (
          <LoadingState compact label={loadingLabel} />
        ) : null}
        {state === "empty" ? (
          <EmptyState
            compact
            description={emptyMessage}
            headingLevel={Math.min(6, headingLevel + 1) as FoundationHeadingLevel}
            title="No insights"
          />
        ) : null}
        {state === "unavailable" ? (
          <EmptyState
            compact
            description={unavailableMessage}
            headingLevel={Math.min(6, headingLevel + 1) as FoundationHeadingLevel}
            title="Insights unavailable"
          />
        ) : null}
        {state === "error" ? <ErrorState message={errorMessage} /> : null}
        {state === "available" && expandable ? (
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
        {state === "available" && !expandable ? (
          <div className="text-sm leading-6 text-slate-700">{summary}</div>
        ) : null}
      </div>
    </>,
  );
}
